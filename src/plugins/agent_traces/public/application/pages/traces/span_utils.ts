/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';
import { TraceHit } from './trace_details/traces/ppl_to_trace_hits';

/**
 * Shared types and utility functions for agent traces, sessions, and spans.
 * Consolidates logic that was previously duplicated across use_agent_traces,
 * use_agent_sessions, and use_agent_spans.
 */

// --- Interfaces ---

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
  genAiSystem: string;
  genAiRequestModel: string;
  genAiInputTokens: number | null;
  genAiOutputTokens: number | null;
  genAiTotalTokens: number | null;
  input: string;
  output: string;
  rawDocument: Record<string, unknown>;
}

/** Unified row type for traces, sessions, and spans tables. */
export interface SpanRow {
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
  children?: SpanRow[];
  rawDocument?: Record<string, unknown>;
}

export interface SpanLoadingState {
  loading: boolean;
  error: string | null;
}

export interface SpanSearchHit extends Record<string, unknown> {
  _id?: string;
  _source?: Record<string, unknown>;
}

// --- Formatting helpers ---

/** Format duration from nanoseconds to human readable */
export const formatDuration = (nanos: number): string => {
  if (!nanos || nanos <= 0) return '—';

  const ms = nanos / 1_000_000;
  if (ms < 1000) {
    const hasSubMsPrecision = nanos % 1_000_000 !== 0;
    return hasSubMsPrecision ? `${ms.toFixed(2)}ms` : `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  return `${seconds.toFixed(2)}s`;
};

/** Format timestamp to readable date/time */
export const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '—';
  const m = moment(timestamp);
  if (!m.isValid()) return '—';
  return m.format('MM/DD/YYYY, h:mm:ss A');
};

// --- Field accessors ---

/** Get a safe value from a potentially nested field */
export const getFieldValue = (hit: Record<string, unknown>, fieldPath: string): unknown => {
  const source = (hit._source as Record<string, unknown>) || hit;
  const parts = fieldPath.split('.');
  let value: unknown = source;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return null;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
};

export const getStringField = (hit: Record<string, unknown>, path: string, fallback = ''): string =>
  (getFieldValue(hit, path) as string) || fallback;

export const getNumberField = (
  hit: Record<string, unknown>,
  path: string,
  fallback: number | null = 0
): number | null => {
  const val = getFieldValue(hit, path);
  return typeof val === 'number' ? val : fallback;
};

// --- Converters ---

/** Map a single search hit (from Redux results) to an AgentSpan */
export const hitToAgentSpan = (hit: SpanSearchHit, index: number): AgentSpan => ({
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

/** Convert a TraceHit (from PPL response) to an AgentSpan */
export const traceHitToAgentSpan = (hit: TraceHit, index: number): AgentSpan => ({
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

/** Convert an AgentSpan to a SpanRow */
export const spanToRow = (span: AgentSpan, index: number): SpanRow => ({
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

// --- Tree building ---

/** Set nesting levels recursively */
export const setLevels = (rows: SpanRow[], level: number) => {
  rows.forEach((row) => {
    row.level = level;
    if (row.children && row.children.length > 0) {
      setLevels(row.children, level + 1);
    }
  });
};

/** Build hierarchical tree from flat spans (for initial table view) */
export const buildSpanTree = (spans: AgentSpan[]): SpanRow[] => {
  const spanMap = new Map<string, SpanRow>();
  const rootSpans: SpanRow[] = [];

  spans.forEach((span, index) => {
    spanMap.set(span.spanId, spanToRow(span, index));
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

/** Build full hierarchical tree from ALL spans for a traceId (for expand/flyout) */
export const buildFullSpanTree = (spans: AgentSpan[]): SpanRow[] => {
  const spanMap = new Map<string, SpanRow>();
  const rootSpans: SpanRow[] = [];

  spans.forEach((span, index) => {
    spanMap.set(span.spanId, spanToRow(span, index));
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

  const sortChildren = (rows: SpanRow[]) => {
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

/** Find the children of a specific span within a full tree */
export const getChildrenFromFullTree = (
  fullTree: SpanRow[],
  spanId: string
): SpanRow[] | undefined => {
  const findNode = (rows: SpanRow[]): SpanRow | undefined => {
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
