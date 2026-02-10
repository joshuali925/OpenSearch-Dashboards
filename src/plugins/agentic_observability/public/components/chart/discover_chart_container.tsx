/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './discover_chart_container.scss';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AgenticObservabilityFlavor } from '../../../common';
import { AgenticObservabilityServices } from '../../types';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { AgenticObservabilityLogsChart } from './agentic_observability_logs_chart';
import { useDatasetContext } from '../../application/context/dataset_context/dataset_context';
import {
  histogramResultsProcessor,
  prepareHistogramCacheKey,
} from '../../application/utils/state_management/actions/query_actions';
import { prepareTraceCacheKeys } from '../../application/utils/state_management/actions/trace_query_actions';
import { RootState } from '../../application/utils/state_management/store';
import { selectShowHistogram } from '../../application/utils/state_management/selectors';
import { Chart, createHistogramConfigs } from './utils';
import { useFlavorId } from '../../helpers/use_flavor_id';
import { processTraceAggregationResults } from '../../application/utils/state_management/actions/processors/trace_aggregation_processor';
import { AgenticObservabilityTracesChart } from './agentic_observability_traces_chart';
import {
  ProcessedSearchResults,
  TracesChartProcessedResults,
} from '../../application/utils/interfaces';
import { TRACES_CHART_BAR_TARGET } from '../../application/utils/state_management/constants';

