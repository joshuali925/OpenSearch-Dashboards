/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DiscoverChartContainer } from './discover_chart_container';
import {
  legacyReducer,
  uiReducer,
  queryReducer,
  resultsReducer,
  queryEditorReducer,
} from '../../application/utils/state_management/slices';
import { AgentTracesFlavor } from '../../../common';
import { useFlavorId } from '../../helpers/use_flavor_id';
import { useDatasetContext } from '../../application/context/dataset_context/dataset_context';
import { QueryExecutionStatus, EditorMode } from '../../application/utils/state_management/types';

const mockUseFlavorId = useFlavorId as jest.MockedFunction<typeof useFlavorId>;
const mockUseDatasetContext = useDatasetContext as jest.MockedFunction<typeof useDatasetContext>;

// Mock the hooks and components
jest.mock('../../../../opensearch_dashboards_react/public', () => ({
  useOpenSearchDashboards: jest.fn(() => ({
    services: {
      uiSettings: {
        get: jest.fn(),
      },
      data: {
        query: {
          timefilter: {
            timefilter: {
              getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })),
            },
          },
        },
        search: {
          aggs: {
            createAggConfigs: jest.fn(),
          },
        },
      },
    },
  })),
  withOpenSearchDashboards: jest.fn((component) => component),
}));

jest.mock('../../application/context/dataset_context/dataset_context', () => ({
  useDatasetContext: jest.fn(() => ({
    dataset: {
      isTimeBased: jest.fn(() => true),
      timeFieldName: '@timestamp',
    },
  })),
}));

jest.mock('./agent_traces_traces_chart', () => ({
  AgentTracesTracesChart: ({ requestChartData }: { requestChartData: any }) => (
    <div data-test-subj="agentTraces-traces-chart">
      Traces Chart with data: {requestChartData ? 'present' : 'absent'}
    </div>
  ),
}));

jest.mock('../../helpers/use_flavor_id', () => ({
  useFlavorId: jest.fn(() => 'logs'),
}));

jest.mock('../../application/utils/state_management/actions/trace_query_actions', () => ({
  prepareTraceCacheKeys: jest.fn(() => ({
    requestCacheKey: 'trace-requests:test-query',
    errorCacheKey: 'trace-errors:test-query',
    latencyCacheKey: 'trace-latency:test-query',
  })),
}));

jest.mock('../../application/utils/state_management/actions/query_actions', () => ({
  histogramResultsProcessor: jest.fn(() => ({
    chartData: { values: [], xAxisOrderedValues: [] },
    bucketInterval: { scale: false, description: '1h' },
    hits: { total: 10 },
  })),
  defaultPrepareQueryString: jest.fn(() => 'test-cache-key'),
  prepareHistogramCacheKey: jest.fn(() => 'histogram:test-cache-key'),
  defaultResultsProcessor: jest.fn(() => ({
    hits: { hits: [], total: 10, max_score: 1.0 },
    fieldCounts: {},
  })),
  executeRequestCountQuery: jest.fn(() => ({
    type: 'query/executeRequestCountQuery/pending',
    payload: undefined,
    meta: { requestId: 'test', arg: {} },
  })),
  executeErrorCountQuery: jest.fn(() => ({
    type: 'query/executeErrorCountQuery/pending',
    payload: undefined,
    meta: { requestId: 'test', arg: {} },
  })),
  executeLatencyQuery: jest.fn(() => ({
    type: 'query/executeLatencyQuery/pending',
    payload: undefined,
    meta: { requestId: 'test', arg: {} },
  })),
}));

jest.mock(
  '../../application/utils/state_management/actions/processors/trace_aggregation_processor',
  () => ({
    processTraceAggregationResults: jest.fn(() => ({
      requestChartData: { values: [], xAxisOrderedValues: [] },
      errorChartData: { values: [], xAxisOrderedValues: [] },
      latencyChartData: { values: [], xAxisOrderedValues: [] },
      bucketInterval: { scale: false, description: '1h' },
      hits: { total: 10 },
    })),
  })
);

jest.mock('../../application/utils/state_management/actions/utils', () => ({
  createHistogramConfigWithInterval: jest.fn(() => ({
    histogramConfigs: undefined,
    aggs: {},
    effectiveInterval: '5m',
    finalInterval: '5m',
    fromDate: '2023-01-01 00:00:00.000',
    toDate: '2023-01-01 01:00:00.000',
    timeFieldName: 'endTime',
  })),
}));

