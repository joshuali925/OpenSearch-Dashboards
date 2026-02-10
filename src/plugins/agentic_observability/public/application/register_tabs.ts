/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { LogsTab } from '../components/tabs/logs_tab';
import { TabDefinition, TabRegistryService } from '../services/tab_registry/tab_registry_service';
import { ExploreServices } from '../types';
import {
  ExploreFlavor,
  EXPLORE_DEFAULT_LANGUAGE,
  EXPLORE_LOGS_TAB_ID,
  EXPLORE_VISUALIZATION_TAB_ID,
} from '../../common';
import { VisTab } from '../components/tabs/vis_tab';
import { prepareQueryForLanguage } from './utils/languages';
import { defaultPrepareQueryString } from './utils/state_management/actions/query_actions';

/**
 * Registers built-in tabs with the tab registry
 * Agentic Observability only supports Traces
 */
export const registerBuiltInTabs = (tabRegistry: TabRegistryService) => {
  // Register Traces Tab (LogsTab handles Traces flavor internally with TracesTable)
  const tracesTabDefinition: TabDefinition = {
    id: EXPLORE_LOGS_TAB_ID,
    label: i18n.translate('agenticObservability.tracesTab.label', {
      defaultMessage: 'Traces',
    }),
    flavor: [ExploreFlavor.Traces],
    order: 10,
    supportedLanguages: [EXPLORE_DEFAULT_LANGUAGE],

    // Filter to only gen_ai spans for agentic observability
    prepareQuery: (query) => {
      const baseQuery = defaultPrepareQueryString(query);
      return `${baseQuery} | where isnotnull(\`attributes.gen_ai.operation.name\`)`;
    },

    component: LogsTab,
  };
  tabRegistry.registerTab(tracesTabDefinition);

  // Register Visualizations Tab
  tabRegistry.registerTab({
    id: EXPLORE_VISUALIZATION_TAB_ID,
    label: i18n.translate('agenticObservability.visualizationTab.label', {
      defaultMessage: 'Visualization',
    }),
    flavor: [ExploreFlavor.Traces],
    order: 20,
    supportedLanguages: [EXPLORE_DEFAULT_LANGUAGE],

    // Prepare query based on language
    prepareQuery: (query) => {
      const preparedQuery = prepareQueryForLanguage(query);
      return preparedQuery.query;
    },

    component: VisTab,
  });
};

/**
 * Register tabs in the application
 * This is the main entry point for tab registration
 */
export const registerTabs = (services: ExploreServices) => {
  // Register built-in tabs
  registerBuiltInTabs(services.tabRegistry);

  // Register plugin-provided tabs
  const pluginTabs = (services as any).plugins?.explore?.getTabs?.() || [];

  pluginTabs.forEach(
    (tabDefinition: import('../services/tab_registry/tab_registry_service').TabDefinition) => {
      services.tabRegistry.registerTab(tabDefinition);
    }
  );
};
