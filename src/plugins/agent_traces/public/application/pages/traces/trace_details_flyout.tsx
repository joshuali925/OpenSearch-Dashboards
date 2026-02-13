/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiTabbedContent,
  EuiCodeBlock,
  EuiPanel,
  EuiIcon,
  EuiBadge,
  EuiLoadingSpinner,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiAccordion,
} from '@elastic/eui';
import { TraceRow } from './use_agent_traces';
import { getKindColor } from './trace_utils';
import './trace_details_flyout.scss';

export interface TraceDetailsProps {
  trace: TraceRow;
  onClose: () => void;
  fullTree?: TraceRow[];
  isLoadingFullTree?: boolean;
}

interface TreeNode {
  label: string;
  id: string;
  children?: TreeNode[];
  kind?: string;
  tokens?: number | string;
  latency?: string;
  traceRow?: TraceRow;
}

// Build tree nodes from a TraceRow
const buildTreeFromTraceRow = (row: TraceRow): TreeNode => {
  const node: TreeNode = {
    label: row.name,
    id: row.id,
    kind: row.kind,
    tokens: row.totalTokens,
    latency: row.latency,
    traceRow: row,
    children: row.children?.map((child) => buildTreeFromTraceRow(child)),
  };

  return node;
};

// Flatten tree to get all nodes
const flattenTree = (nodes: TreeNode[], result: TreeNode[] = []): TreeNode[] => {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children) {
      flattenTree(node.children, result);
    }
  });
  return result;
};

// Count total spans in a tree
const countSpans = (nodes: TreeNode[]): number => {
  let count = 0;
  nodes.forEach((node) => {
    count += 1;
    if (node.children) {
      count += countSpans(node.children);
    }
  });
  return count;
};

// Sum all tokens in a tree
const sumTokens = (nodes: TreeNode[]): number => {
  let total = 0;
  nodes.forEach((node) => {
    if (typeof node.tokens === 'number') {
      total += node.tokens;
    }
    if (node.children) {
      total += sumTokens(node.children);
    }
  });
  return total;
};

