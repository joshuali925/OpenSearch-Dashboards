/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';
import { capabilitiesProvider } from './capabilities_provider';
import { agentTracesSavedObjectType } from './saved_objects';
import { agentTracesUiSettings } from './agent_traces_ui_settings';

import { AgentTracesPluginSetup, AgentTracesPluginStart } from './types';

export class AgentTracesPlugin implements Plugin<AgentTracesPluginSetup, AgentTracesPluginStart> {
  private readonly logger: Logger;

  // @ts-ignore
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('agentTraces: Setup');

    core.capabilities.registerProvider(capabilitiesProvider);

    core.capabilities.registerSwitcher(async (request, capabilites) => {
      return await core.security.readonlyService().hideForReadonly(request, capabilites, {
        agentTraces: {
          createShortUrl: false,
          save: false,
          saveQuery: false,
        },
      });
    });
    // core.uiSettings.register(uiSettings);
    core.uiSettings.register(agentTracesUiSettings);
    core.savedObjects.registerType(agentTracesSavedObjectType);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