describe('DiscoverChartContainer', () => {
  const createMockStore = (hasResults = true, breakdownField?: string, queryStatusMap = {}) => {
    return configureStore({
      reducer: {
        legacy: legacyReducer,
        ui: uiReducer,
        query: queryReducer,
        results: resultsReducer,
        queryEditor: queryEditorReducer,
      },
      preloadedState: {
        legacy: {
          savedSearch: undefined,
          savedQuery: undefined,
          columns: [],
          sort: [],
          interval: '1h',
          isDirty: false,
          lineCount: undefined,
        },
        ui: {
          activeTabId: 'logs',
          showHistogram: true,
        },
        query: {
          query: 'source=logs',
          language: 'PPL',
          dataset: {
            id: 'test-dataset',
            title: 'test-dataset',
            type: 'INDEX_PATTERN',
          },
        },
        queryEditor: {
          breakdownField,
          queryStatusMap,
          overallQueryStatus: {
            status: QueryExecutionStatus.READY,
            elapsedMs: 100,
            startTime: Date.now(),
          },
          editorMode: EditorMode.Query,
          promptModeIsAvailable: false,
          promptToQueryIsLoading: false,
          summaryAgentIsAvailable: false,
          lastExecutedPrompt: '',
          lastExecutedTranslatedQuery: '',
          queryExecutionButtonStatus: 'REFRESH',
          isQueryEditorDirty: false,
          hasUserInitiatedQuery: false,
        },
        results: hasResults
          ? {
              'test-cache-key': {
                elapsedMs: 100,
                took: 10,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                hits: { hits: [], total: 10, max_score: 1.0 },
                fieldSchema: [],
              },
              'histogram:test-cache-key': {
                elapsedMs: 100,
                took: 10,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                hits: { hits: [], total: 10, max_score: 1.0 },
                fieldSchema: [],
              },
              'trace-requests:test-query': {
                elapsedMs: 100,
                took: 10,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                hits: { hits: [], total: 10, max_score: 1.0 },
                fieldSchema: [],
              },
              'trace-errors:test-query': {
                elapsedMs: 100,
                took: 10,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                hits: { hits: [], total: 5, max_score: 1.0 },
                fieldSchema: [],
              },
              'trace-latency:test-query': {
                elapsedMs: 100,
                took: 10,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                hits: { hits: [], total: 10, max_score: 1.0 },
                fieldSchema: [],
              },
            }
          : {},
      },
    });
  };

  const renderComponent = (
    hasResults = true,
    flavorId = AgentTracesFlavor.Traces,
    breakdownField?: string,
    queryStatusMap = {}
  ) => {
    mockUseFlavorId.mockReturnValue(flavorId);
    const store = createMockStore(hasResults, breakdownField, queryStatusMap);
    return render(
      <Provider store={store}>
        <DiscoverChartContainer />
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders traces chart when data is available', () => {
    renderComponent(true, AgentTracesFlavor.Traces);
    expect(screen.getByTestId('agentTraces-traces-chart')).toBeInTheDocument();
  });

  it('renders traces chart for any flavor when data is available', () => {
    renderComponent(true, AgentTracesFlavor.Traces);
    expect(screen.getByTestId('agentTraces-traces-chart')).toBeInTheDocument();
  });

  it('returns null when no results are available', () => {
    const { container } = renderComponent(false);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when dataset is not time-based', () => {
    // Mock dataset context to return non-time-based dataset
    mockUseDatasetContext.mockReturnValue({
      dataset: {
        isTimeBased: jest.fn(() => false),
        timeFieldName: undefined,
      } as any,
      isLoading: false,
      error: null,
    } as any);

    const { container } = renderComponent(true);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when logs flavor has no chart data', () => {
    // Mock histogramResultsProcessor to return null chartData
    const { histogramResultsProcessor } = jest.requireMock(
      '../../application/utils/state_management/actions/query_actions'
    );
    histogramResultsProcessor.mockReturnValueOnce({
      chartData: null,
      bucketInterval: { scale: false, description: '1h' },
      hits: { total: 10 },
    });

    const { container } = renderComponent(true, AgentTracesFlavor.Traces);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when traces flavor has no request chart data', () => {
    // Mock processTraceAggregationResults to return null requestChartData
    const { processTraceAggregationResults } = jest.requireMock(
      '../../application/utils/state_management/actions/processors/trace_aggregation_processor'
    );
    processTraceAggregationResults.mockReturnValueOnce({
      requestChartData: null,
      errorChartData: { values: [], xAxisOrderedValues: [] },
      latencyChartData: { values: [], xAxisOrderedValues: [] },
      bucketInterval: { scale: false, description: '1h' },
      hits: { total: 10 },
    });

    const { container } = renderComponent(true, AgentTracesFlavor.Traces);
    expect(container.firstChild).toBeNull();
  });

  describe('Trace cache key logic', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseDatasetContext.mockReturnValue({
        dataset: {
          isTimeBased: jest.fn(() => true),
          timeFieldName: '@timestamp',
        } as any,
        isLoading: false,
        error: null,
      } as any);
    });

    it('uses prepareTraceCacheKeys to derive cache keys', () => {
      const { prepareTraceCacheKeys } = jest.requireMock(
        '../../application/utils/state_management/actions/trace_query_actions'
      );

      renderComponent(true, AgentTracesFlavor.Traces);

      expect(prepareTraceCacheKeys).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'source=logs',
          language: 'PPL',
        })
      );
    });

    it('renders traces chart when trace results are available', () => {
      renderComponent(true, AgentTracesFlavor.Traces);
      expect(screen.getByTestId('agentTraces-traces-chart')).toBeInTheDocument();
    });

    it('returns null when request results are missing', () => {
      const { container } = renderComponent(false, AgentTracesFlavor.Traces);
      expect(container.firstChild).toBeNull();
    });
  });
});