export const DiscoverChartContainer = () => {
  const { services } = useOpenSearchDashboards<AgenticObservabilityServices>();
  const { uiSettings, data } = services;
  const flavorId = useFlavorId();

  const { interval } = useSelector((state: RootState) => state.legacy);
  const query = useSelector((state: RootState) => state.query);
  const breakdownField = useSelector((state: RootState) => state.queryEditor.breakdownField);
  const showHistogram = useSelector(selectShowHistogram);

  // Get dataset early since it's needed for cache key calculations
  const { dataset } = useDatasetContext();

  const breakdownCacheKey = useMemo(() => {
    return breakdownField ? prepareHistogramCacheKey(query, true) : undefined;
  }, [query, breakdownField]);

  const standardCacheKey = useMemo(() => {
    return prepareHistogramCacheKey(query, false);
  }, [query]);

  // Select only the specific results we need instead of the entire results map
  const breakdownResult = useSelector((state: RootState) =>
    breakdownCacheKey ? state.results[breakdownCacheKey] : null
  );
  const standardResult = useSelector((state: RootState) => state.results[standardCacheKey] ?? null);

  // Select only the specific status entries we need
  const breakdownStatus = useSelector((state: RootState) =>
    breakdownCacheKey ? state.queryEditor.queryStatusMap[breakdownCacheKey] : undefined
  );
  const standardStatus = useSelector(
    (state: RootState) => state.queryEditor.queryStatusMap[standardCacheKey]
  );

  const hasBreakdownError = useMemo(() => {
    if (!breakdownCacheKey) return false;
    return !!breakdownStatus?.error && !standardStatus?.error;
  }, [breakdownCacheKey, breakdownStatus, standardStatus]);

  const rawResults = useMemo(() => {
    if (hasBreakdownError || !breakdownCacheKey) {
      return standardResult;
    }
    return breakdownResult;
  }, [hasBreakdownError, breakdownCacheKey, standardResult, breakdownResult]);

  const { requestCacheKey, errorCacheKey, latencyCacheKey } = useMemo(() => {
    if (flavorId !== AgenticObservabilityFlavor.Traces || !dataset || !services?.data) {
      return { requestCacheKey: null, errorCacheKey: null, latencyCacheKey: null };
    }
    // Cache keys use base query only (like Logs) - interval changes overwrite results
    return prepareTraceCacheKeys(query);
  }, [flavorId, query, dataset, services]);

  const requestResults = useSelector((state: RootState) =>
    requestCacheKey ? state.results[requestCacheKey] : null
  );
  const errorResults = useSelector((state: RootState) =>
    errorCacheKey ? state.results[errorCacheKey] : null
  );
  const latencyResults = useSelector((state: RootState) =>
    latencyCacheKey ? state.results[latencyCacheKey] : null
  );

  // Get error states for each trace query
  const requestError = useSelector((state: RootState) =>
    requestCacheKey ? state.queryEditor.queryStatusMap[requestCacheKey]?.error : null
  );
  const errorQueryError = useSelector((state: RootState) =>
    errorCacheKey ? state.queryEditor.queryStatusMap[errorCacheKey]?.error : null
  );
  const latencyError = useSelector((state: RootState) =>
    latencyCacheKey ? state.queryEditor.queryStatusMap[latencyCacheKey]?.error : null
  );

  const isTimeBased = useMemo(() => {
    return dataset ? dataset.isTimeBased() : false;
  }, [dataset]);

  const actualInterval = useMemo(() => {
    if (flavorId === AgenticObservabilityFlavor.Traces && dataset && services?.data && interval) {
      const histogramConfigs = createHistogramConfigs(
        dataset,
        interval,
        services.data,
        services.uiSettings,
        breakdownField,
        TRACES_CHART_BAR_TARGET
      );
      const bucketAggConfig = histogramConfigs?.aggs?.[1] as any;
      const finalInterval = bucketAggConfig?.buckets?.getInterval()?.expression;
      return finalInterval || interval || 'auto';
    }
    return interval || 'auto';
  }, [flavorId, dataset, services, interval, breakdownField]);

  const processedResults = useMemo<
    ProcessedSearchResults | TracesChartProcessedResults | null
  >(() => {
    if (flavorId === AgenticObservabilityFlavor.Traces) {
      if (!requestResults || !dataset) {
        return null;
      }
      return processTraceAggregationResults({
        requestAggResults: requestResults,
        errorAggResults: errorResults,
        latencyAggResults: latencyResults,
        dataset,
        interval: actualInterval,
        timeField: dataset.timeFieldName || 'endTime',
        dataPlugin: data,
        rawInterval: interval,
        uiSettings,
      });
    }

    if (!rawResults || !dataset) {
      return null;
    }
    return histogramResultsProcessor(rawResults, dataset, data, interval, uiSettings);
  }, [
    rawResults,
    requestResults,
    errorResults,
    latencyResults,
    dataset,
    flavorId,
    data,
    actualInterval,
    interval,
    uiSettings,
  ]);

  if (!isTimeBased) {
    return null;
  }

  if (!processedResults) {
    return null;
  }

  if (flavorId === AgenticObservabilityFlavor.Traces) {
    if (!(processedResults as TracesChartProcessedResults).requestChartData) {
      return null;
    }
  } else {
    if (!processedResults.hits.total || !(processedResults as ProcessedSearchResults).chartData) {
      return null;
    }
  }

  return (
    <div className="dscCanvas__chart">
      {flavorId === AgenticObservabilityFlavor.Logs && (
        <AgenticObservabilityLogsChart
          bucketInterval={processedResults.bucketInterval}
          chartData={(processedResults as ProcessedSearchResults).chartData as Chart}
          config={uiSettings}
          data={data}
          services={services}
          showHistogram={showHistogram}
        />
      )}
      {flavorId === AgenticObservabilityFlavor.Traces && (
        <AgenticObservabilityTracesChart
          bucketInterval={processedResults.bucketInterval}
          requestChartData={
            (processedResults as TracesChartProcessedResults).requestChartData as Chart
          }
          errorChartData={(processedResults as TracesChartProcessedResults).errorChartData as Chart}
          latencyChartData={
            (processedResults as TracesChartProcessedResults).latencyChartData as Chart
          }
          requestError={requestError}
          errorQueryError={errorQueryError}
          latencyError={latencyError}
          timeFieldName={dataset?.timeFieldName || 'endTime'}
          config={uiSettings}
          data={data}
          services={services}
          showHistogram={showHistogram}
        />
      )}
    </div>
  );
};
