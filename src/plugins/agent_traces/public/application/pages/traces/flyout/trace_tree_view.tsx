/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiBadge,
  EuiToolTip,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import {
  getSpanCategory,
  getCategoryMeta,
  hexToRgba,
} from '../../../../services/span_categorization';
import type { EvalResult } from '../../../../components/eval_badge';
import { TreeNode } from './tree_helpers';
import './trace_tree_view.scss';

const JudgementIcon: React.FC = () => (
  <svg
    width="14"
    height="12"
    viewBox="0 0 14 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: 'middle', marginRight: 4, flexShrink: 0 }}
  >
    <path d="M13.9726 6.349L11.9363 1.25809C11.9027 1.17412 11.8403 1.1048 11.7604 1.0625C11.6804 1.02019 11.5881 1.00764 11.4997 1.02709L7.38182 1.94218V0.38181C7.38182 0.28055 7.34159 0.18343 7.26999 0.11183C7.19838 0.04022 7.10126 0 7 0C6.89874 0 6.80162 0.04022 6.73001 0.11183C6.65841 0.18343 6.61818 0.28055 6.61818 0.38181V2.11209L2.33545 3.06663C2.27478 3.08011 2.21832 3.1082 2.17096 3.14846C2.12361 3.18871 2.0868 3.23992 2.06373 3.29763L0.02736 8.38853C0.00982996 8.43273 0.00055 8.47973 0 8.52723C0 9.91833 1.48336 10.4363 2.41818 10.4363C3.353 10.4363 4.83636 9.91833 4.83636 8.52723C4.83621 8.47863 4.82692 8.43053 4.809 8.38533L2.93936 3.71191L6.61818 2.89418V11.2H5.47273C5.37146 11.2 5.27435 11.2402 5.20274 11.3118C5.13114 11.3834 5.09091 11.4805 5.09091 11.5818C5.09091 11.683 5.13114 11.7802 5.20274 11.8518C5.27435 11.9234 5.37146 11.9636 5.47273 11.9636H8.52727C8.62854 11.9636 8.72565 11.9234 8.79726 11.8518C8.86886 11.7802 8.90909 11.683 8.90909 11.5818C8.90909 11.4805 8.86886 11.3834 8.79726 11.3118C8.72565 11.2402 8.62854 11.2 8.52727 11.2H7.38182V2.72427L10.9588 1.92945L9.191 6.349C9.1731 6.39417 9.1638 6.44231 9.1636 6.49091C9.1636 7.882 10.647 8.40003 11.5818 8.40003C12.5166 8.40003 14 7.882 14 6.49091C13.9998 6.44231 13.9906 6.39417 13.9726 6.349ZM2.41818 9.67273C2.02907 9.66973 1.64683 9.56993 1.30582 9.38253C0.96409 9.18333 0.78718 8.92563 0.76555 8.59533L2.42009 4.46472L4.07464 8.59533C4.01291 9.47223 2.83691 9.67273 2.41818 9.67273ZM11.5818 7.63636C11.1927 7.63332 10.8105 7.5336 10.4695 7.34618C10.1277 7.147 9.9508 6.88927 9.9292 6.559L11.5837 2.42836L13.2383 6.559C13.1765 7.43591 12.0005 7.63636 11.5818 7.63636Z" fill="currentColor"/>
  </svg>
);

/** Helper to count evaluations on a node using the same dummy logic as the table */
const getEvalCount = (node: TreeNode): number => {
  if (!node.traceRow) return 0;
  const category = getSpanCategory(node.traceRow);
  const isAgent = category === 'AGENT';
  const level = node.traceRow.level ?? 0;
  const isTopLevel = level === 0;
  const hitId = node.id;
  const hashCode = hitId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const showOnTopLevel = isTopLevel && (hashCode % 10 < 6);
  const showOnAgentSpan = isAgent && !isTopLevel && (hashCode % 3 === 0);
  return (showOnTopLevel || showOnAgentSpan) ? 1 : 0;
};

/** Count total evals in a subtree */
const countEvalsInTree = (node: TreeNode): number => {
  let count = getEvalCount(node);
  if (node.children) {
    for (const child of node.children) {
      count += countEvalsInTree(child);
    }
  }
  return count;
};

