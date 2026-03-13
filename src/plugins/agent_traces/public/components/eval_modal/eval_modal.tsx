/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import type { EvalResult } from '../eval_badge';
import './eval_modal.scss';

interface EvalModalProps {
  evaluation: EvalResult;
  onClose: () => void;
  traceMethod?: string; // e.g., "POST /plan"
}

export const EvalModal: React.FC<EvalModalProps> = ({ evaluation, onClose, traceMethod }) => {
  const { name, scoreLabel, scoreValue, explanation } = evaluation;

  // Format score value if present
  const formattedScore = scoreValue !== undefined ? scoreValue.toFixed(2) : '—';

  const handleCopyExplanation = () => {
    if (explanation) {
      navigator.clipboard.writeText(explanation);
    }
  };

  return (
    <EuiModal onClose={onClose} className="evalModal" maxWidth={800}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <span className="evalModal__label">
                {i18n.translate('agentTraces.evalModal.evaluationLabel', {
                  defaultMessage: 'Evaluation',
                })}
              </span>
              <span className="evalModal__subtitle">
                {i18n.translate('agentTraces.evalModal.otelSubtitle', {
                  defaultMessage: 'Evaluation data following OTel GenAI semantic conventions',
                })}
              </span>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span className="evalModal__title">{name}</span>
                </EuiFlexItem>
                {traceMethod && (
                  <EuiFlexItem grow={false}>
                    <span className="evalModal__method">for {traceMethod}</span>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {/* Metadata Row - matching trace flyout style */}
        <div className="evalModal__metaRow">
          <span className="evalModal__metaItem">
            <span className="evalModal__metaKey">SCOPE</span>
            <span className="evalModal__metaVal">Trace</span>
          </span>
          <span className="evalModal__metaDivider" />
          <span className="evalModal__metaItem">
            <span className="evalModal__metaKey">NAME</span>
            <span className="evalModal__metaVal">{name}</span>
          </span>
          {scoreLabel && (
            <>
              <span className="evalModal__metaDivider" />
              <span className="evalModal__metaItem">
                <span className="evalModal__metaKey">LABEL</span>
                <span className="evalModal__metaVal">{scoreLabel}</span>
              </span>
            </>
          )}
          {scoreValue !== undefined && (
            <>
              <span className="evalModal__metaDivider" />
              <span className="evalModal__metaItem">
                <span className="evalModal__metaKey">VALUE</span>
                <span className="evalModal__metaVal">{formattedScore}</span>
              </span>
            </>
          )}
        </div>

        <EuiSpacer size="xl" />

        {/* Explanation Section */}
        {explanation && (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <h3 className="evalModal__sectionTitle">
                  {i18n.translate('agentTraces.evalModal.explanation', {
                    defaultMessage: 'Explanation',
                  })}
                </h3>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      {i18n.translate('agentTraces.evalModal.wasThisHelpful', {
                        defaultMessage: 'Was this helpful?',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={i18n.translate('agentTraces.evalModal.thumbsUp', {
                            defaultMessage: 'Helpful',
                          })}
                        >
                          <EuiButtonIcon
                            iconType="thumbsUp"
                            aria-label="Thumbs up"
                            size="s"
                            color="text"
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={i18n.translate('agentTraces.evalModal.thumbsDown', {
                            defaultMessage: 'Not helpful',
                          })}
                        >
                          <EuiButtonIcon
                            iconType="thumbsDown"
                            aria-label="Thumbs down"
                            size="s"
                            color="text"
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={i18n.translate('agentTraces.evalModal.copyExplanation', {
                            defaultMessage: 'Copy explanation',
                          })}
                        >
                          <EuiButtonIcon
                            iconType="copy"
                            aria-label="Copy"
                            size="s"
                            color="text"
                            onClick={handleCopyExplanation}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <div className="evalModal__explanationText">
              <EuiText size="s">
                <p>{explanation}</p>
              </EuiText>
            </div>
          </>
        )}
      </EuiModalBody>
    </EuiModal>
  );
};
