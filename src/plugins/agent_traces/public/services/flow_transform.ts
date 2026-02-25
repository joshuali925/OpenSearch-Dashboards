/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentNodeData, AgentNodeKind } from '@osd/apm-topology';
import type { CelestialEdgeStyleData } from '@osd/apm-topology';
import { CategorizedSpan, SpanCategory } from './span_categorization';

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: AgentNodeData;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data?: { style?: CelestialEdgeStyleData };
}

export interface FlowTransformResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const CATEGORY_TO_NODE_KIND: Record<SpanCategory, AgentNodeKind> = {
  AGENT: 'agent',
  LLM: 'llm',
  TOOL: 'tool',
  OTHER: 'other',
};

/**
 * Parse a latency string like "100ms", "1.5s", or "2m" to milliseconds.
 */
function parseDurationMs(latency?: string): number {
  if (!latency) return 0;
  const match = latency.match(/^([\d.]+)\s*(ms|s|m|min|h)$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  switch (match[2].toLowerCase()) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
    case 'min':
      return value * 60000;
    case 'h':
      return value * 3600000;
    default:
      return value;
  }
}

/**
 * Convert a categorized span tree to CelestialMap-compatible nodes and edges.
 * Positions are set to {0,0} because CelestialMap applies its own dagre layout.
 */
export function spansToFlow(spanTree: CategorizedSpan[]): FlowTransformResult {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const processSpan = (span: CategorizedSpan, parentId?: string) => {
    const nodeId = span.spanId || span.id;
    const nodeKind = CATEGORY_TO_NODE_KIND[span.category] ?? 'other';
    const durationMs = parseDurationMs(span.latency);

    nodes.push({
      id: nodeId,
      type: 'agentCard',
      position: { x: 0, y: 0 },
      data: {
        id: nodeId,
        title: span.displayName || span.name || 'Unknown',
        nodeKind,
        duration: durationMs > 0 ? durationMs : undefined,
        latency: span.latency || undefined,
        status: span.status === 'error' ? 'error' : undefined,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'celestialEdge',
        data: {
          style: {
            type: 'solid',
            marker: 'arrowClosed',
          },
        },
      });
    }

    if (span.children && span.children.length > 0) {
      (span.children as CategorizedSpan[]).forEach((child) => {
        processSpan(child, nodeId);
      });
    }
  };

  spanTree.forEach((span) => processSpan(span));

  return { nodes, edges };
}
