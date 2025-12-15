/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharedGlobalConfig, Logger } from 'opensearch-dashboards/server';
import { Observable } from 'rxjs';
import dateMath from '@elastic/datemath';
import { ISearchStrategy, SearchUsage } from '../../../data/server';
import {
  DATA_FRAME_TYPES,
  IDataFrame,
  IDataFrameResponse,
  IOpenSearchDashboardsSearchRequest,
  Query,
} from '../../../data/common';
import {
  prometheusManager,
  PromQLQueryParams,
  PromQLQueryResponse,
} from '../connections/managers/prometheus_manager';

// This creates an upper bound for data points sent to the frontend (targetSamples * maxSeries)
const AUTO_STEP_TARGET_SAMPLES = 50;
const MAX_SERIES = 2000;
// We'll want to re-evaluate this when we provide an affordance for step configuration
const MAX_DATAPOINTS = AUTO_STEP_TARGET_SAMPLES * MAX_SERIES;

/**
 * Represents a parsed query segment from a multi-query string
 */
interface ParsedQuery {
  label: string;
  query: string;
}

/**
 * Generates a label for a query index (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, etc.)
 */
function getQueryLabel(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index); // A-Z
  }
  const firstChar = String.fromCharCode(65 + Math.floor((index - 26) / 26));
  const secondChar = String.fromCharCode(65 + ((index - 26) % 26));
  return firstChar + secondChar;
}

/**
 * Checks if a character at the given position is inside a string literal
 */
function isInsideString(text: string, position: number): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < position; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : '';

    if (prevChar === '\\') continue;

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }
  }

  return inSingleQuote || inDoubleQuote || inBacktick;
}

/**
 * Splits a multi-query string by semicolons (not inside strings)
 */
function splitPromQLQueries(queryString: string): ParsedQuery[] {
  if (!queryString || !queryString.trim()) {
    return [];
  }

  const queries: ParsedQuery[] = [];
  let currentStart = 0;
  let queryIndex = 0;

  for (let i = 0; i <= queryString.length; i++) {
    if (i === queryString.length || (queryString[i] === ';' && !isInsideString(queryString, i))) {
      const segment = queryString.substring(currentStart, i).trim();
      if (segment) {
        queries.push({
          label: getQueryLabel(queryIndex),
          query: segment,
        });
        queryIndex++;
      }
      currentStart = i + 1;
    }
  }

  return queries;
}

/**
 * Result from executing a single query in a multi-query context
 */
interface SingleQueryResult {
  label: string;
  response?: PromQLQueryResponse;
  error?: string;
}

