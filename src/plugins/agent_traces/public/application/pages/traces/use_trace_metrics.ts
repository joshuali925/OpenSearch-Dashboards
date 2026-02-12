/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgentTracesServices } from '../../../types';
import { useDatasetContext } from '../../context/dataset_context/dataset_context';
import { PPLService } from './trace_details/server/ppl_request_helpers';

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

  const fetchMetrics = useCallback(async () => {
    if (!pplService || !datasetParam || !tracesLoaded) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Strip timeFieldName to prevent automatic time filtering (same pattern as TracePPLService)
      const datasetWithoutTime = {
        id: datasetParam.id,
        title: datasetParam.title,
        type: datasetParam.type,
        ...(datasetParam.dataSource && { dataSource: datasetParam.dataSource }),
      };

      const rootFilter = `where parentSpanId = "" AND isnotnull(\`attributes.gen_ai.operation.name\`)`;

      // Query 1: Count + latency percentiles on root gen_ai traces
      const traceStatsQuery = `source = ${datasetParam.title} | ${rootFilter} | stats count() as total_traces, percentile(durationInNanos, 50) as p50_latency, percentile(durationInNanos, 99) as p99_latency`;

      // Query 2: Count ALL spans in the dataset
      const totalSpansQuery = `source = ${datasetParam.title} | stats count() as total_spans`;

      const [traceStatsResponse, totalSpansResponse] = await Promise.all([
        pplService.executeQuery(datasetWithoutTime, traceStatsQuery),
        pplService.executeQuery(datasetWithoutTime, totalSpansQuery),
      ]);

      const traceStats = parseStatsResponse(traceStatsResponse);
      const spanStats = parseStatsResponse(totalSpansResponse);

      // Query 3: Token sum (input + output) — may fail if fields don't exist in the index mapping
      let totalTokens = 0;
      try {
        const tokenQuery = `source = ${datasetParam.title} | ${rootFilter} | stats sum(\`attributes.gen_ai.usage.input_tokens\`) as input_tokens, sum(\`attributes.gen_ai.usage.output_tokens\`) as output_tokens`;
        const tokenResponse = await pplService.executeQuery(datasetWithoutTime, tokenQuery);
        const tokenStats = parseStatsResponse(tokenResponse);
        totalTokens = (tokenStats.input_tokens ?? 0) + (tokenStats.output_tokens ?? 0);
      } catch {
        // Fields may not exist in the index — token stats will show 0
      }

      setMetrics({
        totalTraces: traceStats.total_traces ?? 0,
        totalSpans: spanStats.total_spans ?? 0,
        totalTokens,
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
  }, [pplService, datasetParam, tracesLoaded]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, refreshCounter]);

  const refresh = useCallback(() => {
    setMetrics(null);
    setRefreshCounter((c) => c + 1);
  }, []);

  return { metrics, loading, error, refresh };
};
