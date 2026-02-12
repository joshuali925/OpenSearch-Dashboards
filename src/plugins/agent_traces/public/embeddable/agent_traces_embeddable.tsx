/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { isEqual } from 'lodash';
import moment from 'moment';
import { merge, Subscription } from 'rxjs';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { i18n } from '@osd/i18n';
import { RequestAdapter, Adapters } from '../../../inspector/public';
import {
  opensearchFilters,
  Filter,
  TimeRange,
  FilterManager,
  getTime,
  Query,
  UI_SETTINGS,
  IFieldType,
} from '../../../data/public';
import { Container, Embeddable, IEmbeddable } from '../../../embeddable/public';
import { AgentTracesInput, AgentTracesOutput } from './types';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
  getServices,
  IndexPattern,
  ISearchSource,
} from '../application/legacy/discover/opensearch_dashboards_services';
import { AGENT_TRACES_EMBEDDABLE_TYPE } from './constants';
import { SortOrder } from '../types/saved_agent_traces_types';
import { SavedAgentTraces } from '../saved_agent_traces';
import { AgentTracesEmbeddableComponent } from './agent_traces_embeddable_component';
import { AgentTracesServices } from '../types';
import { ExpressionRendererEvent, ExpressionRenderError } from '../../../expressions/public';
import { VisColumn } from '../components/visualizations/types';
import { toExpression } from '../components/visualizations/utils/to_expression';
import { DOC_HIDE_TIME_COLUMN_SETTING, SAMPLE_SIZE_SETTING } from '../../common';
import * as columnActions from '../application/legacy/discover/application/utils/state_management/common';
import { buildColumns } from '../application/legacy/discover/application/utils/columns';
import { UiActionsStart, APPLY_FILTER_TRIGGER } from '../../../ui_actions/public';
import {
  ChartType,
  StyleOptions,
} from '../components/visualizations/utils/use_visualization_types';
import { defaultPrepareQueryString } from '../application/utils/state_management/actions/query_actions';
import {
  adaptLegacyData,
  convertStringsToMappings,
} from '../components/visualizations/visualization_builder_utils';
import { normalizeResultRows } from '../components/visualizations/utils/normalize_result_rows';
import { visualizationRegistry } from '../components/visualizations/visualization_registry';
import { prepareQueryForLanguage } from '../application/utils/languages';
import { mergeStyles } from '../components/visualizations/utils/utils';

export interface SearchProps {
  description?: string;
  sort?: SortOrder[];
  inspectorAdapters?: Adapters;
  rows?: any[];
  indexPattern?: IndexPattern;
  hits?: number;
  isLoading?: boolean;
  services: AgentTracesServices;
  spec?: any;
  expression?: string;
  sharedItemTitle?: string;
  searchContext?: {
    query: Query | undefined;
    filters: Filter[] | undefined;
    timeRange: TimeRange | undefined;
  };
  chartType?: ChartType;
  activeTab?: string;
  styleOptions?: StyleOptions;
  displayTimeColumn: boolean;
  title: string;
  columns?: string[];
  onSort?: (sort: SortOrder[]) => void;
  onAddColumn?: (column: string) => void;
  onRemoveColumn?: (column: string) => void;
  onReorderColumn?: (col: string, source: number, destination: number) => void;
  onMoveColumn?: (column: string, index: number) => void;
  onSetColumns?: (columns: string[]) => void;
  onFilter?: (field: IFieldType, value: string[], operator: string) => void;
  onExpressionEvent?: (e: ExpressionRendererEvent) => void;
  onSelectTimeRange?: (range: TimeRange) => void;
  tableData?: {
    rows: Array<Record<string, any>>;
    columns: VisColumn[];
  };
}

interface AgentTracesEmbeddableConfig {
  savedAgentTraces: SavedAgentTraces;
  editUrl: string;
  editPath: string;
  indexPatterns?: IndexPattern[];
  editable: boolean;
  filterManager: FilterManager;
  services: AgentTracesServices;
  editApp: string;
}

