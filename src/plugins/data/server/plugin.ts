/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { DataSourcePluginSetup } from 'src/plugins/data_source/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { ConfigSchema } from '../config';
import { AutocompleteService } from './autocomplete';
import { DqlTelemetryService } from './dql_telemetry';
import { FieldFormatsService, FieldFormatsSetup, FieldFormatsStart } from './field_formats';
import { IndexPatternsService, IndexPatternsServiceStart } from './index_patterns';
import { QueryService } from './query/query_service';
import { QueryAssistService } from './query_assist';
import { ScriptsService } from './scripts';
import { ISearchSetup, ISearchStart, SearchEnhancements } from './search';
import { SearchService } from './search/search_service';
import { getUiSettings } from './ui_settings';

export interface DataEnhancements {
  search: SearchEnhancements;
}

export interface DataPluginSetup {
  search: ISearchSetup;
  fieldFormats: FieldFormatsSetup;
  /**
   * @internal
   */
  __enhance: (enhancements: DataEnhancements) => void;
}

export interface DataPluginStart {
  search: ISearchStart;
  fieldFormats: FieldFormatsStart;
  indexPatterns: IndexPatternsServiceStart;
}

export interface DataPluginSetupDependencies {
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
  dataSource?: DataSourcePluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataPluginStartDependencies {}

export class DataServerPlugin
  implements
    Plugin<
      DataPluginSetup,
      DataPluginStart,
      DataPluginSetupDependencies,
      DataPluginStartDependencies
    > {
  private readonly searchService: SearchService;
  private readonly scriptsService: ScriptsService;
  private readonly dqlTelemetryService: DqlTelemetryService;
  private readonly autocompleteService: AutocompleteService;
  private readonly queryAssistService: QueryAssistService;
  private readonly indexPatterns = new IndexPatternsService();
  private readonly fieldFormats = new FieldFormatsService();
  private readonly queryService = new QueryService();
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.logger = initializerContext.logger.get('data');
    this.searchService = new SearchService(initializerContext, this.logger);
    this.scriptsService = new ScriptsService();
    this.dqlTelemetryService = new DqlTelemetryService(initializerContext);
    this.autocompleteService = new AutocompleteService(initializerContext);
    this.queryAssistService = new QueryAssistService(initializerContext);
  }

  public async setup(
    core: CoreSetup<DataPluginStartDependencies, DataPluginStart>,
    { expressions, usageCollection, dataSource }: DataPluginSetupDependencies
  ) {
    this.indexPatterns.setup(core);
    this.scriptsService.setup(core);
    this.queryService.setup(core);
    this.autocompleteService.setup(core);
    this.dqlTelemetryService.setup(core, { usageCollection });
    this.queryAssistService.setup(core);

    core.uiSettings.register(getUiSettings());

    const searchSetup = await this.searchService.setup(core, {
      registerFunction: expressions.registerFunction,
      usageCollection,
      dataSource,
    });

    return {
      __enhance: (enhancements: DataEnhancements) => {
        searchSetup.__enhance(enhancements.search);
      },
      search: searchSetup,
      fieldFormats: this.fieldFormats.setup(),
    };
  }

  public start(core: CoreStart) {
    const fieldFormats = this.fieldFormats.start();
    const indexPatterns = this.indexPatterns.start(core, {
      fieldFormats,
      logger: this.logger.get('indexPatterns'),
    });

    return {
      fieldFormats,
      indexPatterns,
      search: this.searchService.start(core, { fieldFormats, indexPatterns }),
    };
  }

  public stop() {
    this.searchService.stop();
  }
}

export { DataServerPlugin as Plugin };
