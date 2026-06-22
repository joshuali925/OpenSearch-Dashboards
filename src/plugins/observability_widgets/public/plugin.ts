/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  DEFAULT_NAV_GROUPS,
} from '../../../core/public';
import {
  ObservabilityWidgetsPluginSetup,
  ObservabilityWidgetsPluginStart,
  ObservabilityWidgetsPluginStartDependencies,
  ObservabilityWidgetsServices,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class ObservabilityWidgetsPlugin
  implements
    Plugin<
      ObservabilityWidgetsPluginSetup,
      ObservabilityWidgetsPluginStart,
      {},
      ObservabilityWidgetsPluginStartDependencies
    > {
  public setup(
    core: CoreSetup<ObservabilityWidgetsPluginStartDependencies>
  ): ObservabilityWidgetsPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      mount: async (params: AppMountParameters) => {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        const services: ObservabilityWidgetsServices = { ...coreStart };
        return renderApp(coreStart as CoreStart, services, params);
      },
    });

    // Surface in the observability nav group if available.
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      { id: PLUGIN_ID, title: PLUGIN_NAME, order: 9000 },
    ]);

    return {};
  }

  public start(_core: CoreStart): ObservabilityWidgetsPluginStart {
    return {};
  }

  public stop() {}
}
