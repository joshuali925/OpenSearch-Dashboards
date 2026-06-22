/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreStart } from '../../../core/public';
import { NavigationPublicPluginStart } from '../../navigation/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityWidgetsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityWidgetsPluginStart {}

export interface ObservabilityWidgetsPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

/** Services threaded into the React tree via OpenSearchDashboardsContextProvider. */
export type ObservabilityWidgetsServices = CoreStart;
