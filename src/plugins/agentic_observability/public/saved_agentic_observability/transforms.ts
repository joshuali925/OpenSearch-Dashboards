/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { DataView as Dataset, IndexPattern } from 'src/plugins/data/common';
import { InvalidJSONProperty } from '../../../opensearch_dashboards_utils/public';
import { LegacyState } from '../application/utils/state_management/slices';
import {
  SavedAgenticObservability,
  SavedAgenticObservabilityAttributes,
} from '../types/saved_agentic_observability_types';
import { TabDefinition } from '../services/tab_registry/tab_registry_service';
import {
  ChartType,
  StyleOptions,
} from '../components/visualizations/utils/use_visualization_types';

export interface AgenticObservabilityState {
  legacy: LegacyState;
  ui: Record<string, unknown>; // UI state for panels, layout, etc.
  query: Record<string, unknown>; // Query state for filters, time range, etc.
}

interface VisState {
  chartType?: ChartType;
  styleOptions?: StyleOptions;
  axesMapping?: Record<string, string>;
}

export const saveStateToSavedObject = (
  obj: SavedAgenticObservability,
  flavorId: string,
  tabDefinition: TabDefinition,
  visState?: VisState,
  dataset?: IndexPattern | Dataset,
  activeTabId?: string
): SavedAgenticObservability => {
  // Serialize the state into the saved object
  obj.type = flavorId;
  obj.visualization = JSON.stringify({
    // TODO: Add title to saved object
    // Visualization has an independent title?
    title: '',
    chartType: visState?.chartType ?? 'line',
    params: visState?.styleOptions ?? {},
    axesMapping: visState?.axesMapping,
  });

  obj.uiState = JSON.stringify({
    activeTab: activeTabId || tabDefinition.id,
  });
  obj.searchSourceFields = { index: dataset };

  obj.version = 1;

  return obj;
};

export interface AgenticObservabilitySavedVis
  extends Pick<SavedAgenticObservabilityAttributes, 'title' | 'description'> {
  id?: string;
  state: AgenticObservabilityState;
  searchSourceFields?: Record<string, unknown>;
}

export const getStateFromSavedObject = (
  obj: SavedAgenticObservabilityAttributes
): AgenticObservabilitySavedVis => {
  const { id, title, description, kibanaSavedObjectMeta } = obj;

  try {
    const legacyState = JSON.parse(obj.legacyState || '{}') as LegacyState;
    const uiState = JSON.parse(obj.uiState || '{}');
    const queryState = JSON.parse(obj.queryState || '{}');

    return {
      id,
      title,
      description,
      searchSourceFields: kibanaSavedObjectMeta,
      state: {
        legacy: legacyState,
        ui: uiState,
        query: queryState,
      },
    };
  } catch (error) {
    throw new InvalidJSONProperty(
      i18n.translate('agenticObservability.getStateFromSavedObject.genericJSONError', {
        defaultMessage:
          'Something went wrong while loading your saved object. The object may be corrupted or does not match the latest schema',
      })
    );
  }
};

// Helper function to extract legacy properties from serialized state
export const getLegacyPropertiesFromSavedObject = (
  savedAgenticObservability: SavedAgenticObservability
) => {
  if (!savedAgenticObservability.legacyState) {
    return {
      columns: [],
      sort: [],
    };
  }

  try {
    const legacyState = JSON.parse(savedAgenticObservability.legacyState) as LegacyState;
    return {
      columns: legacyState.columns || [],
      sort: legacyState.sort || [],
    };
  } catch (error) {
    return {
      columns: [],
      sort: [],
    };
  }
};

// Helper function to update legacy properties in serialized state
export const updateLegacyPropertiesInSavedObject = (
  savedAgenticObservability: SavedAgenticObservability,
  updates: Partial<LegacyState>
): SavedAgenticObservability => {
  try {
    const currentLegacyState = savedAgenticObservability.legacyState
      ? (JSON.parse(savedAgenticObservability.legacyState) as LegacyState)
      : ({} as LegacyState);

    const updatedLegacyState = {
      ...currentLegacyState,
      ...updates,
    };

    savedAgenticObservability.legacyState = JSON.stringify(updatedLegacyState);
    return savedAgenticObservability;
  } catch (error) {
    return savedAgenticObservability;
  }
};