export const promqlSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy<IOpenSearchDashboardsSearchRequest, IDataFrameResponse> => {
  return {
    search: async (context, request: any, options) => {
      try {
        const { body: requestBody } = request;
        const parsedFrom = dateMath.parse(requestBody.timeRange.from);
        const parsedTo = dateMath.parse(requestBody.timeRange.to, { roundUp: true });
        if (!parsedFrom || !parsedTo) {
          throw new Error('Invalid time range format');
        }
        const timeRange = {
          start: parsedFrom.unix(),
          end: parsedTo.unix(),
        };
        const duration = (timeRange.end - timeRange.start) * 1000;
        const step =
          requestBody.step ??
          Math.max(Math.ceil(duration / AUTO_STEP_TARGET_SAMPLES) / 1000, 0.001);
        const { dataset, query, language }: Query = requestBody.query;
        const datasetId = dataset?.id ?? '';

        // Split query into multiple queries if semicolons are present
        const parsedQueries = splitPromQLQueries(query as string);

        // If no queries or just one, use original behavior
        if (parsedQueries.length <= 1) {
          const singleQuery = parsedQueries.length === 1 ? parsedQueries[0].query : (query as string);
          const params: PromQLQueryParams = {
            body: {
              query: singleQuery,
              language: language as string,
              maxResults: MAX_DATAPOINTS,
              timeout: 30,
              options: {
                queryType: 'range',
                start: timeRange.start.toString(),
                end: timeRange.end.toString(),
                step: step.toString(),
              },
            },
            dataconnection: datasetId,
          };

          const queryRes = await prometheusManager.query(context, request, params);

          if (queryRes.status === 'failed') {
            throw new Error(queryRes.error || 'PromQL query failed');
          }

          const dataFrame = createDataFrame(queryRes.data, datasetId);

          return {
            type: DATA_FRAME_TYPES.DEFAULT,
            body: dataFrame,
          } as IDataFrameResponse;
        }

        // Multi-query execution
        const queryResults = await executeMultipleQueries(
          context,
          request,
          parsedQueries,
          {
            language: language as string,
            maxResults: Math.floor(MAX_DATAPOINTS / parsedQueries.length), // Divide limit among queries
            timeout: 30,
            timeRange,
            step: step.toString(),
          },
          datasetId,
          logger
        );

        const dataFrame = createMultiQueryDataFrame(queryResults, datasetId);

        return {
          type: DATA_FRAME_TYPES.DEFAULT,
          body: dataFrame,
        } as IDataFrameResponse;
      } catch (e: unknown) {
        const error = e as Error;
        logger.error(`promqlSearchStrategy: ${error.message}`);
        if (usage) usage.trackError();
        throw e;
      }
    },
  };
};

/**
 * Executes multiple PromQL queries in parallel
 */
async function executeMultipleQueries(
  context: any,
  request: any,
  queries: ParsedQuery[],
  options: {
    language: string;
    maxResults: number;
    timeout: number;
    timeRange: { start: number; end: number };
    step: string;
  },
  datasetId: string,
  logger: Logger
): Promise<SingleQueryResult[]> {
  const promises = queries.map(async (parsedQuery): Promise<SingleQueryResult> => {
    try {
      const params: PromQLQueryParams = {
        body: {
          query: parsedQuery.query,
          language: options.language,
          maxResults: options.maxResults,
          timeout: options.timeout,
          options: {
            queryType: 'range',
            start: options.timeRange.start.toString(),
            end: options.timeRange.end.toString(),
            step: options.step,
          },
        },
        dataconnection: datasetId,
      };

      const queryRes = await prometheusManager.query(context, request, params);

      if (queryRes.status === 'failed') {
        return {
          label: parsedQuery.label,
          error: queryRes.error || `Query ${parsedQuery.label} failed`,
        };
      }

      return {
        label: parsedQuery.label,
        response: queryRes.data,
      };
    } catch (e: unknown) {
      const error = e as Error;
      logger.error(`Query ${parsedQuery.label} failed: ${error.message}`);
      return {
        label: parsedQuery.label,
        error: error.message,
      };
    }
  });

  return Promise.all(promises);
}

/**
 * Formats metric labels into a string like {label1="value1", label2="value2"}
 * Only includes labels that have actual values (non-empty)
 */
