/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import './eval_badge.scss';

export interface EvalResult {
  name: string; // gen_ai.evaluation.name
  scoreLabel?: string; // gen_ai.evaluation.score.label (e.g., "correct", "relevant")
  scoreValue?: number; // gen_ai.evaluation.score.value
  explanation?: string; // gen_ai.evaluation.explanation
  timestamp?: string;
}

interface EvalBadgeProps {
  evaluation: EvalResult;
  onClick?: () => void;
}

const JudgementIcon: React.FC = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.9726 6.349L11.9363 1.25809C11.9027 1.17412 11.8403 1.1048 11.7604 1.0625C11.6804 1.02019 11.5881 1.00764 11.4997 1.02709L7.38182 1.94218V0.38181C7.38182 0.28055 7.34159 0.18343 7.26999 0.11183C7.19838 0.04022 7.10126 0 7 0C6.89874 0 6.80162 0.04022 6.73001 0.11183C6.65841 0.18343 6.61818 0.28055 6.61818 0.38181V2.11209L2.33545 3.06663C2.27478 3.08011 2.21832 3.1082 2.17096 3.14846C2.12361 3.18871 2.0868 3.23992 2.06373 3.29763L0.02736 8.38853C0.00982996 8.43273 0.00055 8.47973 0 8.52723C0 9.91833 1.48336 10.4363 2.41818 10.4363C3.353 10.4363 4.83636 9.91833 4.83636 8.52723C4.83621 8.47863 4.82692 8.43053 4.809 8.38533L2.93936 3.71191L6.61818 2.89418V11.2H5.47273C5.37146 11.2 5.27435 11.2402 5.20274 11.3118C5.13114 11.3834 5.09091 11.4805 5.09091 11.5818C5.09091 11.683 5.13114 11.7802 5.20274 11.8518C5.27435 11.9234 5.37146 11.9636 5.47273 11.9636H8.52727C8.62854 11.9636 8.72565 11.9234 8.79726 11.8518C8.86886 11.7802 8.90909 11.683 8.90909 11.5818C8.90909 11.4805 8.86886 11.3834 8.79726 11.3118C8.72565 11.2402 8.62854 11.2 8.52727 11.2H7.38182V2.72427L10.9588 1.92945L9.191 6.349C9.1731 6.39417 9.1638 6.44231 9.1636 6.49091C9.1636 7.882 10.647 8.40003 11.5818 8.40003C12.5166 8.40003 14 7.882 14 6.49091C13.9998 6.44231 13.9906 6.39417 13.9726 6.349ZM2.41818 9.67273C2.02907 9.66973 1.64683 9.56993 1.30582 9.38253C0.96409 9.18333 0.78718 8.92563 0.76555 8.59533L2.42009 4.46472L4.07464 8.59533C4.01291 9.47223 2.83691 9.67273 2.41818 9.67273ZM11.5818 7.63636C11.1927 7.63332 10.8105 7.5336 10.4695 7.34618C10.1277 7.147 9.9508 6.88927 9.9292 6.559L11.5837 2.42836L13.2383 6.559C13.1765 7.43591 12.0005 7.63636 11.5818 7.63636Z" fill="#2A3947"/>
  </svg>
);

export const EvalBadge: React.FC<EvalBadgeProps> = ({ evaluation, onClick }) => {
  const { name, scoreLabel, scoreValue } = evaluation;
  
  // Format the badge content with improved visual hierarchy
  const badgeContent = (
    <span className="evalBadge__content">
      <span className="evalBadge__icon">
        <JudgementIcon />
      </span>
      <span className="evalBadge__text">
        <span className="evalBadge__name">{name}</span>
        {scoreLabel && (
          <>
            {': '}
            <span className="evalBadge__label">{scoreLabel}</span>
          </>
        )}
        {scoreValue !== undefined && (
          <>
            {'; '}
            <span className="evalBadge__value">{scoreValue}</span>
          </>
        )}
      </span>
    </span>
  );

  return (
    <span
      className={`evalBadge ${onClick ? 'evalBadge--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View details for ${name}` : undefined}
    >
      {badgeContent}
    </span>
  );
};

interface EvalBadgesProps {
  evaluations: EvalResult[];
  onBadgeClick?: (evaluation: EvalResult) => void;
}

export const EvalBadges: React.FC<EvalBadgesProps> = ({ evaluations, onBadgeClick }) => {
  if (!evaluations || evaluations.length === 0) {
    return <span>—</span>;
  }

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" alignItems="flexStart">
      {evaluations.map((evaluation, index) => (
        <EuiFlexItem key={`${evaluation.name}-${index}`} grow={false}>
          <EvalBadge
            evaluation={evaluation}
            onClick={onBadgeClick ? () => onBadgeClick(evaluation) : undefined}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
