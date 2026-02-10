/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../types';
import { executeQueries } from '../../application/utils/state_management/actions/query_actions';
import { useTabResults } from '../../application/utils/hooks/use_tab_results';
import { QueryExecutionStatus } from '../../application/utils/state_management/types';

export interface AgentSpan {
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
  // Gen AI specific fields
  genAiSystem: string;
  genAiRequestModel: string;
  genAiInputTokens: number | null;
  genAiOutputTokens: number | null;
  genAiTotalTokens: number | null;
  // Raw input/output from events or attributes
  input: string;
  output: string;
}

export interface TraceRow {
  id: string;
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  status: 'success' | 'error';
  kind: 'AGENT' | 'CHAIN' | 'LLM' | 'RETRIEVE' | 'TOOL' | 'EMBEDDING' | 'UNKNOWN';
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
  children?: TraceRow[];
}

interface UseAgentTracesResult {
  traces: TraceRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Map gen_ai operation names to UI-friendly kind values
const mapOperationToKind = (operationName: string, name: string): TraceRow['kind'] => {
  const opLower = (operationName || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();

  if (opLower.includes('agent') || nameLower.includes('agent')) return 'AGENT';
  if (opLower.includes('chain') || nameLower.includes('chain')) return 'CHAIN';
  if (opLower.includes('llm') || opLower.includes('chat') || opLower.includes('completion'))
    return 'LLM';
  if (opLower.includes('retriev') || opLower.includes('vector') || opLower.includes('search'))
    return 'RETRIEVE';
  if (opLower.includes('tool') || opLower.includes('function')) return 'TOOL';
  if (opLower.includes('embed')) return 'EMBEDDING';

  return 'UNKNOWN';
};

// Format duration from nanoseconds to human readable
const formatDuration = (nanos: number): string => {
  if (!nanos || nanos <= 0) return '—';

  const ms = nanos / 1_000_000;
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  const seconds = ms / 1000;
  return `${seconds.toFixed(2)}s`;
};

// Format timestamp to readable time
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '—';

  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

// Get a safe string from a potentially nested field
const getFieldValue = (hit: any, fieldPath: string): any => {
  const source = hit._source || hit;
  const parts = fieldPath.split('.');
  let value = source;

  for (const part of parts) {
    if (value == null) return null;
    value = value[part];
  }

  return value;
};

// Map a single hit (from Redux results) to an AgentSpan
const hitToAgentSpan = (hit: any, index: number): AgentSpan => ({
  spanId: getFieldValue(hit, 'spanId') || hit._id || `span-${index}`,
  traceId: getFieldValue(hit, 'traceId') || '',
  parentSpanId: getFieldValue(hit, 'parentSpanId') || null,
  name: getFieldValue(hit, 'name') || '',
  kind: getFieldValue(hit, 'kind') || '',
  operationName: getFieldValue(hit, 'attributes.gen_ai.operation.name') || '',
  startTime: getFieldValue(hit, 'startTime') || '',
  endTime: getFieldValue(hit, 'endTime') || '',
  durationNanos: getFieldValue(hit, 'durationInNanos') || 0,
  statusCode: getFieldValue(hit, 'status.code') ?? 0,
  statusMessage: getFieldValue(hit, 'status.message') || '',
  serviceName: getFieldValue(hit, 'serviceName') || '',
  genAiSystem: getFieldValue(hit, 'attributes.gen_ai.system') || '',
  genAiRequestModel: getFieldValue(hit, 'attributes.gen_ai.request.model') || '',
  genAiInputTokens: getFieldValue(hit, 'attributes.gen_ai.usage.input_tokens') || null,
  genAiOutputTokens: getFieldValue(hit, 'attributes.gen_ai.usage.output_tokens') || null,
  genAiTotalTokens: getFieldValue(hit, 'attributes.gen_ai.usage.total_tokens') || null,
  input:
    getFieldValue(hit, 'attributes.gen_ai.input.messages') ||
    getFieldValue(hit, 'attributes.gen_ai.prompt') ||
    getFieldValue(hit, 'attributes.input.value') ||
    '—',
  output:
    getFieldValue(hit, 'attributes.gen_ai.output.messages') ||
    getFieldValue(hit, 'attributes.gen_ai.completion') ||
    getFieldValue(hit, 'attributes.output.value') ||
    '—',
});

// Build hierarchical tree from flat spans
const buildSpanTree = (spans: AgentSpan[]): TraceRow[] => {
  // Create a map of spanId -> TraceRow
  const spanMap = new Map<string, TraceRow>();
  const rootSpans: TraceRow[] = [];

  // First pass: create all TraceRow objects
  spans.forEach((span, index) => {
    const row: TraceRow = {
      id: span.spanId || `span-${index}`,
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId,
      status: span.statusCode === 0 || span.statusCode === 1 ? 'success' : 'error',
      kind: mapOperationToKind(span.operationName, span.name),
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
      totalCost: '—', // Cost calculation would require pricing data
      level: 0,
      children: [],
    };

    spanMap.set(span.spanId, row);
  });

  // Second pass: build tree structure
  spanMap.forEach((row) => {
    if (row.parentSpanId && spanMap.has(row.parentSpanId)) {
      const parent = spanMap.get(row.parentSpanId)!;
      parent.children = parent.children || [];
      parent.children.push(row);
      parent.isExpandable = true;
    } else {
      // Root span (no parent or parent not in current dataset)
      rootSpans.push(row);
    }
  });

  // Third pass: set levels recursively
  const setLevels = (rows: TraceRow[], level: number) => {
    rows.forEach((row) => {
      row.level = level;
      if (row.children && row.children.length > 0) {
        setLevels(row.children, level + 1);
      }
    });
  };

  setLevels(rootSpans, 0);

  // Sort by start time
  rootSpans.sort((a, b) => {
    const timeA = new Date(a.startTime).getTime() || 0;
    const timeB = new Date(b.startTime).getTime() || 0;
    return timeB - timeA; // Most recent first
  });

  return rootSpans;
};

export const useAgentTraces = (): UseAgentTracesResult => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();

  // Read tab-specific query results from Redux (uses tab's prepareQuery for cache key)
  const { results: rawResults, status } = useTabResults();

  // Transform hits into TraceRow tree
  const traces = useMemo(() => {
    const hits = rawResults?.hits?.hits || [];
    if (hits.length === 0) return [];

    const agentSpans = hits.map((hit: any, index: number) => hitToAgentSpan(hit, index));
    return buildSpanTree(agentSpans);
  }, [rawResults]);

  // Derive loading/error from query execution status
  const loading = status?.status === QueryExecutionStatus.LOADING;
  const error =
    status?.status === QueryExecutionStatus.ERROR
      ? status.error?.originalErrorMessage || status.error?.message?.details || 'Query failed'
      : null;

  // Refresh by re-dispatching the existing query execution
  const refresh = useCallback(() => {
    dispatch(executeQueries({ services }) as any);
  }, [dispatch, services]);

  return {
    traces,
    loading,
    error,
    refresh,
  };
};