function formatMetricLabels(metric: Record<string, string>): string {
  const labelParts = Object.entries(metric)
    .filter(([_, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${value}"`);

  return labelParts.length > 0 ? `{${labelParts.join(', ')}}` : '';
}

/**
 * Creates a combined DataFrame from multiple query results
 * Each query's values are in separate columns (Value #A, Value #B, etc.)
 * Labels only show values that exist for each metric (no empty labels in Metric column)
 * Individual label columns are preserved for Table view
 */
function createMultiQueryDataFrame(
  queryResults: SingleQueryResult[],
  datasetId: string
): IDataFrame {
  const allVizRows: Array<Record<string, unknown>> = [];
  const allLabelKeys = new Set<string>();

  // For instant data, we'll store per-query results with their own labels
  // Key: serialized metric signature, Value: { labels, values by query }
  const instantDataMap = new Map<
    string,
    {
      metric: Record<string, string>;
      metricName: string;
      time: number;
      valuesByQuery: Record<string, number>;
    }
  >();

  // Get list of query labels for column naming
  const queryLabels = queryResults.filter((r) => !r.error && r.response).map((r) => r.label);

  // First pass: collect all label keys from all queries
  queryResults.forEach((result) => {
    if (!result.response || result.error) return;

    const series = result.response.results[datasetId]?.result || [];

    series.forEach((metricResult, i) => {
      if (i >= MAX_SERIES) return;
      if (metricResult.metric) {
        Object.keys(metricResult.metric).forEach((key) => {
          if (key !== '__name__') {
            allLabelKeys.add(key);
          }
        });
      }
    });
  });

  const labelKeys = Array.from(allLabelKeys).sort();

  // Process each query result
  queryResults.forEach((result) => {
    if (!result.response || result.error) return;

    const series = result.response.results[datasetId]?.result || [];

    series.forEach((metricResult, seriesIndex) => {
      if (seriesIndex >= MAX_SERIES) return;

      // Get the metric name (usually __name__ label)
      const metricName = metricResult.metric.__name__ || '';
      // Labels without __name__
      const labelsWithoutName = { ...metricResult.metric };
      delete labelsWithoutName.__name__;

      metricResult.values.forEach(([timestamp, value]) => {
        // Create a unique key for this metric signature (metric name + labels)
        const metricSignature = JSON.stringify({
          name: metricName,
          labels: labelsWithoutName,
        });

        // Update or create instant data entry
        const existing = instantDataMap.get(metricSignature);
        const timeMs = timestamp * 1000;

        if (!existing || timeMs > existing.time) {
          instantDataMap.set(metricSignature, {
            metric: labelsWithoutName,
            metricName,
            time: timeMs,
            valuesByQuery: {
              ...(existing?.valuesByQuery || {}),
              [result.label]: Number(value),
            },
          });
        } else if (timeMs === existing.time) {
          existing.valuesByQuery[result.label] = Number(value);
        }

        // Visualization row - format labels without empty values
        const formattedLabels = formatMetricLabels(metricResult.metric);
        const seriesName = `${result.label}: ${formattedLabels}`;

        allVizRows.push({
          Time: timeMs,
          Series: seriesName,
          Value: Number(value),
        });
      });
    });
  });

  // Build instant rows from the map
  const allInstantRows: Array<Record<string, unknown>> = [];

  instantDataMap.forEach((data) => {
    const row: Record<string, unknown> = {
      Time: data.time,
      // Metric column: pre-formatted string with only non-empty labels (for Raw view)
      Metric: data.metricName + formatMetricLabels(data.metric),
    };

    // Individual label columns: only set if the label exists for this metric (for Table view)
    // Use undefined for missing labels so they show as empty in table, not as ""
    labelKeys.forEach((labelKey) => {
      const labelValue = data.metric[labelKey];
      row[labelKey] = labelValue !== undefined && labelValue !== '' ? labelValue : undefined;
    });

    // Add value columns for each query
    queryLabels.forEach((label) => {
      const columnName = `Value #${label}`;
      row[columnName] = data.valuesByQuery[label] ?? null;
    });

    allInstantRows.push(row);
  });

  // Build schema for instant data
  // Include both Metric (for Raw) and individual labels (for Table)
  const instantSchema = [
    { name: 'Time', type: 'time', values: [] },
    { name: 'Metric', type: 'string', values: [] },
    ...labelKeys.map((key) => ({ name: key, type: 'string', values: [] })),
    ...queryLabels.map((label) => ({
      name: `Value #${label}`,
      type: 'number',
      values: [],
    })),
  ];

  const vizSchema = [
    { name: 'Time', type: 'time', values: [] },
    { name: 'Series', type: 'string', values: [] },
    { name: 'Value', type: 'number', values: [] },
  ];

  const vizFields = vizSchema.map((s) => ({
    name: s.name,
    type: s.type as 'time' | 'string' | 'number',
    values: allVizRows.map((row) => row[s.name]),
  }));

  // Collect errors from failed queries
  const errors = queryResults
    .filter((r) => r.error)
    .map((r) => ({ query: r.label, error: r.error }));

  return {
    type: DATA_FRAME_TYPES.DEFAULT,
    name: datasetId,
    schema: vizSchema,
    fields: vizFields,
    size: allVizRows.length,
    meta: {
      instantData: {
        schema: instantSchema,
        rows: allInstantRows,
      },
      multiQuery: {
        queryCount: queryResults.length,
        successCount: queryResults.filter((r) => !r.error).length,
        errors,
        queryLabels,
      },
    },
  };
}

/**
 * Transforms Prometheus response to visualization format DataFrame (Time, Series, Value)
 * and stores raw instant format (Time, labels..., Value) in meta for the metrics table
 */
function createDataFrame(rawResponse: PromQLQueryResponse, datasetId: string): IDataFrame {
  const series = rawResponse.results[datasetId]?.result || [];

  const allLabelKeys = new Set<string>();
  series.forEach((metricResult, i) => {
    if (i >= MAX_SERIES) return;
    if (metricResult.metric) {
      Object.keys(metricResult.metric).forEach((key) => {
        allLabelKeys.add(key);
      });
    }
  });

  const labelKeys = Array.from(allLabelKeys).sort();

  // Create instant format rows (Time, label1, label2, ..., Value)
  // For instant queries, we only want the latest timestamp
  const rows: Array<Record<string, unknown>> = [];

  series.forEach((metricResult, seriesIndex) => {
    if (seriesIndex >= MAX_SERIES) return;

    metricResult.values.forEach(([timestamp, value]) => {
      const row: Record<string, unknown> = { Time: timestamp * 1000 };
      labelKeys.forEach((labelKey) => (row[labelKey] = metricResult.metric[labelKey] || ''));
      row.Value = Number(value);
      rows.push(row);
    });
  });

  // Filter to only the latest timestamp for data-grid
  const latestTimestamp = Math.max(...rows.map((row) => (row.Time as number) || 0));
  const instantRows = rows.filter((row) => row.Time === latestTimestamp);

  const instantSchema = [
    { name: 'Time', type: 'time', values: [] },
    ...labelKeys.map((key) => ({ name: key, type: 'string', values: [] })),
    { name: 'Value', type: 'number', values: [] },
  ];

  // Create visualization format rows (Time, Series, Value)
  const vizRows: Array<Record<string, unknown>> = [];

  series.forEach((metricResult, seriesIndex) => {
    if (seriesIndex >= MAX_SERIES) return;

    metricResult.values.forEach(([timestamp, value]) => {
      // Build series name from labels like: {cpu="0", mode="idle", instance="..."}
      const labelParts = labelKeys
        .map((labelKey) => {
          const labelValue = metricResult.metric[labelKey];
          return labelValue ? `${labelKey}="${labelValue}"` : null;
        })
        .filter(Boolean);

      const seriesName = labelParts.length > 0 ? `{${labelParts.join(', ')}}` : '';

      vizRows.push({
        Time: timestamp * 1000,
        Series: seriesName,
        Value: Number(value),
      });
    });
  });

  const vizSchema = [
    { name: 'Time', type: 'time', values: [] },
    { name: 'Series', type: 'string', values: [] },
    { name: 'Value', type: 'number', values: [] },
  ];

  const vizFields = vizSchema.map((s) => ({
    name: s.name,
    type: s.type as 'time' | 'string' | 'number',
    values: vizRows.map((row) => row[s.name]),
  }));

  return {
    type: DATA_FRAME_TYPES.DEFAULT,
    name: datasetId,
    schema: vizSchema,
    fields: vizFields,
    size: vizRows.length,
    meta: {
      instantData: {
        schema: instantSchema,
        rows: instantRows,
      },
    },
  };
}
