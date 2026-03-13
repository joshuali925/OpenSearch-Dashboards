/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiHealth,
  EuiCodeBlock,
  EuiPanel,
  EuiLink,
  EuiButtonIcon,
  EuiCopy,
  EuiAccordion,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { TraceRow } from '../hooks/use_agent_traces';
import { TreeNode } from './tree_helpers';
import type { EvalResult } from '../../../../components/eval_badge';
import { getSpanCategory } from '../../../../services/span_categorization';

export const formatJsonOrString = (value: string | undefined): string => {
  if (!value || value === '—')
    return i18n.translate('agentTraces.detailPanel.noData', {
      defaultMessage: '(no data)',
    });
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};

/** Get dummy evaluation for a row (same logic as table column) */
const getDummyEval = (row: TraceRow): EvalResult | null => {
  const category = getSpanCategory(row);
  const isAgent = category === 'AGENT';
  const level = row.level ?? 0;
  const isTopLevel = level === 0;
  const hitId = row.id;
  const hashCode = hitId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const showOnTopLevel = isTopLevel && (hashCode % 10 < 6);
  const showOnAgentSpan = isAgent && !isTopLevel && (hashCode % 3 === 0);

  if (!showOnTopLevel && !showOnAgentSpan) return null;

  const evalType = hashCode % 4;
  if (evalType === 0) {
    return { name: 'Relevance', scoreLabel: 'Correct', scoreValue: 1, explanation: 'The response directly addresses the user query with high relevance. All information provided is pertinent to the question asked.' };
  } else if (evalType === 1) {
    return { name: 'Faithfulness', scoreLabel: 'Pass', scoreValue: 0.92, explanation: 'The response accurately reflects the information retrieved from the knowledge base. All factual claims are well-supported by the source documents.' };
  } else if (evalType === 2) {
    return { name: 'IntentResolution', scoreLabel: 'Relevant', scoreValue: 0.85, explanation: 'The agent successfully identified and addressed the user intent. The response demonstrates understanding of the underlying goal.' };
  } else {
    return { name: 'Coherence', scoreLabel: 'Correct', scoreValue: 0.88, explanation: 'The response demonstrates strong logical flow and coherence. Ideas are well-organized and transitions between concepts are smooth.' };
  }
};

interface FlyoutDetailPanelProps {
  selectedNode: TreeNode | undefined;
  selectedTraceRow: TraceRow | undefined;
  onSelectNode: (nodeId: string) => void;
}

