import moment from 'moment';
import React from 'react';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '../../../src/core/public';
import { IStorageWrapper, Storage } from '../../../src/plugins/opensearch_dashboards_utils/public';
import { ConfigSchema } from '../common/config';
import { QueryAssistBar } from './query_assist/query_assist_bar';
import { PPLQlSearchInterceptor } from './search/ppl_search_interceptor';
import { SQLQlSearchInterceptor } from './search/sql_search_interceptor';
import { setCore, setData, setStorage } from './services';
import {
  QueryEnhancementsPluginSetup,
  QueryEnhancementsPluginSetupDependencies,
  QueryEnhancementsPluginStart,
  QueryEnhancementsPluginStartDependencies,
} from './types';

export class QueryEnhancementsPlugin
  implements Plugin<QueryEnhancementsPluginSetup, QueryEnhancementsPluginStart> {
  private readonly storage: IStorageWrapper;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.storage = new Storage(window.localStorage);
  }

  public setup(
    core: CoreSetup,
    { data }: QueryEnhancementsPluginSetupDependencies
  ): QueryEnhancementsPluginSetup {
    const pplSearchInterceptor = new PPLQlSearchInterceptor({
      toasts: core.notifications.toasts,
      http: core.http,
      uiSettings: core.uiSettings,
      startServices: core.getStartServices(),
      usageCollector: data.search.usageCollector,
    });

    const sqlSearchInterceptor = new SQLQlSearchInterceptor({
      toasts: core.notifications.toasts,
      http: core.http,
      uiSettings: core.uiSettings,
      startServices: core.getStartServices(),
      usageCollector: data.search.usageCollector,
    });

    data.__enhance({
      ui: {
        query: {
          language: 'PPL',
          search: pplSearchInterceptor,
          searchBar: {
            queryStringInput: { initialValue: 'source=<data_source>' },
            dateRange: {
              initialFrom: moment().subtract(2, 'days').toISOString(),
              initialTo: moment().add(2, 'days').toISOString(),
            },
            showFilterBar: false,
            extensions: [
              {
                id: 'query-assist',
                order: 1000,
                isEnabled: (() => {
                  let agentConfigured: boolean;
                  return async () => {
                    if (agentConfigured === undefined) {
                      agentConfigured = await core.http
                        .get<{ configured: boolean }>('/api/ql/query_assist/ppl/configured')
                        .then((response) => response.configured)
                        .catch(() => false);
                    }
                    return agentConfigured;
                  };
                })(),
                getComponent: (dependencies) => <QueryAssistBar dependencies={dependencies} />,
              },
            ],
          },
          fields: {
            visualizable: false,
          },
          supportedAppNames: ['discover'],
        },
      },
    });

    data.__enhance({
      ui: {
        query: {
          language: 'SQL',
          search: sqlSearchInterceptor,
          searchBar: {
            showDatePicker: false,
            showFilterBar: false,
            queryStringInput: { initialValue: 'SELECT * FROM <data_source>' },
          },
          fields: {
            filterable: false,
            visualizable: false,
          },
          showDocLinks: false,
          supportedAppNames: ['discover'],
        },
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    deps: QueryEnhancementsPluginStartDependencies
  ): QueryEnhancementsPluginStart {
    setCore(core);
    setData(deps.data);
    setStorage(this.storage);
    return {};
  }

  public stop() {}
}
