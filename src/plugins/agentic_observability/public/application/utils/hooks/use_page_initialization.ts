/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useCurrentAgenticObservabilityId } from './use_current_agentic_observability_id';
import { useSavedAgenticObservability } from './use_saved_agentic_observability';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgenticObservabilityServices } from '../../../types';
import {
  setSavedSearch,
  setQueryState,
  setActiveTab,
  clearResults,
  clearQueryStatusMap,
  clearLastExecutedData,
  setEditorMode,
  setUsingRegexPatterns,
} from '../state_management/slices';
import { executeQueries } from '../state_management/actions/query_actions';
import { AgenticObservabilityFlavor } from '../../../../common';
import { useSetEditorText } from '../../hooks';
import { EditorMode } from '../state_management/types';
import { getVisualizationBuilder } from '../../../components/visualizations/visualization_builder';

export const useInitPage = () => {
  const dispatch = useDispatch();
  const { services } = useOpenSearchDashboards<AgenticObservabilityServices>();
  const agenticObsId = useCurrentAgenticObservabilityId();
  const { savedAgenticObservability, error } = useSavedAgenticObservability(agenticObsId);
  const setEditorText = useSetEditorText();
  const { chrome, data } = services;
  const visualizationBuilder = getVisualizationBuilder();

  useEffect(() => {
    if (savedAgenticObservability && !error) {
      if (savedAgenticObservability.id) {
        // Deserialize state from saved object
        const { title } = savedAgenticObservability;

        // Update browser title and breadcrumbs
        chrome.docTitle.change(title);
        chrome.setBreadcrumbs([{ text: 'Agentic Observability', href: '#/' }, { text: title }]);

        // Sync query from saved object to data plugin (agentic observability doesn't use filters)
        const searchSourceFields = savedAgenticObservability.kibanaSavedObjectMeta;
        const queryFromUrl = services.osdUrlStateStorage?.get('_q') ?? {};
        if (searchSourceFields?.searchSourceJSON) {
          const searchSource = JSON.parse(searchSourceFields.searchSourceJSON);
          const queryFromSavedSearch = searchSource.query;
          const query = {
            ...queryFromSavedSearch,
            ...queryFromUrl,
            query: queryFromUrl.query || queryFromSavedSearch.query,
          };
          if (query) {
            dispatch(setQueryState(query));
            setEditorText(query.query);
          }
        }

        // Update savedSearch to store just the ID (like discover)
        // TODO: remove this once legacy state is not consumed any more
        dispatch(setSavedSearch(savedAgenticObservability.id));

        // Init vis state and ui state
        const visualization = savedAgenticObservability.visualization;
        const uiState = savedAgenticObservability.uiState;
        if (visualization) {
          const { chartType, params, axesMapping } = JSON.parse(visualization);
          visualizationBuilder.setVisConfig({ type: chartType, styles: params, axesMapping });
        }
        if (uiState) {
          const { activeTab } = JSON.parse(uiState);
          dispatch(setActiveTab(activeTab));
        }

        // Add to recently accessed
        chrome.recentlyAccessed.add(
          `/app/agenticObservability/${
            savedAgenticObservability.type ?? AgenticObservabilityFlavor.Traces
          }#/view/${savedAgenticObservability.id}`,
          title,
          savedAgenticObservability.id,
          { type: 'agenticObservability' }
        );

        dispatch(clearLastExecutedData());
        dispatch(setEditorMode(EditorMode.Query));
        dispatch(clearResults());
        dispatch(clearQueryStatusMap());
        dispatch(setUsingRegexPatterns(false));
        dispatch(executeQueries({ services }));
      }
    }
    if (error) {
      // Navigate to management page for invalid IDs
      // TODO: need to confirm the UI behavior for invalid ID, the current logic is copied from useSavedAgenticObservability hook
      if (error.includes('Not found')) {
        chrome.setBreadcrumbs([{ text: 'Agentic Observability', href: '#/' }, { text: 'Error' }]);
      }
    }
  }, [
    chrome,
    data.query.queryString,
    dispatch,
    error,
    savedAgenticObservability,
    services,
    setEditorText,
    visualizationBuilder,
  ]);

  const pageContext = { savedAgenticObservability };

  return pageContext;
};
