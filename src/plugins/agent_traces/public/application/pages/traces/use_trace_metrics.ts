/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgentTracesServices } from '../../../types';
import { useDatasetContext } from '../../context/dataset_context/dataset_context';
import { PPLService } from './trace_details/data_fetching/ppl_request_helpers';
import { defaultPrepareQueryString } from '../../utils/state_management/actions/query_actions';
import { RootState } from '../../utils/state_management/store';

export interface TraceMetrics {
  totalTraces: number;
  totalSpans: number;
  totalTokens: number;
  latencyP50Seconds: number;
  latencyP99Seconds: number;
}

export interface UseTraceMetricsResult {
  metrics: TraceMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Parse a PPL stats response (JDBC datarows or data_frame fields format)
const parseStatsResponse = (response: any): Record<string, any> => {
  // JDBC datarows format: { schema: [{name, type}], datarows: [[values]] }
  if (response?.datarows && response?.schema) {
    const schema = response.schema as Array<{ name: string }>;
    const row = response.datarows[0];
    if (!row) return {};
    const result: Record<string, any> = {};
    schema.forEach((col, idx) => {
      result[col.name] = row[idx];
    });
    return result;
  }

  // data_frame fields format: { body: { fields: [{name, values}], size } }
  const responseData = response?.type === 'data_frame' && response?.body ? response.body : response;
  if (responseData?.fields && responseData?.size > 0) {
    const result: Record<string, any> = {};
    responseData.fields.forEach((field: { name: string; values: any[] }) => {
      result[field.name] = field.values?.[0];
    });
    return result;
  }

  return {};
};

export const useTraceMetrics = (tracesLoaded: boolean): UseTraceMetricsResult => {
  const { services } = useOpenSearchDashboards<AgentTracesServices>();
  const { dataset } = useDatasetContext();
  const query = useSelector((state: RootState) => state.query);

  const [metrics, setMetrics] = useState<TraceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Track if fetch is in flight to avoid duplicates
  const inFlightRef = useRef(false);

  const pplService = useMemo(() => (services.data ? new PPLService(services.data) : undefined), [
    services.data,
  ]);

  const datasetParam = useMemo(() => {
    if (!dataset) return null;
    return {
      id: dataset.id || '',
      title: dataset.title,
      type: dataset.type || 'INDEX_PATTERN',
      timeFieldName: dataset.timeFieldName,
      ...(dataset.dataSourceRef && {
        dataSource: {
          id: dataset.dataSourceRef.id,
          title: dataset.dataSourceRef.name || dataset.dataSourceRef.id,
          type: dataset.dataSourceRef.type || 'OpenSearch',
          version: '',
        },
      }),
    };
  }, [dataset]);

  // Build the base query string from current query state (includes user query + source clause)
  const baseQueryString = useMemo(() => {
    try {
      return defaultPrepareQueryString(query);
    } catch {
      return null;
    }
  }, [query]);

  const fetchMetrics = useCallback(async () => {
    if (!pplService || !datasetParam || !tracesLoaded || !baseQueryString) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const rootFilter = `where parentSpanId = "" AND isnotnull(\`attributes.gen_ai.operation.name\`)`;
      const rootQueryBase = `${baseQueryString} | ${rootFilter}`;

      // Query 1: Combined trace stats + token stats on root gen_ai traces
      // Falls back to trace stats only if token fields don't exist in the index mapping
      let traceStats: Record<string, any> = {};
      try {
        const combinedQuery = `${rootQueryBase} | stats count() as total_traces, percentile(durationInNanos, 50) as p50_latency, percentile(durationInNanos, 99) as p99_latency, sum(\`attributes.gen_ai.usage.input_tokens\`) as input_tokens, sum(\`attributes.gen_ai.usage.output_tokens\`) as output_tokens`;
        const combinedResponse = await pplService.executeQuery(datasetParam, combinedQuery);
        traceStats = parseStatsResponse(combinedResponse);
      } catch {
        // Token fields may not exist — retry without them
        const traceOnlyQuery = `${rootQueryBase} | stats count() as total_traces, percentile(durationInNanos, 50) as p50_latency, percentile(durationInNanos, 99) as p99_latency`;
        const traceOnlyResponse = await pplService.executeQuery(datasetParam, traceOnlyQuery);
        traceStats = parseStatsResponse(traceOnlyResponse);
      }

      // Query 2: Count ALL spans in the dataset
      const totalSpansQuery = `${baseQueryString} | stats count() as total_spans`;
      const totalSpansResponse = await pplService.executeQuery(datasetParam, totalSpansQuery);
      const spanStats = parseStatsResponse(totalSpansResponse);

      setMetrics({
        totalTraces: traceStats.total_traces ?? 0,
        totalSpans: spanStats.total_spans ?? 0,
        totalTokens: (traceStats.input_tokens ?? 0) + (traceStats.output_tokens ?? 0),
        latencyP50Seconds: (traceStats.p50_latency ?? 0) / 1_000_000_000,
        latencyP99Seconds: (traceStats.p99_latency ?? 0) / 1_000_000_000,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch trace metrics:', err);
      setError((err as Error).message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [pplService, datasetParam, baseQueryString, tracesLoaded]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, refreshCounter]);

  const refresh = useCallback(() => {
    setMetrics(null);
    setRefreshCounter((c) => c + 1);
  }, []);

  return { metrics, loading, error, refresh };
};
