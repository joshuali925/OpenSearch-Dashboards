/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { TracesTab } from './pages/traces/traces_tab';
import { TabDefinition, TabRegistryService } from '../services/tab_registry/tab_registry_service';
import { AgentTracesServices } from '../types';
import {
  AgentTracesFlavor,
  AGENT_TRACES_DEFAULT_LANGUAGE,
  AGENT_TRACES_TRACES_TAB_ID,
} from '../../common';
import { defaultPrepareQueryString } from './utils/state_management/actions/query_actions';

/**
 * Registers built-in tabs with the tab registry
 * Agent Traces only supports Traces
 */
export const registerBuiltInTabs = (tabRegistry: TabRegistryService) => {
  // Register Traces Tab
  const tracesTabDefinition: TabDefinition = {
    id: AGENT_TRACES_TRACES_TAB_ID,
    label: i18n.translate('agentTraces.tracesTab.label', {
      defaultMessage: 'Traces',
    }),
    flavor: [AgentTracesFlavor.Traces],
    order: 10,
    supportedLanguages: [AGENT_TRACES_DEFAULT_LANGUAGE],

    // Filter to only gen_ai spans for agent traces
    prepareQuery: (query) => {
      const baseQuery = defaultPrepareQueryString(query);
      return `${baseQuery} | where parentSpanId = "" AND isnotnull(\`attributes.gen_ai.operation.name\`)`;
    },

    component: TracesTab,
  };
  tabRegistry.registerTab(tracesTabDefinition);
};

/**
 * Register tabs in the application
 * This is the main entry point for tab registration
 */
export const registerTabs = (services: AgentTracesServices) => {
  // Register built-in tabs
  registerBuiltInTabs(services.tabRegistry);

  // Register plugin-provided tabs
  const pluginTabs = (services as any).plugins?.agentTraces?.getTabs?.() || [];

  pluginTabs.forEach(
    (tabDefinition: import('../services/tab_registry/tab_registry_service').TabDefinition) => {
      services.tabRegistry.registerTab(tabDefinition);
    }
  );
};
