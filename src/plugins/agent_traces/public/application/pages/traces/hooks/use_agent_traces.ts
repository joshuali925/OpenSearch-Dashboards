/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import moment from 'moment-timezone';
import { useSelector } from 'react-redux';
import { RootState } from '../../../utils/state_management/store';
import { transformPPLDataToTraceHits } from '../trace_details/traces/ppl_to_trace_hits';
import { useIsTabActive } from '../../../../components/tabs/tabs';
import { AgentSpan } from './span_transforms';
import { usePPLQueryDeps, useTimeVersion } from './use_ppl_query_deps';
import { BaseRow, setLevels, spanToRow, buildFullSpanTree, hitsToAgentSpans } from './tree_utils';

export interface TraceRow extends BaseRow {
  displayName?: string;
  children?: TraceRow[];
}

export interface TraceLoadingState {
  loading: boolean;
  error: string | null;
}

export interface UseAgentTracesResult {
  traces: TraceRow[];
  loading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  fetchMore: () => void;
  expandTrace: (traceId: string) => Promise<void>;
  traceSpansCache: Map<string, TraceRow[]>;
  traceLoadingState: Map<string, TraceLoadingState>;
}

// Format timestamp to readable date/time respecting the configured timezone.
// PPL returns timestamps without timezone indicator (e.g. "2025-05-29 03:11:25.292"),
// so we parse as UTC first, then convert to the configured timezone.
const formatTimestamp = (timestamp: string, timezone: string): string => {
  if (!timestamp) return '—';
  const m = moment.utc(timestamp);
  if (!m.isValid()) return '—';
  return m.tz(timezone).format('MM/DD/YYYY, h:mm:ss.SSS A');
};

// Build hierarchical tree from flat spans (gen_ai spans only, for initial table view)
const buildSpanTree = (spans: AgentSpan[], timezone: string): TraceRow[] => {
  const fmt = (ts: string) => formatTimestamp(ts, timezone);
  const spanMap = new Map<string, TraceRow>();
  const rootSpans: TraceRow[] = [];

  spans.forEach((span, index) => {
    spanMap.set(span.spanId, spanToRow(span, index, fmt) as TraceRow);
  });

  spanMap.forEach((row) => {
    if (row.parentSpanId && spanMap.has(row.parentSpanId)) {
      const parent = spanMap.get(row.parentSpanId)!;
      parent.children = parent.children || [];
      parent.children.push(row);
      parent.isExpandable = true;
    } else {
      rootSpans.push(row);
    }
  });

  setLevels(rootSpans, 0);

  // All top-level gen_ai spans are expandable (children fetched on demand)
  rootSpans.forEach((row) => {
    row.isExpandable = true;
  });

  // Sort by start time (most recent first)
  rootSpans.sort((a, b) => {
    const timeA = new Date(a.startTime).getTime() || 0;
    const timeB = new Date(b.startTime).getTime() || 0;
    return timeB - timeA;
  });

  return rootSpans;
};