/** Get dummy eval result for a node (same logic as flyout_detail_panel) */
const getDummyEvalForNode = (node: TreeNode): EvalResult | null => {
  if (!node.traceRow) return null;
  const row = node.traceRow;
  const category = getSpanCategory(row);
  const isAgent = category === 'AGENT';
  const level = row.level ?? 0;
  const isTopLevel = level === 0;
  const hitId = node.id;
  const hashCode = hitId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const showOnTopLevel = isTopLevel && (hashCode % 10 < 6);
  const showOnAgentSpan = isAgent && !isTopLevel && (hashCode % 3 === 0);
  if (!showOnTopLevel && !showOnAgentSpan) return null;

  const evalType = hashCode % 4;
  if (evalType === 0) return { name: 'Relevance', scoreLabel: 'Correct', scoreValue: 1, explanation: 'The response directly addresses the user query with high relevance. All information provided is pertinent to the question asked.' };
  if (evalType === 1) return { name: 'Faithfulness', scoreLabel: 'Pass', scoreValue: 0.92, explanation: 'The response accurately reflects the information retrieved from the knowledge base. All factual claims are well-supported by the source documents.' };
  if (evalType === 2) return { name: 'IntentResolution', scoreLabel: 'Relevant', scoreValue: 0.85, explanation: 'The agent successfully identified and addressed the user intent. The response demonstrates understanding of the underlying goal.' };
  return { name: 'Coherence', scoreLabel: 'Correct', scoreValue: 0.88, explanation: 'The response demonstrates strong logical flow and coherence. Ideas are well-organized and transitions between concepts are smooth.' };
};

const TokenIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: 'middle', marginRight: 4, flexShrink: 0 }}
  >
    <path
      d="M9 11.625C11.2782 11.625 13.125 9.77817 13.125 7.5C13.125 5.22183 11.2782 3.375 9 3.375L6.5 2H9C12.0376 2 14.5 4.46243 14.5 7.5C14.5 10.5376 12.0376 13 9 13H6.5L9 11.625Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.5 11.625C8.77817 11.625 10.625 9.77817 10.625 7.5C10.625 5.22183 8.77817 3.375 6.5 3.375C4.22183 3.375 2.375 5.22183 2.375 7.5C2.375 9.77817 4.22183 11.625 6.5 11.625ZM12 7.5C12 10.5376 9.53757 13 6.5 13C3.46243 13 1 10.5376 1 7.5C1 4.46243 3.46243 2 6.5 2C9.53757 2 12 4.46243 12 7.5Z"
      fill="currentColor"
    />
  </svg>
);

export interface TraceTreeViewProps {
  traceTreeData: TreeNode[];
  selectedNode: TreeNode | undefined;
  expandedNodes: Set<string>;
  isLoadingFullTree?: boolean;
  fullTreeError?: string;
  onSelectNode: (nodeId: string) => void;
  onToggleExpanded: (nodeId: string) => void;
  onEvalPillClick?: (evaluation: EvalResult, traceMethod?: string) => void;
}

