/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'opensearch-dashboards/server';
import { first } from 'rxjs/operators';
import { ConfigSchema } from '../../config';
import { registerRoutes } from './routes';

export class QueryAssistService implements Plugin<void> {
  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(core: CoreSetup) {
    core.http.registerRouteHandlerContext('query_assist', async () => ({
      configPromise: await this.initializerContext.config
        .create<ConfigSchema>()
        .pipe(first())
        .toPromise(),
      logger: this.initializerContext.logger.get('data', 'query-assist'),
    }));

    registerRoutes(core);
  }

  public start() {}
}
