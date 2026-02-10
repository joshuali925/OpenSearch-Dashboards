/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { TopNavMenuIconRun, TopNavMenuIconUIData } from '../types';
import { AgenticObservabilityServices } from '../../../../types';
import { SavedAgenticObservability } from '../../../../types/saved_agentic_observability_types';
import { unhashUrl } from '../../../../../../opensearch_dashboards_utils/public';
import { getSharingData } from './helpers';

export const shareTopNavData: TopNavMenuIconUIData = {
  tooltip: i18n.translate('agenticObservability.topNav.shareTitle', {
    defaultMessage: 'Share',
  }),
  ariaLabel: i18n.translate('agenticObservability.topNav.shareAriaLabel', {
    defaultMessage: `Share search`,
  }),
  testId: 'shareTopNavButton',
  iconType: 'share',
  controlType: 'icon',
};

export const getShareButtonRun = (
  services: AgenticObservabilityServices,
  savedAgenticObservability?: SavedAgenticObservability
): TopNavMenuIconRun => async (anchorElement) => {
  const { share, store } = services;
  if (!savedAgenticObservability || !share) return;

  const legacyState = store.getState().legacy;
  const sharingData = await getSharingData({
    searchSource: savedAgenticObservability.searchSource,
    state: legacyState,
    services,
  });

  // Flush any pending URL state updates to ensure the share URL contains current state.
  // URL updates are batched asynchronously, so without flushing, the URL may not reflect
  // the latest state (e.g., _q and _a parameters) when captured.
  services.osdUrlStateStorage?.flush();

  share.toggleShareContextMenu({
    anchorElement,
    allowEmbed: false,
    allowShortUrl: services.capabilities.discover?.createShortUrl as boolean,
    shareableUrl: unhashUrl(window.location.href),
    objectId: savedAgenticObservability.id,
    objectType: 'search',
    sharingData: {
      ...sharingData,
      title: savedAgenticObservability.title,
    },
    isDirty: !savedAgenticObservability.id || legacyState.isDirty || false,
  });
};
