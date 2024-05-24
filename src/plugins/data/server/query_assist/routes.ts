/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup } from 'opensearch-dashboards/server';
import { registerPplQueryAssistRoute } from './ppl_query_assist_route';

export function registerRoutes(core: CoreSetup): void {
  const router = core.http.createRouter();
  registerPplQueryAssistRoute(router);
}