export class AgentTracesEmbeddable
  extends Embeddable<AgentTracesInput, AgentTracesOutput>
  implements IEmbeddable<AgentTracesInput, AgentTracesOutput> {
  private abortController?: AbortController;
  private readonly savedAgentTraces: SavedAgentTraces;
  private inspectorAdaptors: Adapters;
  private searchProps?: SearchProps;
  private filtersSearchSource?: ISearchSource;
  private subscription: Subscription;
  private autoRefreshFetchSubscription?: Subscription;
  public readonly type = AGENT_TRACES_EMBEDDABLE_TYPE;
  private panelTitle: string = '';
  private filterManager: FilterManager;
  private services: AgentTracesServices;
  private prevState = {
    filters: undefined as Filter[] | undefined,
    query: undefined as Query | undefined,
    timeRange: undefined as TimeRange | undefined,
  };
  private node?: HTMLElement;
  private root?: Root;

  constructor(
    {
      savedAgentTraces,
      editUrl,
      editPath,
      indexPatterns,
      editable,
      filterManager,
      services,
      editApp,
    }: AgentTracesEmbeddableConfig,
    initialInput: AgentTracesInput,
    private readonly executeTriggerActions: UiActionsStart['executeTriggerActions'],
    parent?: Container
  ) {
    super(
      initialInput,
      {
        defaultTitle: savedAgentTraces.title,
        editUrl,
        editPath,
        editApp,
        indexPatterns,
        editable,
      },
      parent
    );
    this.services = services;
    this.filterManager = filterManager;
    this.savedAgentTraces = savedAgentTraces;
    this.inspectorAdaptors = {
      requests: new RequestAdapter(),
    };
    this.initializeSearchProps();

    this.subscription = merge(this.getOutput$(), this.getInput$()).subscribe(() => {
      this.panelTitle = this.output.title || '';
      if (this.searchProps) {
        this.updateHandler(this.searchProps);
      }
    });
    this.autoRefreshFetchSubscription = getServices()
      .timefilter.getAutoRefreshFetch$()
      .subscribe(() => {
        if (this.searchProps) {
          this.updateHandler(this.searchProps, true);
        }
      });
  }

  private initializeSearchProps() {
    const { searchSource } = this.savedAgentTraces;
    const indexPattern = searchSource.getField('index');
    const searchProps: SearchProps = {
      inspectorAdapters: this.inspectorAdaptors,
      rows: [],
      description: this.savedAgentTraces.description,
      services: this.services,
      indexPattern,
      isLoading: false,
      displayTimeColumn: this.services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
      title: this.savedAgentTraces.title,
    };
    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchProps || !this.input.timeRange) return;
      return getTime(indexPattern, this.input.timeRange);
    });
    this.filtersSearchSource = searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);
    searchSource.setParent(this.filtersSearchSource);
    const query = this.savedAgentTraces.searchSource.getField('query');
    const uiState = JSON.parse(this.savedAgentTraces.uiState || '{}');
    const activeTab = uiState.activeTab;
    if (query) {
      // If the active tab is logs, we need to prepare the query for the logs tab
      if (activeTab === 'logs') {
        query.query = defaultPrepareQueryString(query);
      } else {
        query.query = prepareQueryForLanguage(query).query;
      }
    }
    searchSource.setFields({
      index: indexPattern,
      query,
      highlightAll: true,
      version: true,
    });

    searchProps.onSort = (newSort) => {
      this.updateInput({ sort: newSort });
    };

    searchProps.onAddColumn = (columnName: string) => {
      if (!searchProps.columns) {
        return;
      }
      const updatedColumns = buildColumns(
        columnActions.addColumn(searchProps.columns, { column: columnName })
      );
      this.updateInput({ columns: updatedColumns });
    };

    searchProps.onRemoveColumn = (columnName: string) => {
      if (!searchProps.columns) {
        return;
      }
      const updatedColumns = columnActions.removeColumn(searchProps.columns, columnName);
      const updatedSort =
        searchProps.sort && searchProps.sort.length
          ? searchProps.sort.filter((s) => s[0] !== columnName)
          : [];
      this.updateInput({ sort: updatedSort, columns: updatedColumns });
    };

    searchProps.onMoveColumn = (columnName, newIndex: number) => {
      if (!searchProps.columns) {
        return;
      }
      const oldIndex = searchProps.columns.indexOf(columnName);
      const updatedColumns = columnActions.reorderColumn(searchProps.columns, oldIndex, newIndex);
      this.updateInput({ columns: updatedColumns });
    };

    searchProps.onSetColumns = (columnNames: string[]) => {
      const columns = buildColumns(columnNames);
      this.updateInput({ columns });
    };

    searchProps.onFilter = async (field, value, operator) => {
      let filters = opensearchFilters.generateFilters(
        this.filterManager,
        field,
        value,
        operator,
        indexPattern?.id!
      );
      filters = filters.map((filter) => ({
        ...filter,
        $state: { store: opensearchFilters.FilterStateStore.APP_STATE },
      }));
      await this.executeTriggerActions(APPLY_FILTER_TRIGGER, {
        embeddable: this,
        filters,
      });
    };

    searchProps.onExpressionEvent = async (e: ExpressionRendererEvent) => {
      if (e.name === 'applyFilter') {
        await this.executeTriggerActions(APPLY_FILTER_TRIGGER, {
          embeddable: this,
          ...e.data,
        });
      }
    };

    searchProps.onSelectTimeRange = async (range: TimeRange) => {
      await this.executeTriggerActions(APPLY_FILTER_TRIGGER, {
        embeddable: this,
        filters: [
          {
            range: {
              '*': {
                mode: 'absolute',
                gte: moment(range.from),
                lte: moment(range.to),
              },
            },
          },
        ],
        timeFieldName: '*',
      });
    };

    this.updateHandler(searchProps);
  }

  private async updateHandler(searchProps: SearchProps, force = false) {
    const { filters, query, timeRange } = this.input;
    const needFetch =
      force ||
      !opensearchFilters.onlyDisabledFiltersChanged(filters, this.prevState.filters) ||
      !isEqual(query, this.prevState.query) ||
      !isEqual(timeRange, this.prevState.timeRange);

    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchProps.columns = this.input.columns || this.savedAgentTraces.columns;
    searchProps.sort = this.input.sort || this.savedAgentTraces.sort;
    searchProps.sharedItemTitle = this.panelTitle;

    if (needFetch) {
      this.prevState = { filters, query, timeRange };
      this.searchProps = searchProps;
      try {
        await this.fetch();
      } catch (error: any) {
        this.updateOutput({
          loading: false,
          error: {
            name: error?.body?.error,
            message: error?.body?.message,
          },
        });
        throw error;
      }
    } else if (searchProps) {
      this.searchProps = searchProps;
    }
    if (this.node && this.searchProps) {
      this.renderComponent(this.node, this.searchProps);
    }
  }

  public reload() {
    if (this.searchProps) {
      this.updateHandler(this.searchProps, true);
    }
  }

  private fetch = async () => {
    if (!this.searchProps) return;
    const { searchSource } = this.savedAgentTraces;
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    searchSource.setField('size', getServices().uiSettings.get(SAMPLE_SIZE_SETTING));

    this.inspectorAdaptors.requests.reset();
    const title = i18n.translate('agentTraces.embeddable.inspectorRequestDataTitle', {
      defaultMessage: 'Data',
    });
    const description = i18n.translate('agentTraces.embeddable.inspectorRequestDescription', {
      defaultMessage: 'This request queries OpenSearch to fetch the data for the agent traces.',
    });
    const inspectorRequest = this.inspectorAdaptors.requests.start(title, { description });
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then((body: Record<string, unknown>) => {
      inspectorRequest.json(body);
    });
    this.updateOutput({ loading: true, error: undefined });
    this.searchProps.isLoading = true;
    const query = searchSource.getField('query');
    const languageConfig = this.services.data.query.queryString
      .getLanguageService()
      .getLanguage(query!.language);
    const resp = await searchSource.fetch({
      abortSignal: this.abortController.signal,
      withLongNumeralsSupport: await getServices().uiSettings.get(
        UI_SETTINGS.DATA_WITH_LONG_NUMERALS
      ),
      ...(languageConfig &&
        languageConfig.fields?.formatter && {
          formatter: languageConfig.fields.formatter,
        }),
    });
    const rows = resp.hits.hits;
    const fieldSchema = searchSource.getDataFrame()?.schema;
    const visualizationData = normalizeResultRows(rows, fieldSchema ?? []);

    // TODO: Confirm if tab is in visualization but visualization is null, what to display?
    // const displayVis = rows?.length > 0 && visualizationData && visualizationData.ruleId;
    const visualization = JSON.parse(this.savedAgentTraces.visualization || '{}');
    const uiState = JSON.parse(this.savedAgentTraces.uiState || '{}');
    const selectedChartType = visualization.chartType ?? 'line';
    const vis = visualizationRegistry.getVisualizationConfig(selectedChartType);
    this.searchProps.chartType = selectedChartType;
    this.searchProps.activeTab = uiState.activeTab;
    this.searchProps.styleOptions = visualization.params;
    if (uiState.activeTab !== 'logs' && visualizationData) {
      const { numericalColumns, categoricalColumns, dateColumns } = visualizationData;
      const allColumns = [
        ...(numericalColumns ?? []),
        ...(categoricalColumns ?? []),
        ...(dateColumns ?? []),
      ];

      // Check if there's data to visualize
      if (visualizationData.transformedData && visualizationData.transformedData.length > 0) {
        if (selectedChartType === 'table') {
          this.searchProps.tableData = {
            columns: allColumns,
            rows: visualizationData.transformedData ?? [],
          };
        } else {
          const axesMapping = convertStringsToMappings(visualization.axesMapping, allColumns);
          const matchedRule = visualizationRegistry.findRuleByAxesMapping(
            visualization.axesMapping,
            allColumns
          );
          if (!matchedRule || !matchedRule.toSpec) {
            throw new Error(
              `Cannot load saved visualization "${this.panelTitle}" with id ${this.savedAgentTraces.id}`
            );
          }
          const searchContext = {
            query: this.input.query,
            filters: this.input.filters,
            timeRange: this.input.timeRange,
          };
          this.searchProps.searchContext = searchContext;
          const styleOptions = visualization.params;

          let styles = adaptLegacyData({
            type: selectedChartType,
            styles: styleOptions,
            axesMapping: visualization.axesMapping,
          })?.styles;

          if (vis) {
            styles = mergeStyles(vis.ui.style.defaults, styles);
          }
          this.searchProps.styleOptions = styles;

          const spec = matchedRule.toSpec(
            visualizationData.transformedData,
            numericalColumns,
            categoricalColumns,
            dateColumns,
            styles || styleOptions,
            selectedChartType,
            axesMapping,
            searchContext.timeRange
          );
          this.searchProps.spec = spec;
          const exp = toExpression(searchContext, spec);
          this.searchProps.expression = exp;
        }
      }
    }
    this.updateOutput({ loading: false, error: undefined });
    inspectorRequest.stats(getResponseInspectorStats(resp, searchSource)).ok({ json: resp });
    this.searchProps.rows = rows;
    // NOTE: PPL response is not the same as OpenSearch response, resp.hits.total here is 0.
    this.searchProps.hits = resp.hits.hits.length;
    this.searchProps.isLoading = false;
  };

  private renderComponent(node: HTMLElement, searchProps: SearchProps) {
    if (!this.searchProps || !this.root) return;
    const MemorizedAgentTracesEmbeddableComponent = React.memo(AgentTracesEmbeddableComponent);
    this.root.render(<MemorizedAgentTracesEmbeddableComponent searchProps={searchProps} />);
  }

  public destroy() {
    super.destroy();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    if (this.autoRefreshFetchSubscription) {
      this.autoRefreshFetchSubscription.unsubscribe();
    }

    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.searchProps) {
      delete this.searchProps;
    }
    if (this.root) {
      this.root.unmount();
    }
  }

  onContainerError = (error: ExpressionRenderError) => {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.renderComplete.dispatchError();
    this.updateOutput({ loading: false, error });
  };

  public render(node: HTMLElement) {
    if (!this.searchProps) {
      throw new Error('Search scope not defined');
    }
    if (this.root) {
      this.root.unmount();
    }
    this.node = node;
    this.node.style.height = '100%';
    this.root = createRoot(node);
  }

  public getInspectorAdapters() {
    return this.inspectorAdaptors;
  }
}
