/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TODO:
 * - make this file work correctly with the new saved agentic observability
 * - write unit tests
 */

import { i18n } from '@osd/i18n';
import React from 'react';
import { DataView as Dataset } from 'src/plugins/data/common';
import { TopNavMenuIconRun, TopNavMenuIconUIData } from '../types';
import { AgenticObservabilityServices } from '../../../../types';
import { ExecutionContextSearch } from '../../../../../../expressions';
import { SavedAgenticObservability } from '../../../../types/saved_agentic_observability_types';
import {
  OnSaveProps,
  SavedObjectSaveModal,
  SaveResult,
  showSaveModal,
} from '../../../../../../saved_objects/public';
import { saveSavedAgenticObservability } from '../../../../helpers/save_agentic_observability';
import { TabState } from '../../../../application/utils/state_management/slices';
import { TabDefinition } from '../../../../services/tab_registry/tab_registry_service';
import { saveStateToSavedObject } from '../../../../saved_agentic_observability/transforms';
import { getVisualizationBuilder } from '../../../visualizations/visualization_builder';

export const saveTopNavData: TopNavMenuIconUIData = {
  tooltip: i18n.translate('agenticObservability.topNav.saveTitle', {
    defaultMessage: 'Save',
  }),
  ariaLabel: i18n.translate('agenticObservability.topNav.saveAriaLabel', {
    defaultMessage: `Save search`,
  }),
  testId: 'discoverSaveButton',
  iconType: 'save',
  controlType: 'icon',
};

export interface SaveStateProps {
  dataset: Dataset | undefined;
  tabState: TabState;
  flavorId: string | null;
  tabDefinition: TabDefinition | undefined;
  activeTabId: string;
}

export const getSaveButtonRun = (
  services: AgenticObservabilityServices,
  startSyncingQueryStateWithUrl: () => void,
  searchContext: ExecutionContextSearch,
  saveStateProps: SaveStateProps,
  savedAgenticObservability?: SavedAgenticObservability
): TopNavMenuIconRun => () => {
  if (!savedAgenticObservability) return;

  const onSave = async ({
    newTitle,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: OnSaveProps): Promise<SaveResult | undefined> => {
    const visualizationBuilder = getVisualizationBuilder();
    const visConfig = visualizationBuilder.visConfig$.value;
    const axesMapping = visConfig?.axesMapping;
    const savedAgenticObservabilityWithState = saveStateToSavedObject(
      savedAgenticObservability,
      saveStateProps.flavorId ?? 'logs',
      saveStateProps.tabDefinition!,
      { axesMapping, chartType: visConfig?.type, styleOptions: visConfig?.styles },
      saveStateProps.dataset,
      saveStateProps.activeTabId
    );
    const result = await saveSavedAgenticObservability({
      savedAgenticObservability: savedAgenticObservabilityWithState,
      newTitle,
      saveOptions: { isTitleDuplicateConfirmed, onTitleDuplicate },
      searchContext,
      services,
      startSyncingQueryStateWithUrl,
      openAfterSave: true,
      newCopyOnSave,
    });

    return result;
  };
  const saveModal = (
    <SavedObjectSaveModal
      onSave={onSave}
      onClose={() => {}}
      title={savedAgenticObservability.title ?? ''}
      showCopyOnSave={!!savedAgenticObservability.id}
      // TODO: Does this need to be type "agenticObservability"?
      objectType="discover"
      description={i18n.translate('agenticObservability.localMenu.saveSaveSearchDescription', {
        defaultMessage:
          'Save your Discover search so you can use it in visualizations and dashboards',
      })}
      showDescription={false}
    />
  );
  showSaveModal(saveModal, services.core.i18n.Context);
};
