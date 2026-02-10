/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { AgenticObservabilityServices } from '../../../../types';
import { resetAgenticObservabilityStateActionCreator } from '../../../../application/utils/state_management/actions/reset_agentic_observability_state';
import { TopNavMenuIconRun, TopNavMenuIconUIData } from '../types';
import { useClearEditors } from '../../../../application/hooks';
import { getVisualizationBuilder } from '../../../visualizations/visualization_builder';

export const newTopNavData: TopNavMenuIconUIData = {
  tooltip: i18n.translate('agenticObservability.topNav.newTitle', {
    defaultMessage: 'New',
  }),
  ariaLabel: i18n.translate('agenticObservability.topNav.newAriaLabel', {
    defaultMessage: `New Search`,
  }),
  testId: 'discoverNewButton',
  iconType: 'plusInCircle',
  controlType: 'icon',
};

export const getNewButtonRun = (
  services: AgenticObservabilityServices,
  clearEditors: ReturnType<typeof useClearEditors>
): TopNavMenuIconRun => () => {
  const visBuilder = getVisualizationBuilder();
  visBuilder.clearUrl();
  services.store.dispatch(resetAgenticObservabilityStateActionCreator(services, clearEditors));

  if (services.scopedHistory) {
    services.scopedHistory.push('/');
  }
};
