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
  EuiButtonIcon,
  EuiPanel,
  EuiIcon,
  EuiBadge,
  EuiLoadingSpinner,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
} from '@elastic/eui';
import { TraceRow } from './use_agent_traces';
import { getKindColor, getKindIconColor } from './trace_utils';

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

export const TraceDetailsFlyout: React.FC<TraceDetailsProps> = ({
  trace,
  onClose,
  fullTree,
  isLoadingFullTree,
}) => {
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

  return (
    <EuiFlyout onClose={onClose} ownFocus={false} size="l" aria-labelledby="trace-details-flyout">
      <EuiFlyoutHeader hasBorder>
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
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
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
