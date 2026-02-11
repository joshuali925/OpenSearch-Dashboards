/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { LogsTab } from '../components/tabs/logs_tab';
import { TabDefinition, TabRegistryService } from '../services/tab_registry/tab_registry_service';
import { AgenticObservabilityServices } from '../types';
import {
  AgenticObservabilityFlavor,
  AGENTIC_OBSERVABILITY_DEFAULT_LANGUAGE,
  AGENTIC_OBSERVABILITY_LOGS_TAB_ID,
} from '../../common';
import { defaultPrepareQueryString } from './utils/state_management/actions/query_actions';

/**
 * Registers built-in tabs with the tab registry
 * Agentic Observability only supports Traces
 */
export const registerBuiltInTabs = (tabRegistry: TabRegistryService) => {
  // Register Traces Tab (LogsTab handles Traces flavor internally with TracesTable)
  const tracesTabDefinition: TabDefinition = {
    id: AGENTIC_OBSERVABILITY_LOGS_TAB_ID,
    label: i18n.translate('agenticObservability.tracesTab.label', {
      defaultMessage: 'Traces',
    }),
    flavor: [AgenticObservabilityFlavor.Traces],
    order: 10,
    supportedLanguages: [AGENTIC_OBSERVABILITY_DEFAULT_LANGUAGE],

    // Filter to only gen_ai spans for agentic observability
    prepareQuery: (query) => {
      const baseQuery = defaultPrepareQueryString(query);
      return `${baseQuery} | where parentSpanId = "" AND isnotnull(\`attributes.gen_ai.operation.name\`)`;
    },

    component: LogsTab,
  };
  tabRegistry.registerTab(tracesTabDefinition);
};

/**
 * Register tabs in the application
 * This is the main entry point for tab registration
 */
export const registerTabs = (services: AgenticObservabilityServices) => {
  // Register built-in tabs
  registerBuiltInTabs(services.tabRegistry);

  // Register plugin-provided tabs
  const pluginTabs = (services as any).plugins?.agenticObservability?.getTabs?.() || [];

  pluginTabs.forEach(
    (tabDefinition: import('../services/tab_registry/tab_registry_service').TabDefinition) => {
      services.tabRegistry.registerTab(tabDefinition);
    }
  );
};