export const TraceTreeView: React.FC<TraceTreeViewProps> = ({
  traceTreeData,
  selectedNode,
  expandedNodes,
  isLoadingFullTree,
  fullTreeError,
  onSelectNode,
  onToggleExpanded,
  onEvalPillClick,
}) => {
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
            onClick={() => onSelectNode(node.id)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectNode(node.id);
            }}
            role="button"
            tabIndex={0}
          >
            <EuiFlexItem className="agentTracesFlyout__treeRowLabelWrap">
              <EuiFlexGroup
                className="agentTracesFlyout__treeRowLabel"
                alignItems="center"
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  {(() => {
                    const category = node.traceRow ? getSpanCategory(node.traceRow) : 'OTHER';
                    const meta = getCategoryMeta(category);
                    return (
                      <EuiBadge className="agentTraces__categoryBadge" color={meta.bgColor} style={{ color: meta.textColor }}>
                        {meta.label}
                      </EuiBadge>
                    );
                  })()}
                </EuiFlexItem>

                <span className="agentTracesFlyout__treeRowLabelText" title={node.label}>
                  <span className="agentTracesFlyout__treeRowLabelName">{node.label}</span>
                  {node.traceRow?.status === 'error' && (
                    <EuiToolTip
                      content={`Span error: ${node.traceRow?.statusMessage || 'Unknown error'}`}
                      position="top"
                    >
                      <EuiIcon
                        type="alert"
                        color="danger"
                        size="m"
                        className="agentTracesFlyout__treeRowErrorIcon"
                      />
                    </EuiToolTip>
                  )}
                </span>
                {(() => {
                  const selfCount = getEvalCount(node);
                  const totalCount = countEvalsInTree(node);
                  const childCount = totalCount - selfCount;
                  if (totalCount === 0) return null;

                  // Build concise tooltip
                  const parts: string[] = [];
                  if (selfCount > 0) parts.push('1 on this span');
                  if (childCount > 0) parts.push(`${childCount} on child span${childCount === 1 ? '' : 's'}`);
                  const tooltip = `${totalCount} eval${totalCount === 1 ? '' : 's'}: ${parts.join(', ')}`;

                  return (
                    <EuiToolTip content={tooltip} position="top">
                      <EuiBadge
                        color="hollow"
                        iconType={() => <JudgementIcon />}
                        style={{ borderRadius: 999, cursor: onEvalPillClick ? 'pointer' : undefined }}
                        onClick={onEvalPillClick ? (e: React.MouseEvent) => {
                          e.stopPropagation();
                          // Get the eval for this specific node (if it has one directly)
                          const evalResult = getDummyEvalForNode(node);
                          if (evalResult) {
                            onEvalPillClick(evalResult, node.traceRow?.name);
                          }
                        } : undefined}
                        onClickAriaLabel={onEvalPillClick ? `View evaluations for ${node.label}` : undefined}
                      >
                        {totalCount}
                      </EuiBadge>
                    </EuiToolTip>
                  );
                })()}
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false} className="agentTracesFlyout__treeRowTokens">
              {node.tokens && node.tokens !== '—' && Number(node.tokens) > 0 ? (
                <EuiToolTip
                  content={
                    <div>
                      <div>
                        Tokens:{' '}
                        {typeof node.tokens === 'number'
                          ? node.tokens.toLocaleString()
                          : node.tokens}
                      </div>
                      <hr
                        style={{
                          margin: '4px 0',
                          border: 'none',
                          borderTop: '1px solid rgba(255,255,255,0.3)',
                        }}
                      />
                      <div>Input tokens: {node.traceRow?.inputTokens ?? '—'}</div>
                      <div>Output tokens: {node.traceRow?.outputTokens ?? '—'}</div>
                    </div>
                  }
                  position="top"
                >
                  <EuiBadge
                    color="hollow"
                    iconType={() => <TokenIcon />}
                    style={{ borderRadius: 999 }}
                  >
                    {typeof node.tokens === 'number' ? node.tokens.toLocaleString() : node.tokens}
                  </EuiBadge>
                </EuiToolTip>
              ) : null}
            </EuiFlexItem>

            <EuiFlexItem grow={false} className="agentTracesFlyout__treeRowLatency">
              {node.latency && node.latency !== '—' ? (
                <EuiText size="xs" color="subdued">
                  {node.latency}
                </EuiText>
              ) : null}
            </EuiFlexItem>

            <EuiFlexItem grow={false} className="agentTracesFlyout__treeRowExpand">
              {hasChildren ? (
                <EuiIcon
                  type={isExpanded ? 'arrowDown' : 'arrowRight'}
                  size="s"
                  color="subdued"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onToggleExpanded(node.id);
                  }}
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onToggleExpanded(node.id);
                    }
                  }}
                />
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>

          {hasChildren && isExpanded && (
            <div className="agentTracesFlyout__treeChildren">
              <div className="agentTracesFlyout__guideLine" />
              {createTreeItems(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="agentTracesFlyout__treeWrapper">
      <EuiSpacer size="s" />
      {isLoadingFullTree ? (
        <div className="agentTracesFlyout__loadingPanel">
          <EuiLoadingSpinner size="l" />
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="agentTraces.traceTree.loadingFullTreeMessage"
              defaultMessage="Loading full trace tree..."
            />
          </EuiText>
        </div>
      ) : fullTreeError ? (
        <EuiEmptyPrompt
          iconType="alert"
          iconColor="danger"
          title={
            <h3>
              <FormattedMessage
                id="agentTraces.traceTree.errorLoadingFullTree"
                defaultMessage="Failed to load full trace tree"
              />
            </h3>
          }
          body={<p>{fullTreeError}</p>}
        />
      ) : (
        <div
          className="agentTracesFlyout__treeContainer"
          style={
            {
              flex: 1,
              '--agent-traces-row-hover-bg': euiThemeVars.euiColorLightestShade,
              '--agent-traces-row-selected-bg': hexToRgba(euiThemeVars.euiColorPrimary, 0.1),
            } as React.CSSProperties
          }
        >
          {createTreeItems(traceTreeData)}
        </div>
      )}
    </div>
  );
};
