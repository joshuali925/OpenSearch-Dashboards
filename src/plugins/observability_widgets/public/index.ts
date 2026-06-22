/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ObservabilityWidgetsPlugin } from './plugin';

export function plugin() {
  return new ObservabilityWidgetsPlugin();
}

export { ObservabilityWidgetsPluginSetup, ObservabilityWidgetsPluginStart } from './types';
