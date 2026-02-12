/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import ReactDOM from 'react-dom';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiTabbedContent,
  EuiCodeBlock,
  EuiButtonIcon,
  EuiPanel,
  EuiIcon,
  EuiBadge,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { TraceRow } from './use_agent_traces';

export interface TraceDetailsProps {
  trace: TraceRow;
  onClose: () => void;
  fullTree?: TraceRow[];
  isLoadingFullTree?: boolean;
}

interface TreeNode {
  label: string;
  id: string;
  icon: React.ReactNode;
  children?: TreeNode[];
  kind?: string;
  tokens?: number | string;
  latency?: string;
  traceRow?: TraceRow;
}

// Build tree nodes from a TraceRow
const buildTreeFromTraceRow = (row: TraceRow): TreeNode => {
  const getKindIconColor = (kind: string) => {
    switch (kind) {
      case 'AGENT':
        return 'warning';
      case 'CHAIN':
        return 'secondary';
      case 'LLM':
        return 'danger';
      case 'RETRIEVE':
        return 'success';
      case 'TOOL':
        return 'primary';
      case 'EMBEDDING':
        return 'accent';
      default:
        return 'subdued';
    }
  };

  const node: TreeNode = {
    label: row.name,
    id: row.id,
    icon: <EuiIcon type="dot" color={getKindIconColor(row.kind)} />,
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

// Helper function to get badge color based on kind
const getKindColor = (kind?: string) => {
  switch (kind) {
    case 'AGENT':
      return 'warning';
    case 'CHAIN':
      return 'secondary';
    case 'LLM':
      return 'danger';
    case 'RETRIEVE':
      return 'success';
    case 'TOOL':
      return 'primary';
    case 'EMBEDDING':
      return 'accent';
    default:
      return 'default';
  }
};

const DEFAULT_WIDTH = 600;
const MIN_WIDTH = 360;
const MAX_WIDTH_RATIO = 0.85;

export const TraceDetailsFlyout: React.FC<TraceDetailsProps> = ({
  trace,
  onClose,
  fullTree,
  isLoadingFullTree,
}) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      e.preventDefault();
    },
    [width]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Build tree from trace data — use fullTree (all spans) when available
  const traceTreeData = useMemo(() => {
    if (fullTree && fullTree.length > 0) {
      // fullTree contains root-level TraceRows with children already nested
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

  const handlePrevious = () => {
    if (selectedNodeIndex > 0) {
      setSelectedNodeIndex(selectedNodeIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedNodeIndex < flatNodes.length - 1) {
      setSelectedNodeIndex(selectedNodeIndex + 1);
    }
  };

  // Create tree items with selection highlighting
  const createTreeItems = (nodes: TreeNode[]): React.ReactNode[] => {
    return nodes.map((node) => (
      <div key={node.id} style={{ marginBottom: '4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '4px 8px',
            backgroundColor: node.id === selectedNode?.id ? '#E6F1FA' : 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={() => {
            const index = flatNodes.findIndex((n) => n.id === node.id);
            if (index >= 0) setSelectedNodeIndex(index);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              const index = flatNodes.findIndex((n) => n.id === node.id);
              if (index >= 0) setSelectedNodeIndex(index);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {node.icon}
            <strong>{node.label}</strong>
          </span>
          <span style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#69707D' }}>
            {node.tokens !== '—' && node.tokens !== undefined && <span>{node.tokens}</span>}
            {node.latency && node.latency !== '—' && <span>{node.latency}</span>}
          </span>
        </div>
        {node.children && node.children.length > 0 && (
          <div style={{ marginLeft: '24px', marginTop: '4px' }}>
            {createTreeItems(node.children)}
          </div>
        )}
      </div>
    ));
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

  const tabs = [
    {
      id: 'trace-tree',
      name: 'Trace Tree',
      content: (
        <div style={{ padding: '16px' }}>
          {isLoadingFullTree ? (
            <EuiPanel paddingSize="m" style={{ textAlign: 'center' }}>
              <EuiLoadingSpinner size="l" />
              <EuiText size="s" color="subdued" style={{ marginTop: '8px' }}>
                Loading full trace tree...
              </EuiText>
            </EuiPanel>
          ) : (
            <EuiPanel paddingSize="s">
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {createTreeItems(traceTreeData)}
              </div>
            </EuiPanel>
          )}
        </div>
      ),
    },
    {
      id: 'agent-graph',
      name: 'Agent Graph',
      content: (
        <div style={{ padding: '16px' }}>
          <EuiText>
            <p>Agent graph visualization would go here</p>
          </EuiText>
        </div>
      ),
    },
    {
      id: 'timeline',
      name: 'Timeline',
      content: (
        <div style={{ padding: '16px' }}>
          <EuiText>
            <p>Timeline visualization would go here</p>
          </EuiText>
        </div>
      ),
    },
  ];

  const detailTabs = [
    {
      id: 'input',
      name: (
        <span>
          <EuiIcon type="arrowDown" size="s" /> Input
        </span>
      ),
      content: (
        <div style={{ padding: '16px' }}>
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable>
            {formatJsonOrString(selectedTraceRow?.input)}
          </EuiCodeBlock>
        </div>
      ),
    },
    {
      id: 'output',
      name: (
        <span>
          <EuiIcon type="arrowUp" size="s" /> Output
        </span>
      ),
      content: (
        <div style={{ padding: '16px' }}>
          <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable>
            {formatJsonOrString(selectedTraceRow?.output)}
          </EuiCodeBlock>
        </div>
      ),
    },
    {
      id: 'evaluations',
      name: 'Evaluations',
      content: (
        <div style={{ padding: '16px' }}>
          <EuiText size="s">No evaluations available</EuiText>
        </div>
      ),
    },
    {
      id: 'attributes',
      name: 'Attributes',
      content: (
        <div style={{ padding: '16px' }}>
          <EuiText size="s">
            <dl>
              <dt>
                <strong>Trace ID:</strong>
              </dt>
              <dd>{selectedTraceRow?.traceId || '—'}</dd>
              <dt>
                <strong>Span ID:</strong>
              </dt>
              <dd>{selectedTraceRow?.spanId || '—'}</dd>
              <dt>
                <strong>Parent Span ID:</strong>
              </dt>
              <dd>{selectedTraceRow?.parentSpanId || '(root span)'}</dd>
              <dt>
                <strong>Kind:</strong>
              </dt>
              <dd>
                <EuiBadge color={getKindColor(selectedTraceRow?.kind)}>
                  {selectedTraceRow?.kind || 'UNKNOWN'}
                </EuiBadge>
              </dd>
              <dt>
                <strong>Start Time:</strong>
              </dt>
              <dd>{selectedTraceRow?.startTime || '—'}</dd>
              <dt>
                <strong>Latency:</strong>
              </dt>
              <dd>{selectedTraceRow?.latency || '—'}</dd>
              <dt>
                <strong>Total Tokens:</strong>
              </dt>
              <dd>{selectedTraceRow?.totalTokens || '—'}</dd>
            </dl>
          </EuiText>
        </div>
      ),
    },
    {
      id: 'annotations',
      name: 'Annotations',
      content: (
        <div style={{ padding: '16px' }}>
          <EuiText size="s">No annotations</EuiText>
        </div>
      ),
    },
  ];

  return ReactDOM.createPortal(
    <div
      aria-labelledby="trace-details-flyout"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: `${width}px`,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {/* Drag handle for resizing */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: '6px',
          cursor: 'col-resize',
          background: '#D3DAE6',
          flexShrink: 0,
          transition: isDragging.current ? 'none' : 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#98A2B3';
        }}
        onMouseLeave={(e) => {
          if (!isDragging.current) {
            (e.currentTarget as HTMLElement).style.background = '#D3DAE6';
          }
        }}
      />
      {/* Flyout content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderLeft: '1px solid #D3DAE6',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #D3DAE6', flexShrink: 0 }}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="arrowUp"
                aria-label="Previous trace"
                display="base"
                size="s"
                onClick={handlePrevious}
                disabled={selectedNodeIndex === 0}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="arrowDown"
                aria-label="Next trace"
                display="base"
                size="s"
                onClick={handleNext}
                disabled={selectedNodeIndex === flatNodes.length - 1}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                aria-label="Close"
                onClick={onClose}
                display="base"
                size="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiTitle size="s">
            <h2 id="trace-details-flyout">
              trace_id: {trace.traceId || '—'} <EuiBadge color="hollow">Trace ID</EuiBadge>
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                TRACE STATUS
              </EuiText>
              <EuiHealth color={trace.status === 'success' ? 'success' : 'danger'}>
                {trace.status === 'success' ? 'OK' : 'ERROR'}
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                TOTAL TOKENS
              </EuiText>
              <EuiText size="s">{trace.totalTokens || '—'}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                START TIME
              </EuiText>
              <EuiText size="s">{trace.startTime || '—'}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                LATENCY
              </EuiText>
              <EuiText size="s">{trace.latency || '—'}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        {/* Body - scrollable */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} onTabClick={() => {}} />
          <EuiSpacer size="m" />
          <EuiPanel paddingSize="none">
            <div style={{ borderTop: '1px solid #D3DAE6' }}>
              <div style={{ padding: '8px 16px', background: '#F5F7FA' }}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={getKindColor(selectedNode?.kind)}>
                      {selectedNode?.kind || 'NODE'}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{selectedNode?.label}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon iconType="copy" aria-label="Copy" size="s" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
              <EuiTabbedContent tabs={detailTabs} size="s" initialSelectedTab={detailTabs[0]} />
            </div>
          </EuiPanel>
        </div>
      </div>
    </div>,
    document.body
  );
};
