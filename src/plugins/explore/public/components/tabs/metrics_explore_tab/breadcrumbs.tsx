/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBreadcrumbs } from '@elastic/eui';
import { ExplorationLevel } from './types';
import { useExploration } from './exploration_context';

export const ExploreBreadcrumbs: React.FC = () => {
  const { state, dispatch } = useExploration();

  const crumbs = [
    {
      text: 'All Metrics',
      onClick:
        state.level !== ExplorationLevel.BROWSER ? () => dispatch({ type: 'GO_BACK' }) : undefined,
    },
  ];

  if (state.level === ExplorationLevel.DETAIL || state.level === ExplorationLevel.BREAKDOWN) {
    crumbs.push({
      text: state.metric,
      onClick:
        state.level === ExplorationLevel.BREAKDOWN
          ? () => dispatch({ type: 'GO_BACK' })
          : undefined,
    });
  }

  if (state.level === ExplorationLevel.BREAKDOWN) {
    crumbs.push({ text: state.label, onClick: undefined });
  }

  return <EuiBreadcrumbs breadcrumbs={crumbs} truncate={false} />;
};