// Find the children of a specific span within a full tree
export const getChildrenFromFullTree = (
  fullTree: TraceRow[],
  spanId: string
): TraceRow[] | undefined => {
  const findNode = (rows: TraceRow[]): TraceRow | undefined => {
    for (const row of rows) {
      if (row.spanId === spanId) return row;
      if (row.children) {
        const found = findNode(row.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  const node = findNode(fullTree);
  return node?.children;
};

const DEFAULT_PAGE_SIZE = 50;

export const useAgentTraces = (): UseAgentTracesResult => {
  const { services, pplService, datasetParam, baseQueryString } = usePPLQueryDeps();
  const fetchVersion = useSelector((state: RootState) => state.queryEditor.fetchVersion);
  const isTabActive = useIsTabActive();
  const timeVersion = useTimeVersion(services);

  // Resolve timezone from application settings (dateFormat:tz)
  const timezone = useMemo(() => {
    const tz = services.uiSettings?.get('dateFormat:tz');
    if (tz && tz !== 'Browser') return tz;
    return moment.tz.guess() || moment().format('Z');
  }, [services.uiSettings]);

  // Ref-based tab visibility check: avoids re-fetching on simple tab switches
  // while still deferring fetch if query params change while hidden.
  const isTabActiveRef = useRef(isTabActive);
  const skippedFetchRef = useRef(false);

  // Infinite-scroll state
  const [pageIndex, setPageIndex] = useState(0);
  const [traces, setTraces] = useState<TraceRow[]>([]);
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
      setTraces([]);
      setHasMore(true);
      setError(null);
    }
  }, [queryKey]);

  // Cache of fully-loaded trace span trees (keyed by traceId)
  const [traceSpansCache, setTraceSpansCache] = useState<Map<string, TraceRow[]>>(new Map());
  const [traceLoadingState, setTraceLoadingState] = useState<Map<string, TraceLoadingState>>(
    new Map()
  );
  const inFlightRef = useRef<Set<string>>(new Set());

  // Keep ref in sync and trigger deferred fetch if params changed while hidden
  useEffect(() => {
    isTabActiveRef.current = isTabActive;
    if (isTabActive && skippedFetchRef.current) {
      skippedFetchRef.current = false;
      setRefreshCounter((c) => c + 1);
    }
  }, [isTabActive]);

  // Fetch traces for the current pageIndex via PPL.
  // On page 0, replace traces. On page > 0, append to existing traces.
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

    const fetchTraces = async () => {
      if (pageIndex === 0) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      setError(null);

      try {
        const offset = pageIndex * DEFAULT_PAGE_SIZE;
        const pplQuery = `${baseQueryString} | where parentSpanId = "" AND isnotnull(\`attributes.gen_ai.operation.name\`) | sort - startTime | head ${DEFAULT_PAGE_SIZE} from ${offset}`;
        const response = await pplService.executeQuery(datasetParam, pplQuery);

        if (cancelled || generation !== fetchGenerationRef.current) return;

        const traceHits = transformPPLDataToTraceHits(response);
        const agentSpans = hitsToAgentSpans(traceHits);
        const rows = buildSpanTree(agentSpans, timezone);

        if (rows.length < DEFAULT_PAGE_SIZE) {
          setHasMore(false);
        }

        if (pageIndex === 0) {
          setTraces(rows);
        } else {
          setTraces((prev) => [...prev, ...rows]);
        }
      } catch (err) {
        if (cancelled || generation !== fetchGenerationRef.current) return;
        // eslint-disable-next-line no-console
        console.error('Failed to fetch traces:', err);
        setError((err as Error).message || 'Failed to fetch traces');
      } finally {
        if (!cancelled && generation === fetchGenerationRef.current) {
          setLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    fetchTraces();
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
    timezone,
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
    setTraceSpansCache(new Map());
    setTraceLoadingState(new Map());
    inFlightRef.current.clear();
    fetchGenerationRef.current += 1;
    setPageIndex(0);
    setTraces([]);
    setHasMore(true);
    setRefreshCounter((c) => c + 1);
  }, []);

  // Fetch all spans for a traceId and cache the result
  const expandTrace = useCallback(
    async (traceId: string) => {
      // Already cached
      if (traceSpansCache.has(traceId)) return;

      // Already in-flight
      if (inFlightRef.current.has(traceId)) return;

      if (!pplService || !datasetParam) return;

      inFlightRef.current.add(traceId);
      setTraceLoadingState((prev) => {
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

        const traceHits = transformPPLDataToTraceHits(response);
        const agentSpans = hitsToAgentSpans(traceHits);
        const fmt = (ts: string) => formatTimestamp(ts, timezone);
        const fullTree = buildFullSpanTree<TraceRow>(agentSpans, fmt);

        setTraceSpansCache((prev) => {
          const next = new Map(prev);
          next.set(traceId, fullTree);
          return next;
        });
        setTraceLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, { loading: false, error: null });
          return next;
        });
      } catch (err) {
        setTraceLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, {
            loading: false,
            error: (err as Error).message || 'Failed to fetch trace spans',
          });
          return next;
        });
      } finally {
        inFlightRef.current.delete(traceId);
      }
    },
    [pplService, datasetParam, traceSpansCache, timezone]
  );

  return {
    traces,
    loading,
    isFetchingMore,
    hasMore,
    error,
    refresh,
    fetchMore,
    expandTrace,
    traceSpansCache,
    traceLoadingState,
  };
};
