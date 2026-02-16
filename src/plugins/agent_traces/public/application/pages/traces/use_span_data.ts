/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgentTracesServices } from '../../../types';
import { executeQueries } from '../../utils/state_management/actions/query_actions';
import { RootState } from '../../utils/state_management/store';
import { useTabResults } from '../../utils/hooks/use_tab_results';
import { QueryExecutionStatus } from '../../utils/state_management/types';
import { useDatasetContext } from '../../context/dataset_context/dataset_context';
import { TracePPLService } from './trace_details/data_fetching/ppl_request_trace';
import { transformPPLDataToTraceHits, TraceHit } from './trace_details/traces/ppl_to_trace_hits';
import {
  SpanRow,
  SpanLoadingState,
  SpanSearchHit,
  hitToAgentSpan,
  traceHitToAgentSpan,
  buildSpanTree,
  buildFullSpanTree,
} from './span_utils';

export interface UseSpanDataResult {
  rows: SpanRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  expandRow: (traceId: string) => Promise<void>;
  getSpans: (traceId: string) => Promise<SpanRow[]>;
  spansCache: Map<string, SpanRow[]>;
  loadingState: Map<string, SpanLoadingState>;
}

/**
 * Generic hook for fetching and managing span data.
 * Replaces the previously duplicated useAgentTraces, useAgentSessions, and useAgentSpans hooks.
 */
export const useSpanData = (): UseSpanDataResult => {
  const { services } = useOpenSearchDashboards<AgentTracesServices>();
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, AnyAction>>();
  const { dataset } = useDatasetContext();

  const { results: rawResults, status } = useTabResults();

  const [spansCache, setSpansCache] = useState<Map<string, SpanRow[]>>(new Map());
  const [loadingState, setLoadingState] = useState<Map<string, SpanLoadingState>>(new Map());

  const inFlightRef = useRef<Set<string>>(new Set());

  const pplService = useMemo(
    () => (services.data ? new TracePPLService(services.data) : undefined),
    [services.data]
  );

  const rows = useMemo(() => {
    const hits = rawResults?.hits?.hits || [];
    if (hits.length === 0) return [];

    const agentSpans = hits.map((hit: SpanSearchHit, index: number) => hitToAgentSpan(hit, index));
    return buildSpanTree(agentSpans);
  }, [rawResults]);

  const loading = status?.status === QueryExecutionStatus.LOADING;
  const error =
    status?.status === QueryExecutionStatus.ERROR
      ? status.error?.originalErrorMessage || status.error?.message?.details || 'Query failed'
      : null;

  const refresh = useCallback(() => {
    setSpansCache(new Map());
    setLoadingState(new Map());
    inFlightRef.current.clear();
    dispatch(executeQueries({ services }));
  }, [dispatch, services]);

  const expandRow = useCallback(
    async (traceId: string) => {
      if (spansCache.has(traceId)) return;
      if (inFlightRef.current.has(traceId)) return;
      if (!pplService || !dataset) return;

      inFlightRef.current.add(traceId);
      setLoadingState((prev) => {
        const next = new Map(prev);
        next.set(traceId, { loading: true, error: null });
        return next;
      });

      try {
        const datasetParam = {
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

        const response = await pplService.fetchTraceSpans({
          traceId,
          dataset: datasetParam,
          limit: 1000,
        });

        const traceHits = transformPPLDataToTraceHits(response);
        const allSpans = traceHits.map((hit: TraceHit, i: number) => traceHitToAgentSpan(hit, i));
        const fullTree = buildFullSpanTree(allSpans);

        setSpansCache((prev) => {
          const next = new Map(prev);
          next.set(traceId, fullTree);
          return next;
        });
        setLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, { loading: false, error: null });
          return next;
        });
      } catch (err) {
        setLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, {
            loading: false,
            error: (err as Error).message || 'Failed to fetch spans',
          });
          return next;
        });
      } finally {
        inFlightRef.current.delete(traceId);
      }
    },
    [pplService, dataset, spansCache]
  );

  const getSpans = useCallback(
    async (traceId: string): Promise<SpanRow[]> => {
      if (spansCache.has(traceId)) {
        return spansCache.get(traceId)!;
      }
      await expandRow(traceId);
      return spansCache.get(traceId) || [];
    },
    [spansCache, expandRow]
  );

  return {
    rows,
    loading,
    error,
    refresh,
    expandRow,
    getSpans,
    spansCache,
    loadingState,
  };
};
