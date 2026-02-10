/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { CoreStart } from 'src/core/public';
import { SavedAgenticObservability } from '../saved_agentic_observability';
import { AgenticObservabilityServices } from '../types';
import { ExecutionContextSearch } from '../../../expressions/common';
import { getRootBreadcrumbs } from '../application/legacy/discover/application/helpers/breadcrumbs';
import { Query } from '../../../data/common';
import { SaveResult } from '../../../saved_objects/public';
import { LegacyState, setSavedSearch } from '../application/utils/state_management/slices';
import { updateLegacyPropertiesInSavedObject } from '../saved_agentic_observability/transforms';

export async function saveSavedAgenticObservability({
  savedAgenticObservability,
  newTitle,
  saveOptions,
  searchContext,
  services,
  startSyncingQueryStateWithUrl,
  openAfterSave,
  newCopyOnSave,
}: {
  savedAgenticObservability: SavedAgenticObservability;
  newTitle: string;
  saveOptions: { isTitleDuplicateConfirmed: boolean; onTitleDuplicate: () => void };
  searchContext: ExecutionContextSearch;
  services: Partial<CoreStart> & AgenticObservabilityServices;
  startSyncingQueryStateWithUrl: () => void;
  openAfterSave: boolean;
  newCopyOnSave?: boolean;
}): Promise<SaveResult | undefined> {
  const { toastNotifications, chrome, store } = services;

  const currentTitle = savedAgenticObservability.title;
  savedAgenticObservability.title = newTitle;
  if (newCopyOnSave !== undefined) {
    savedAgenticObservability.copyOnSave = newCopyOnSave;
  }

  const state: LegacyState = store.getState().legacy; // store is defined before the view is loaded
  savedAgenticObservability.columns = state.columns;
  savedAgenticObservability.sort = state.sort;

  // Use transform approach similar to vis_builder - serialize state into saved object
  updateLegacyPropertiesInSavedObject(savedAgenticObservability, {
    columns: state.columns,
    sort: state.sort,
  });

  const searchSourceInstance = savedAgenticObservability.searchSourceFields;

  if (searchSourceInstance) {
    searchSourceInstance.query = searchContext.query as Query;
    searchSourceInstance.filter = searchContext.filters;
  }
  try {
    // update or creating existing save agentic observability
    const originalId = savedAgenticObservability.id;

    const id = await savedAgenticObservability.save(saveOptions);

    // When openAfterSave is true,it indicates save should update toast, title, breadcrumbs, URL

    if (id && openAfterSave) {
      toastNotifications.addSuccess({
        title: i18n.translate('agenticObservability.notifications.SavedAgenticObservabilityTitle', {
          defaultMessage: `Search '{savedQueryTitle}' was saved`,
          values: {
            savedQueryTitle: savedAgenticObservability?.title,
          },
        }),
        'data-test-subj': 'savedAgenticObservabilitySuccess',
      });

      if (id !== originalId) {
        services.scopedHistory?.push(`#/view/${encodeURIComponent(id)}`);
      } else {
        // Update browser title and breadcrumbs
        chrome.docTitle.change(newTitle);
        chrome.setBreadcrumbs([...getRootBreadcrumbs(), { text: savedAgenticObservability.title }]);
      }

      store.dispatch(setSavedSearch(id));

      // starts syncing `_g` portion of url with query services
      startSyncingQueryStateWithUrl();
    }

    return { id };
  } catch (error) {
    toastNotifications.addDanger({
      title: i18n.translate(
        'agenticObservability.notifications.notSavedAgenticObservabilityTitle',
        {
          defaultMessage: `Search '{savedAgenticObservabilityTitle}' was not saved.`,
          values: {
            savedAgenticObservabilityTitle: savedAgenticObservability.title,
          },
        }
      ),
      text: (error as Error).message,
    });

    // Reset the original title
    savedAgenticObservability.title = currentTitle;

    return { error };
  }
}
