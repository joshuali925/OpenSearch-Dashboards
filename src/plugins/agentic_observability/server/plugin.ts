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
import { agenticObsSavedObjectType } from './saved_objects';
import { agenticObsUiSettings } from './agentic_observability_ui_settings';

import { AgenticObservabilityPluginSetup, AgenticObservabilityPluginStart } from './types';

export class AgenticObservabilityPlugin
  implements Plugin<AgenticObservabilityPluginSetup, AgenticObservabilityPluginStart> {
  private readonly logger: Logger;

  // @ts-ignore
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('agenticObservability: Setup');

    core.capabilities.registerProvider(capabilitiesProvider);

    // Register default agenticObservability capabilities
    core.capabilities.registerProvider(() => ({
      agenticObservability: {
        discoverTracesEnabled: false,
        discoverMetricsEnabled: false,
      },
    }));

    // Register dynamic capabilities switcher for feature flags
    // This will override the defaults with values from DynamicConfigService
    core.capabilities.registerSwitcher(async (request, capabilities) => {
      try {
        const dynamicConfigServiceStart = await core.dynamicConfigService.getStartService();
        const client = dynamicConfigServiceStart.getClient();
        const store = dynamicConfigServiceStart.getAsyncLocalStore();

        const config = await client.getConfig(
          { name: 'agenticObservability' },
          { asyncLocalStorageContext: store! }
        );

        return {
          ...capabilities,
          agenticObservability: {
            ...(capabilities.agenticObservability || {}),
            discoverTracesEnabled: config.discoverTraces?.enabled ?? false,
            discoverMetricsEnabled: config.discoverMetrics?.enabled ?? false,
          },
        };
      } catch (error) {
        this.logger.error(
          'Failed to load agenticObservability dynamic config, using defaults',
          error
        );
        // Keep defaults from provider (false for both flags)
        return capabilities;
      }
    });

    core.capabilities.registerSwitcher(async (request, capabilites) => {
      return await core.security.readonlyService().hideForReadonly(request, capabilites, {
        discover: {
          createShortUrl: false,
          save: false,
          saveQuery: false,
        },
      });
    });
    // core.uiSettings.register(uiSettings);
    core.uiSettings.register(agenticObsUiSettings);
    core.savedObjects.registerType(agenticObsSavedObjectType);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
