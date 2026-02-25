/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { RootState } from '../../../utils/state_management/store';
import { transformPPLDataToTraceHits } from '../trace_details/traces/ppl_to_trace_hits';
import { useIsTabActive } from '../../../../components/tabs/tabs';
import { usePPLQueryDeps, useTimeVersion } from './use_ppl_query_deps';
import { BaseRow, spanToRow, buildFullSpanTree, hitsToAgentSpans } from './tree_utils';

export interface SpanRow extends BaseRow {
  children?: SpanRow[];
}

export interface SpanLoadingState {
  loading: boolean;
  error: string | null;
}

export interface UseAgentSpansResult {
  spans: SpanRow[];
  loading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  fetchMore: () => void;
  expandSpan: (traceId: string) => Promise<void>;
  spanSpansCache: Map<string, SpanRow[]>;
  spanLoadingState: Map<string, SpanLoadingState>;
}

const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '—';
  const m = moment(timestamp);
  if (!m.isValid()) return '—';
  return m.format('MM/DD/YYYY, h:mm:ss.SSS A');
};

const DEFAULT_PAGE_SIZE = 50;

export const useAgentSpans = (): UseAgentSpansResult => {
  const { services, pplService, datasetParam, baseQueryString } = usePPLQueryDeps();
  const fetchVersion = useSelector((state: RootState) => state.queryEditor.fetchVersion);
  const isTabActive = useIsTabActive();
  const timeVersion = useTimeVersion(services);

  // Ref-based tab visibility check: avoids re-fetching on simple tab switches
  // while still deferring fetch if query params change while hidden.
  const isTabActiveRef = useRef(isTabActive);
  const skippedFetchRef = useRef(false);

  // Infinite-scroll state
  const [pageIndex, setPageIndex] = useState(0);
  const [spans, setSpans] = useState<SpanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const fetchGenerationRef = useRef(0);

  // Reset when query parameters change
  const queryKey = `${baseQueryString}|${timeVersion}|${fetchVersion}|${refreshCounter}`;
  const prevQueryKeyRef = useRef(queryKey);
  useEffect(() => {
    if (queryKey !== prevQueryKeyRef.current) {
      prevQueryKeyRef.current = queryKey;
      fetchGenerationRef.current += 1;
      setPageIndex(0);
      setSpans([]);
      setHasMore(true);
      setError(null);
    }
  }, [queryKey]);

  const [spanSpansCache, setSpanSpansCache] = useState<Map<string, SpanRow[]>>(new Map());
  const [spanLoadingState, setSpanLoadingState] = useState<Map<string, SpanLoadingState>>(
    new Map()
  );
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isTabActiveRef.current = isTabActive;
    if (isTabActive && skippedFetchRef.current) {
      skippedFetchRef.current = false;
      setRefreshCounter((c) => c + 1);
    }
  }, [isTabActive]);

  // Fetch spans for the current pageIndex via PPL.
  // On page 0, replace spans. On page > 0, append to existing spans.
  useEffect(() => {
    if (!isTabActiveRef.current) {
      skippedFetchRef.current = true;
      return;
    }

    if (!pplService || !datasetParam || !baseQueryString) {
      setLoading(false);
      return;
    }

    skippedFetchRef.current = false;
    const generation = fetchGenerationRef.current;
    let cancelled = false;

    const fetchSpans = async () => {
      if (pageIndex === 0) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      setError(null);

      try {
        const offset = pageIndex * DEFAULT_PAGE_SIZE;
        const pplQuery = `${baseQueryString} | where isnotnull(\`attributes.gen_ai.operation.name\`) | sort - startTime | head ${DEFAULT_PAGE_SIZE} from ${offset}`;
        const response = await pplService.executeQuery(datasetParam, pplQuery);

        if (cancelled || generation !== fetchGenerationRef.current) return;

        const agentSpans = hitsToAgentSpans(transformPPLDataToTraceHits(response));
        const rows = agentSpans.map(
          (span, index) => spanToRow(span, index, formatTimestamp) as SpanRow
        );

        if (rows.length < DEFAULT_PAGE_SIZE) {
          setHasMore(false);
        }

        if (pageIndex === 0) {
          setSpans(rows);
        } else {
          setSpans((prev) => [...prev, ...rows]);
        }
      } catch (err) {
        if (cancelled || generation !== fetchGenerationRef.current) return;
        // eslint-disable-next-line no-console
        console.error('Failed to fetch spans:', err);
        setError((err as Error).message || 'Failed to fetch spans');
      } finally {
        if (!cancelled && generation === fetchGenerationRef.current) {
          setLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    fetchSpans();
    return () => {
      cancelled = true;
    };
  }, [
    pplService,
    datasetParam,
    baseQueryString,
    pageIndex,
    refreshCounter,
    timeVersion,
    fetchVersion,
  ]);

  // Fetch the next page of results
  const fetchMore = useCallback(() => {
    if (hasMore && !loading && !isFetchingMore) {
      setPageIndex((prev) => prev + 1);
    }
  }, [hasMore, loading, isFetchingMore]);

  // Refresh by resetting to page 0 and clearing caches
  const refresh = useCallback(() => {
    setSpanSpansCache(new Map());
    setSpanLoadingState(new Map());
    inFlightRef.current.clear();
    fetchGenerationRef.current += 1;
    setPageIndex(0);
    setSpans([]);
    setHasMore(true);
    setRefreshCounter((c) => c + 1);
  }, []);

  const expandSpan = useCallback(
    async (traceId: string) => {
      if (spanSpansCache.has(traceId)) return;
      if (inFlightRef.current.has(traceId)) return;
      if (!pplService || !datasetParam) return;

      inFlightRef.current.add(traceId);
      setSpanLoadingState((prev) => {
        const next = new Map(prev);
        next.set(traceId, { loading: true, error: null });
        return next;
      });

      try {
        const response = await pplService.fetchTraceSpans({
          traceId,
          dataset: datasetParam,
          limit: 1000,
        });

        const agentSpans = hitsToAgentSpans(transformPPLDataToTraceHits(response));
        const fullTree = buildFullSpanTree<SpanRow>(agentSpans, formatTimestamp);

        setSpanSpansCache((prev) => {
          const next = new Map(prev);
          next.set(traceId, fullTree);
          return next;
        });
        setSpanLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, { loading: false, error: null });
          return next;
        });
      } catch (err) {
        setSpanLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, {
            loading: false,
            error: (err as Error).message || 'Failed to fetch span spans',
          });
          return next;
        });
      } finally {
        inFlightRef.current.delete(traceId);
      }
    },
    [pplService, datasetParam, spanSpansCache]
  );

  return {
    spans,
    loading,
    isFetchingMore,
    hasMore,
    error,
    refresh,
    fetchMore,
    expandSpan,
    spanSpansCache,
    spanLoadingState,
  };
};