export const TraceDetailsFlyout: React.FC<TraceDetailsProps> = ({
  trace,
  onClose,
  fullTree,
  isLoadingFullTree,
}) => {
  // Build tree from trace data — use fullTree (all spans) when available
  const traceTreeData = useMemo(() => {
    if (fullTree && fullTree.length > 0) {
      return fullTree.map((root) => buildTreeFromTraceRow(root));
    }
    return [buildTreeFromTraceRow(trace)];
  }, [trace, fullTree]);

  const flatNodes = useMemo(() => flattenTree(traceTreeData), [traceTreeData]);

  // Initialize with the trace that was clicked
  const initialIndex = flatNodes.findIndex((node) => node.id === trace.id);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  // Re-sync index when flatNodes changes (e.g. fullTree loads)
  useEffect(() => {
    const idx = flatNodes.findIndex((node) => node.id === trace.id);
    setSelectedNodeIndex(idx >= 0 ? idx : 0);
  }, [flatNodes, trace.id]);

  const selectedNode = flatNodes[selectedNodeIndex];
  const selectedTraceRow = selectedNode?.traceRow;

  // Compute header-level aggregates
  const totalSpans = useMemo(() => countSpans(traceTreeData), [traceTreeData]);
  const totalTokens = useMemo(() => {
    const sum = sumTokens(traceTreeData);
    return sum > 0 ? sum : trace.totalTokens;
  }, [traceTreeData, trace.totalTokens]);

  // Track which tree nodes are expanded (by node id)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Initialize all nodes with children as expanded on first load
  useEffect(() => {
    const allExpandable = new Set<string>();
    const collectExpandable = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          allExpandable.add(node.id);
          collectExpandable(node.children);
        }
      });
    };
    collectExpandable(traceTreeData);
    setExpandedNodes(allExpandable);
  }, [traceTreeData]);

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Parse input/output as JSON if possible, otherwise show as string
  const formatJsonOrString = (value: string | undefined): string => {
    if (!value || value === '—') return '(no data)';
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const selectNode = (nodeId: string) => {
    const index = flatNodes.findIndex((n) => n.id === nodeId);
    if (index >= 0) setSelectedNodeIndex(index);
  };

  // Create tree items with selection highlighting and expand/collapse
  const createTreeItems = (nodes: TreeNode[], depth = 0): React.ReactNode[] => {
    return nodes.map((node) => {
      const isSelected = node.id === selectedNode?.id;
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      const rowClassName = `agentTracesFlyout__treeRow${
        isSelected ? ' agentTracesFlyout__treeRow--selected' : ''
      }`;
      return (
        <div key={node.id} className="agentTracesFlyout__treeNode">
          <EuiFlexGroup
            className={rowClassName}
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
            onClick={() => selectNode(node.id)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') selectNode(node.id);
            }}
            role="button"
            tabIndex={0}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                className="agentTracesFlyout__treeRowLabel"
                alignItems="center"
                gutterSize="none"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  {hasChildren ? (
                    <EuiIcon
                      type={isExpanded ? 'arrowDown' : 'arrowRight'}
                      size="s"
                      color="subdued"
                      className="agentTracesFlyout__expandIcon"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        toggleExpanded(node.id);
                      }}
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          toggleExpanded(node.id);
                        }
                      }}
                    />
                  ) : (
                    <EuiIcon type="dot" size="s" color="subdued" />
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{node.label}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {node.latency && node.latency !== '—' && (
              <EuiFlexItem grow={false} className="agentTracesFlyout__treeRowLatency">
                <EuiText size="xs" color="subdued">
                  {node.latency}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {hasChildren && isExpanded && (
            <div className="agentTracesFlyout__treeChildren">
              {createTreeItems(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Render a two-column label/value grid (items alternate left/right columns)
  const renderFieldGrid = (
    items: Array<{ label: string; value: React.ReactNode }>
  ): React.ReactElement => {
    const leftItems = items.filter((_, i) => i % 2 === 0);
    const rightItems = items.filter((_, i) => i % 2 !== 0);
    const rowCount = Math.max(leftItems.length, rightItems.length);

    return (
      <>
        {Array.from({ length: rowCount }).map((_, i) => (
          <EuiFlexGroup key={i} gutterSize="l" responsive={false}>
            <EuiFlexItem>
              {leftItems[i] && (
                <div className="agentTracesFlyout__field">
                  <EuiText size="xs" color="subdued">
                    {leftItems[i].label}
                  </EuiText>
                  <EuiText size="s">{leftItems[i].value}</EuiText>
                </div>
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              {rightItems[i] && (
                <div className="agentTracesFlyout__field">
                  <EuiText size="xs" color="subdued">
                    {rightItems[i].label}
                  </EuiText>
                  <EuiText size="s">{rightItems[i].value}</EuiText>
                </div>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </>
    );
  };

  // Overview tab content
  const renderOverviewTab = () => {
    const row = selectedTraceRow;
    const overviewFields = [
      { label: 'SERVICE', value: row?.kind || '—' },
      { label: 'DURATION', value: row?.latency || '—' },
      { label: 'SPAN ID', value: row?.spanId || '—' },
      { label: 'MODEL', value: '—' },
      {
        label: 'PARENT SPAN',
        value: row?.parentSpanId ? (
          <span className="agentTracesFlyout__parentSpanLink">{row.parentSpanId}</span>
        ) : (
          '(root span)'
        ),
      },
      { label: 'TOOL USED', value: '—' },
      {
        label: 'STATUS',
        value: (
          <EuiHealth color={row?.status === 'success' ? 'success' : 'danger'}>
            {row?.status === 'success' ? 'OK' : 'ERROR'}
          </EuiHealth>
        ),
      },
      {
        label: 'TOKENS USED',
        value: row?.totalTokens && row.totalTokens !== '—' ? `${row.totalTokens} tokens` : '—',
      },
      { label: 'START TIME', value: row?.startTime || '—' },
      { label: 'COST', value: row?.totalCost || '—' },
    ];

    return (
      <div className="agentTracesFlyout__tabContent">
        {renderFieldGrid(overviewFields)}

        <EuiSpacer size="m" />

        <EuiAccordion
          id="trace-input-accordion"
          buttonContent={
            <EuiTitle size="xxs">
              <span>INPUT</span>
            </EuiTitle>
          }
          initialIsOpen
          paddingSize="m"
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable>
            {formatJsonOrString(row?.input)}
          </EuiCodeBlock>
        </EuiAccordion>

        <EuiSpacer size="m" />

        <EuiAccordion
          id="trace-output-accordion"
          buttonContent={
            <EuiTitle size="xxs">
              <span>OUTPUT</span>
            </EuiTitle>
          }
          initialIsOpen
          paddingSize="m"
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable>
            {formatJsonOrString(row?.output)}
          </EuiCodeBlock>
        </EuiAccordion>
      </div>
    );
  };

  // Metadata tab content — same two-column layout as Overview
  const renderMetadataTab = () => {
    const row = selectedTraceRow;
    const metadataFields = [
      { label: 'TRACE ID', value: row?.traceId || '—' },
      {
        label: 'KIND',
        value: <EuiBadge color={getKindColor(row?.kind)}>{row?.kind || 'UNKNOWN'}</EuiBadge>,
      },
      { label: 'SPAN ID', value: row?.spanId || '—' },
      { label: 'START TIME', value: row?.startTime || '—' },
      { label: 'PARENT SPAN ID', value: row?.parentSpanId || '(root span)' },
      { label: 'LATENCY', value: row?.latency || '—' },
      { label: 'TOTAL TOKENS', value: String(row?.totalTokens || '—') },
    ];

    return <div className="agentTracesFlyout__tabContent">{renderFieldGrid(metadataFields)}</div>;
  };

  // Bottom detail tabs: Overview, Logs, Metadata, Raw
  const detailTabs = [
    {
      id: 'overview',
      name: 'Overview',
      content: renderOverviewTab(),
    },
    {
      id: 'logs',
      name: 'Logs',
      content: (
        <div className="agentTracesFlyout__tabContent">
          <EuiText size="s" color="subdued">
            No logs available
          </EuiText>
        </div>
      ),
    },
    {
      id: 'metadata',
      name: 'Metadata',
      content: renderMetadataTab(),
    },
    {
      id: 'raw',
      name: 'Raw',
      content: (
        <div className="agentTracesFlyout__tabContent">
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable>
            {JSON.stringify(selectedTraceRow?.rawDocument || {}, null, 2)}
          </EuiCodeBlock>
        </div>
      ),
    },
  ];

  return (
    <EuiFlyout onClose={onClose} ownFocus={false} size="m" aria-labelledby="trace-details-flyout">
      <EuiFlyoutHeader hasBorder>
        {/* Title row: name + status badge */}
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="trace-details-flyout">{trace.name || '—'}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={trace.status === 'success' ? 'success' : 'danger'}>
              {trace.status === 'success' ? 'SUCCESS' : 'ERROR'}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Metadata row */}
        <EuiFlexGroup gutterSize="l" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              TRACE ID
            </EuiText>
            <EuiText size="s">
              <strong>{trace.traceId ? trace.traceId.substring(0, 16) : '—'}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              SESSION
            </EuiText>
            <EuiText size="s">
              <strong>—</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              DURATION
            </EuiText>
            <EuiText size="s">
              <strong>{trace.latency || '—'}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              SPANS
            </EuiText>
            <EuiText size="s">
              <strong>{totalSpans}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              TOKENS
            </EuiText>
            <EuiText size="s">
              <strong>{totalTokens || '—'}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              COST
            </EuiText>
            <EuiText size="s">
              <strong>{trace.totalCost || '—'}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Start time row with clock icon */}
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="clock" size="s" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {trace.startTime || '—'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Trace tree */}
        <EuiTitle size="xs">
          <h3>Trace tree</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {isLoadingFullTree ? (
          <EuiPanel paddingSize="m" className="agentTracesFlyout__loadingPanel">
            <EuiLoadingSpinner size="l" />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              Loading full trace tree...
            </EuiText>
          </EuiPanel>
        ) : (
          <div className="agentTracesFlyout__treeContainer">{createTreeItems(traceTreeData)}</div>
        )}

        <EuiSpacer size="l" />

        {/* Detail tabs: Overview, Logs, Metadata, Raw */}
        <EuiTabbedContent tabs={detailTabs} initialSelectedTab={detailTabs[0]} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
