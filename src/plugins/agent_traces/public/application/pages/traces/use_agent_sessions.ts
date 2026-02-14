/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import moment from 'moment';
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

export interface SessionRow {
  id: string;
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  status: 'success' | 'error';
  kind: string;
  name: string;
  input: string;
  output: string;
  startTime: string;
  latency: string;
  totalTokens: number | string;
  totalCost: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  level?: number;
  children?: SessionRow[];
  rawDocument?: Record<string, unknown>;
}

export interface SessionLoadingState {
  loading: boolean;
  error: string | null;
}

export interface UseAgentSessionsResult {
  sessions: SessionRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  expandSession: (traceId: string) => Promise<void>;
  getSessionSpans: (traceId: string) => Promise<SessionRow[]>;
  sessionSpansCache: Map<string, SessionRow[]>;
  sessionLoadingState: Map<string, SessionLoadingState>;
}

// Format duration from nanoseconds to human readable
const formatDuration = (nanos: number): string => {
  if (!nanos || nanos <= 0) return '—';

  const ms = nanos / 1_000_000;
  if (ms < 1000) {
    const hasSubMsPrecision = nanos % 1_000_000 !== 0;
    return hasSubMsPrecision ? `${ms.toFixed(2)}ms` : `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  return `${seconds.toFixed(2)}s`;
};

// Format timestamp to readable date/time
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '—';
  const m = moment(timestamp);
  if (!m.isValid()) return '—';
  return m.format('MM/DD/YYYY, h:mm:ss A');
};

// Get a safe string from a potentially nested field
const getFieldValue = (hit: Record<string, unknown>, fieldPath: string): unknown => {
  const source = (hit._source as Record<string, unknown>) || hit;
  const parts = fieldPath.split('.');
  let value: unknown = source;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return null;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
};

const getStringField = (hit: Record<string, unknown>, path: string, fallback = ''): string =>
  (getFieldValue(hit, path) as string) || fallback;

const getNumberField = (
  hit: Record<string, unknown>,
  path: string,
  fallback: number | null = 0
): number | null => {
  const val = getFieldValue(hit, path);
  return typeof val === 'number' ? val : fallback;
};

interface SpanSearchHit extends Record<string, unknown> {
  _id?: string;
  _source?: Record<string, unknown>;
}

interface AgentSpan {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  kind: string;
  operationName: string;
  startTime: string;
  endTime: string;
  durationNanos: number;
  statusCode: number;
  statusMessage: string;
  serviceName: string;
  genAiSystem: string;
  genAiRequestModel: string;
  genAiInputTokens: number | null;
  genAiOutputTokens: number | null;
  genAiTotalTokens: number | null;
  input: string;
  output: string;
  rawDocument: Record<string, unknown>;
}

const hitToAgentSpan = (hit: SpanSearchHit, index: number): AgentSpan => ({
  spanId: getStringField(hit, 'spanId') || hit._id || `span-${index}`,
  traceId: getStringField(hit, 'traceId'),
  parentSpanId: getStringField(hit, 'parentSpanId') || null,
  name: getStringField(hit, 'name'),
  kind: getStringField(hit, 'kind'),
  operationName: getStringField(hit, 'attributes.gen_ai.operation.name'),
  startTime: getStringField(hit, 'startTime'),
  endTime: getStringField(hit, 'endTime'),
  durationNanos: getNumberField(hit, 'durationInNanos', 0) as number,
  statusCode: getNumberField(hit, 'status.code', 0) as number,
  statusMessage: getStringField(hit, 'status.message'),
  serviceName: getStringField(hit, 'serviceName'),
  genAiSystem: getStringField(hit, 'attributes.gen_ai.system'),
  genAiRequestModel: getStringField(hit, 'attributes.gen_ai.request.model'),
  genAiInputTokens: getNumberField(hit, 'attributes.gen_ai.usage.input_tokens', null),
  genAiOutputTokens: getNumberField(hit, 'attributes.gen_ai.usage.output_tokens', null),
  genAiTotalTokens: getNumberField(hit, 'attributes.gen_ai.usage.total_tokens', null),
  input:
    getStringField(hit, 'attributes.gen_ai.input.messages') ||
    getStringField(hit, 'attributes.gen_ai.prompt') ||
    getStringField(hit, 'attributes.input.value') ||
    '—',
  output:
    getStringField(hit, 'attributes.gen_ai.output.messages') ||
    getStringField(hit, 'attributes.gen_ai.completion') ||
    getStringField(hit, 'attributes.output.value') ||
    '—',
  rawDocument: (hit._source as Record<string, unknown>) || hit,
});

const traceHitToAgentSpan = (hit: TraceHit, index: number): AgentSpan => ({
  spanId: hit.spanId || `span-${index}`,
  traceId: hit.traceId || '',
  parentSpanId: hit.parentSpanId || null,
  name: hit.name || '',
  kind: hit.kind || '',
  operationName: hit.attributes?.gen_ai?.operation?.name || '',
  startTime: hit.startTime || '',
  endTime: hit.endTime || '',
  durationNanos: hit.durationInNanos || 0,
  statusCode: hit['status.code'] ?? 0,
  statusMessage: hit.status?.message || '',
  serviceName: hit.serviceName || '',
  genAiSystem: hit.attributes?.gen_ai?.system || '',
  genAiRequestModel: hit.attributes?.gen_ai?.request?.model || '',
  genAiInputTokens: hit.attributes?.gen_ai?.usage?.input_tokens || null,
  genAiOutputTokens: hit.attributes?.gen_ai?.usage?.output_tokens || null,
  genAiTotalTokens: hit.attributes?.gen_ai?.usage?.total_tokens || null,
  input:
    hit.attributes?.gen_ai?.input?.messages ||
    hit.attributes?.gen_ai?.prompt ||
    hit.attributes?.input?.value ||
    '—',
  output:
    hit.attributes?.gen_ai?.output?.messages ||
    hit.attributes?.gen_ai?.completion ||
    hit.attributes?.output?.value ||
    '—',
  rawDocument: hit as Record<string, unknown>,
});

const spanToSessionRow = (span: AgentSpan, index: number): SessionRow => ({
  id: span.spanId || `span-${index}`,
  spanId: span.spanId,
  traceId: span.traceId,
  parentSpanId: span.parentSpanId,
  status: span.statusCode === 0 || span.statusCode === 1 ? 'success' : 'error',
  kind: span.operationName || 'unknown',
  name: span.name || span.operationName || 'Unknown',
  input: span.input || '—',
  output: span.output || '—',
  startTime: formatTimestamp(span.startTime),
  latency: formatDuration(span.durationNanos),
  totalTokens:
    span.genAiTotalTokens ??
    (span.genAiInputTokens != null && span.genAiOutputTokens != null
      ? span.genAiInputTokens + span.genAiOutputTokens
      : '—'),
  totalCost: '—',
  level: 0,
  children: [],
  rawDocument: span.rawDocument,
});

const setLevels = (rows: SessionRow[], level: number) => {
  rows.forEach((row) => {
    row.level = level;
    if (row.children && row.children.length > 0) {
      setLevels(row.children, level + 1);
    }
  });
};

const buildSpanTree = (spans: AgentSpan[]): SessionRow[] => {
  const spanMap = new Map<string, SessionRow>();
  const rootSpans: SessionRow[] = [];

  spans.forEach((span, index) => {
    spanMap.set(span.spanId, spanToSessionRow(span, index));
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

  rootSpans.forEach((row) => {
    row.isExpandable = true;
  });

  rootSpans.sort((a, b) => {
    const timeA = new Date(a.startTime).getTime() || 0;
    const timeB = new Date(b.startTime).getTime() || 0;
    return timeB - timeA;
  });

  return rootSpans;
};

const buildFullSpanTree = (spans: AgentSpan[]): SessionRow[] => {
  const spanMap = new Map<string, SessionRow>();
  const rootSpans: SessionRow[] = [];

  spans.forEach((span, index) => {
    spanMap.set(span.spanId, spanToSessionRow(span, index));
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

  const sortChildren = (rows: SessionRow[]) => {
    rows.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime() || 0;
      const timeB = new Date(b.startTime).getTime() || 0;
      return timeA - timeB;
    });
    rows.forEach((row) => {
      if (row.children && row.children.length > 0) {
        sortChildren(row.children);
      }
    });
  };
  sortChildren(rootSpans);

  return rootSpans;
};

export const useAgentSessions = (): UseAgentSessionsResult => {
  const { services } = useOpenSearchDashboards<AgentTracesServices>();
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, AnyAction>>();
  const { dataset } = useDatasetContext();

  const { results: rawResults, status } = useTabResults();

  const [sessionSpansCache, setSessionSpansCache] = useState<Map<string, SessionRow[]>>(new Map());
  const [sessionLoadingState, setSessionLoadingState] = useState<Map<string, SessionLoadingState>>(
    new Map()
  );

  const inFlightRef = useRef<Set<string>>(new Set());

  const pplService = useMemo(
    () => (services.data ? new TracePPLService(services.data) : undefined),
    [services.data]
  );

  const sessions = useMemo(() => {
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
    setSessionSpansCache(new Map());
    setSessionLoadingState(new Map());
    inFlightRef.current.clear();
    dispatch(executeQueries({ services }));
  }, [dispatch, services]);

  const expandSession = useCallback(
    async (traceId: string) => {
      if (sessionSpansCache.has(traceId)) return;
      if (inFlightRef.current.has(traceId)) return;
      if (!pplService || !dataset) return;

      inFlightRef.current.add(traceId);
      setSessionLoadingState((prev) => {
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

        setSessionSpansCache((prev) => {
          const next = new Map(prev);
          next.set(traceId, fullTree);
          return next;
        });
        setSessionLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, { loading: false, error: null });
          return next;
        });
      } catch (err) {
        setSessionLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, {
            loading: false,
            error: (err as Error).message || 'Failed to fetch session spans',
          });
          return next;
        });
      } finally {
        inFlightRef.current.delete(traceId);
      }
    },
    [pplService, dataset, sessionSpansCache]
  );

  const getSessionSpans = useCallback(
    async (traceId: string): Promise<SessionRow[]> => {
      if (sessionSpansCache.has(traceId)) {
        return sessionSpansCache.get(traceId)!;
      }
      await expandSession(traceId);
      return sessionSpansCache.get(traceId) || [];
    },
    [sessionSpansCache, expandSession]
  );

  return {
    sessions,
    loading,
    error,
    refresh,
    expandSession,
    getSessionSpans,
    sessionSpansCache,
    sessionLoadingState,
  };
};