export const FlyoutDetailPanel: React.FC<FlyoutDetailPanelProps> = ({
  selectedNode,
  selectedTraceRow,
  onSelectNode,
}) => {
  const row = selectedTraceRow;

  return (
    <EuiPanel
      color="subdued"
      hasShadow={false}
      borderRadius="none"
      className="agentTracesFlyout__detailPanel"
    >
      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{selectedNode?.label || '—'}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color={row?.status === 'error' ? 'danger' : 'success'}>
            {row?.status === 'error'
              ? i18n.translate('agentTraces.detailPanel.statusError', {
                  defaultMessage: 'Error',
                })
              : i18n.translate('agentTraces.detailPanel.statusSuccess', {
                  defaultMessage: 'Success',
                })}
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiAccordion
        id="metadata-accordion"
        buttonContent={
          <strong>
            {i18n.translate('agentTraces.detailPanel.metadata', {
              defaultMessage: 'Metadata',
            })}
          </strong>
        }
        initialIsOpen
        paddingSize="m"
      >
        <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">
              <span className="euiTextColor--subdued">
                {i18n.translate('agentTraces.detailPanel.operation', {
                  defaultMessage: 'Operation:',
                })}
              </span>{' '}
              <strong>{row?.kind || '—'}</strong>
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">
              <span className="euiTextColor--subdued">
                {i18n.translate('agentTraces.detailPanel.duration', {
                  defaultMessage: 'Duration:',
                })}
              </span>{' '}
              <strong>{row?.latency || '—'}</strong>
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="default">
                  <span className="euiTextColor--subdued">
                    {i18n.translate('agentTraces.detailPanel.spanId', {
                      defaultMessage: 'Span ID:',
                    })}
                  </span>{' '}
                  <strong>{row?.spanId || '—'}</strong>
                </EuiBadge>
              </EuiFlexItem>
              {row?.spanId && (
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={row.spanId}>
                    {(copy) => (
                      <EuiButtonIcon
                        size="xs"
                        iconType="copy"
                        onClick={copy}
                        aria-label={i18n.translate('agentTraces.detailPanel.copySpanId', {
                          defaultMessage: 'Copy span ID',
                        })}
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="default">
                  <span className="euiTextColor--subdued">
                    {i18n.translate('agentTraces.detailPanel.parentSpan', {
                      defaultMessage: 'Parent span:',
                    })}
                  </span>{' '}
                  {row?.parentSpanId ? (
                    <strong>
                      <EuiLink onClick={() => onSelectNode(row.parentSpanId!)}>
                        {row.parentSpanId}
                      </EuiLink>
                    </strong>
                  ) : (
                    <span className="euiTextColor--subdued">
                      {i18n.translate('agentTraces.detailPanel.rootSpan', {
                        defaultMessage: 'Root span',
                      })}
                    </span>
                  )}
                </EuiBadge>
              </EuiFlexItem>
              {row?.parentSpanId && (
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={row.parentSpanId}>
                    {(copy) => (
                      <EuiButtonIcon
                        size="xs"
                        iconType="copy"
                        onClick={copy}
                        aria-label={i18n.translate('agentTraces.detailPanel.copyParentSpanId', {
                          defaultMessage: 'Copy parent span ID',
                        })}
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">
              <span className="euiTextColor--subdued">
                {i18n.translate('agentTraces.detailPanel.startTime', {
                  defaultMessage: 'Start time:',
                })}
              </span>{' '}
              <strong>{row?.startTime || '—'}</strong>
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">
              <span className="euiTextColor--subdued">
                {i18n.translate('agentTraces.detailPanel.endTime', {
                  defaultMessage: 'End time:',
                })}
              </span>{' '}
              <strong>{row?.endTime || '—'}</strong>
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>

      <EuiSpacer size="s" />

      <EuiAccordion
        id="io-accordion"
        buttonContent={
          <strong>
            {i18n.translate('agentTraces.detailPanel.inputOutput', {
              defaultMessage: 'Input / Output',
            })}
          </strong>
        }
        initialIsOpen
        paddingSize="m"
      >
        <div>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('agentTraces.detailPanel.input', {
                defaultMessage: 'INPUT',
              })}
            </span>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language="json"
            overflowHeight={200}
            isCopyable={!!row?.input && row.input !== '—'}
          >
            {formatJsonOrString(row?.input)}
          </EuiCodeBlock>
        </div>

        <EuiSpacer size="m" />

        <div>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('agentTraces.detailPanel.output', {
                defaultMessage: 'OUTPUT',
              })}
            </span>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language="json"
            overflowHeight={200}
            isCopyable={!!row?.output && row.output !== '—'}
          >
            {formatJsonOrString(row?.output)}
          </EuiCodeBlock>
        </div>
      </EuiAccordion>

      <EuiSpacer size="s" />

      {/* Evaluation Section */}
      {row && (() => {
        const evalResult = getDummyEval(row);
        if (!evalResult) return null;
        return (
          <EuiAccordion
            id="evaluation-accordion"
            buttonContent={
              <strong>
                {i18n.translate('agentTraces.detailPanel.evaluation', {
                  defaultMessage: 'Evaluation',
                })}
              </strong>
            }
            initialIsOpen
            paddingSize="m"
          >
            {/* Metadata Row */}
            <div className="agentTracesFlyout__evalMetaRow">
              <span className="agentTracesFlyout__evalMetaItem">
                <span className="agentTracesFlyout__evalMetaKey">NAME</span>
                <span className="agentTracesFlyout__evalMetaVal">{evalResult.name}</span>
              </span>
              {evalResult.scoreLabel && (
                <>
                  <span className="agentTracesFlyout__evalMetaDivider" />
                  <span className="agentTracesFlyout__evalMetaItem">
                    <span className="agentTracesFlyout__evalMetaKey">LABEL</span>
                    <span className="agentTracesFlyout__evalMetaVal">{evalResult.scoreLabel}</span>
                  </span>
                </>
              )}
              {evalResult.scoreValue !== undefined && (
                <>
                  <span className="agentTracesFlyout__evalMetaDivider" />
                  <span className="agentTracesFlyout__evalMetaItem">
                    <span className="agentTracesFlyout__evalMetaKey">VALUE</span>
                    <span className="agentTracesFlyout__evalMetaVal">{evalResult.scoreValue.toFixed(2)}</span>
                  </span>
                </>
              )}
            </div>

            <EuiSpacer size="m" />

            {/* Explanation */}
            {evalResult.explanation && (
              <>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>EXPLANATION</span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">Helpful?</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon iconType="thumbsUp" aria-label="Helpful" size="xs" color="text" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon iconType="thumbsDown" aria-label="Not helpful" size="xs" color="text" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiCopy textToCopy={evalResult.explanation}>
                          {(copy) => (
                            <EuiButtonIcon iconType="copy" aria-label="Copy" size="xs" color="text" onClick={copy} />
                          )}
                        </EuiCopy>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <div className="agentTracesFlyout__evalExplanation">
                  <EuiText size="s"><p>{evalResult.explanation}</p></EuiText>
                </div>
              </>
            )}
          </EuiAccordion>
        );
      })()}

      <EuiSpacer size="s" />

      <EuiAccordion
        id="raw-span-accordion"
        buttonContent={
          <strong>
            {i18n.translate('agentTraces.detailPanel.rawSpan', {
              defaultMessage: 'Raw Span',
            })}
          </strong>
        }
        initialIsOpen
        paddingSize="m"
      >
        <EuiCodeBlock language="json" overflowHeight={600} isCopyable>
          {JSON.stringify(selectedTraceRow?.rawDocument ?? {}, null, 2)}
        </EuiCodeBlock>
      </EuiAccordion>
    </EuiPanel>
  );
};
