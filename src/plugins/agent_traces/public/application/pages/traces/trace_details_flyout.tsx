/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiTabbedContent,
  EuiCodeBlock,
  EuiIcon,
  EuiBadge,
  EuiLoadingSpinner,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiLink,
  EuiButtonIcon,
  EuiCopy,
  EuiResizableContainer,
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

  // Flyout edge resizer state
  const [flyoutWidth, setFlyoutWidth] = useState(1400);
  const [isResizingFlyout, setIsResizingFlyout] = useState(false);
  const resizingFlyoutRef = useRef(false);

  const handleFlyoutMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingFlyoutRef.current = true;
    setIsResizingFlyout(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingFlyoutRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * 0.95;
      setFlyoutWidth(Math.max(600, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      if (resizingFlyoutRef.current) {
        resizingFlyoutRef.current = false;
        setIsResizingFlyout(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

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

  // Expand all ancestors of a node so it becomes visible in the tree
  const expandAncestors = (nodeId: string) => {
    const findPath = (
      nodes: TreeNode[],
      targetId: string,
      path: string[] = []
    ): string[] | null => {
      for (const node of nodes) {
        if (node.id === targetId) return path;
        if (node.children) {
          const result = findPath(node.children, targetId, [...path, node.id]);
          if (result) return result;
        }
      }
      return null;
    };
    const ancestors = findPath(traceTreeData, nodeId);
    if (ancestors && ancestors.length > 0) {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        ancestors.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const selectNode = (nodeId: string) => {
    const index = flatNodes.findIndex((n) => n.id === nodeId);
    if (index >= 0) {
      expandAncestors(nodeId);
      setSelectedNodeIndex(index);
    }
  };

  // Create tree items with selection highlighting, expand/collapse, and tree lines
  const createTreeItems = (nodes: TreeNode[], depth = 0): React.ReactNode[] => {
    return nodes.map((node, index) => {
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
                {/* Expand/collapse icon */}
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

                {/* Node label */}
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{node.label}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            {/* Latency */}
            {node.latency && node.latency !== '—' && (
              <EuiFlexItem grow={false} className="agentTracesFlyout__treeRowLatency">
                <EuiText size="xs" color="subdued">
                  {node.latency}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div className="agentTracesFlyout__treeChildren">
              <div
                className="agentTracesFlyout__guideLine"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  toggleExpanded(node.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    toggleExpanded(node.id);
                  }
                }}
                aria-label={`Collapse ${node.label}`}
              />
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
      {
        label: 'SPAN ID',
        value: row?.spanId ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <code>{row.spanId.substring(0, 16)}</code>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={row.spanId}>
                {(copy) => (
                  <EuiButtonIcon
                    size="xs"
                    iconType="copy"
                    onClick={copy}
                    aria-label="Copy span ID"
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          '—'
        ),
      },
      { label: 'MODEL', value: row?.rawDocument?.['gen_ai.request.model'] || '—' },
      {
        label: 'PARENT SPAN',
        value: row?.parentSpanId ? (
          <EuiLink onClick={() => selectNode(row.parentSpanId!)}>{row.parentSpanId}</EuiLink>
        ) : (
          '(root span)'
        ),
      },
      { label: 'TOOL USED', value: row?.rawDocument?.['gen_ai.tool.name'] || '—' },
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
      <div className="agentTracesFlyout__tabContent" style={{ height: 'auto', minHeight: 0 }}>
        {renderFieldGrid(overviewFields)}

        <EuiSpacer size="m" />

        {/* Input Section */}
        <div>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <span>INPUT</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={formatJsonOrString(row?.input)}>
                {(copy) => (
                  <EuiButtonIcon size="xs" iconType="copy" onClick={copy} aria-label="Copy input" />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" overflowHeight={200}>
            {formatJsonOrString(row?.input)}
          </EuiCodeBlock>
        </div>

        <EuiSpacer size="m" />

        {/* Output Section */}
        <div>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <span>OUTPUT</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={formatJsonOrString(row?.output)}>
                {(copy) => (
                  <EuiButtonIcon
                    size="xs"
                    iconType="copy"
                    onClick={copy}
                    aria-label="Copy output"
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" overflowHeight={200}>
            {formatJsonOrString(row?.output)}
          </EuiCodeBlock>
        </div>
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

  // Bottom detail tabs: Overview, Logs, Metadata, Raw Spans, Timeline
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
      id: 'raw-spans',
      name: 'Raw Spans',
      content: (
        <div className="agentTracesFlyout__tabContent">
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable>
            {JSON.stringify(selectedTraceRow?.rawDocument || {}, null, 2)}
          </EuiCodeBlock>
        </div>
      ),
    },
    {
      id: 'timeline',
      name: 'Timeline',
      content: (
        <div className="agentTracesFlyout__tabContent">
          <EuiText size="s" color="subdued">
            Timeline view coming soon...
          </EuiText>
        </div>
      ),
    },
  ];

  return (
    <EuiFlyout
      className="agentTracesFlyout"
      onClose={onClose}
      ownFocus={false}
      size="l"
      aria-labelledby="trace-details-flyout"
      style={{ width: `${flyoutWidth}px`, maxWidth: '95vw' }}
    >
      {/* Flyout edge resizer */}
      <div
        className="agentTracesFlyout__flyoutResizer"
        onMouseDown={handleFlyoutMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '5px',
          cursor: 'col-resize',
          background: isResizingFlyout ? '#0066cc' : 'transparent',
          zIndex: 1001,
          transition: isResizingFlyout ? 'none' : 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isResizingFlyout) {
            e.currentTarget.style.background = '#0066cc';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizingFlyout) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      />

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

        <EuiSpacer size="s" />

        {/* Metadata row */}
        <EuiFlexGroup gutterSize="l" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              TRACE ID
            </EuiText>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    <code>{trace.traceId ? trace.traceId.substring(0, 12) : '—'}</code>
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {trace.traceId && (
                  <EuiCopy textToCopy={trace.traceId}>
                    {(copy) => (
                      <EuiButtonIcon
                        size="xs"
                        iconType="copy"
                        onClick={copy}
                        aria-label="Copy trace ID"
                      />
                    )}
                  </EuiCopy>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiResizableContainer
          direction="horizontal"
          className="agentTracesFlyout__resizableContainer"
        >
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              {/* Left Column - Trace Tree */}
              <EuiResizablePanel
                id="traceTree"
                initialSize={50}
                minSize="200px"
                paddingSize="none"
                style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <EuiTabbedContent
                  tabs={[
                    {
                      id: 'trace-tree',
                      name: 'Trace Tree',
                      content: (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                          }}
                        >
                          <EuiSpacer size="s" />
                          {isLoadingFullTree ? (
                            <div className="agentTracesFlyout__loadingPanel">
                              <EuiLoadingSpinner size="l" />
                              <EuiSpacer size="s" />
                              <EuiText size="s" color="subdued">
                                Loading full trace tree...
                              </EuiText>
                            </div>
                          ) : (
                            <div className="agentTracesFlyout__treeContainer" style={{ flex: 1 }}>
                              {createTreeItems(traceTreeData)}
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      id: 'agent-graph',
                      name: 'Agent Graph',
                      content: (
                        <div style={{ padding: '16px', height: '100%' }}>
                          <EuiText size="s" color="subdued">
                            Agent graph view coming soon...
                          </EuiText>
                        </div>
                      ),
                    },
                  ]}
                  initialSelectedTab={{ id: 'trace-tree', name: 'Trace Tree' }}
                  size="s"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                />
              </EuiResizablePanel>

              <EuiResizableButton />

              {/* Right Column - Detail Tabs */}
              <EuiResizablePanel
                id="traceDetails"
                initialSize={50}
                minSize="200px"
                paddingSize="none"
                style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <EuiTabbedContent
                  tabs={detailTabs}
                  initialSelectedTab={detailTabs[0]}
                  size="s"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
