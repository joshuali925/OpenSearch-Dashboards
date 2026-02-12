/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './discover_chart_container.scss';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AgentTracesServices } from '../../types';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { useDatasetContext } from '../../application/context/dataset_context/dataset_context';
import { prepareTraceCacheKeys } from '../../application/utils/state_management/actions/trace_query_actions';
import { RootState } from '../../application/utils/state_management/store';
import { selectShowHistogram } from '../../application/utils/state_management/selectors';
import { Chart, createHistogramConfigs } from './utils';
import { processTraceAggregationResults } from '../../application/utils/state_management/actions/processors/trace_aggregation_processor';
import { AgentTracesTracesChart } from './agent_traces_traces_chart';
import { TracesChartProcessedResults } from '../../application/utils/interfaces';
import { TRACES_CHART_BAR_TARGET } from '../../application/utils/state_management/constants';

export const DiscoverChartContainer = () => {
  const { services } = useOpenSearchDashboards<AgentTracesServices>();
  const { uiSettings, data } = services;

  const { interval } = useSelector((state: RootState) => state.legacy);
  const query = useSelector((state: RootState) => state.query);
  const breakdownField = useSelector((state: RootState) => state.queryEditor.breakdownField);
  const showHistogram = useSelector(selectShowHistogram);

  const { dataset } = useDatasetContext();

  const { requestCacheKey, errorCacheKey, latencyCacheKey } = useMemo(() => {
    if (!dataset || !services?.data) {
      return { requestCacheKey: null, errorCacheKey: null, latencyCacheKey: null };
    }
    return prepareTraceCacheKeys(query);
  }, [query, dataset, services]);

  const requestResults = useSelector((state: RootState) =>
    requestCacheKey ? state.results[requestCacheKey] : null
  );
  const errorResults = useSelector((state: RootState) =>
    errorCacheKey ? state.results[errorCacheKey] : null
  );
  const latencyResults = useSelector((state: RootState) =>
    latencyCacheKey ? state.results[latencyCacheKey] : null
  );

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
    if (dataset && services?.data && interval) {
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
  }, [dataset, services, interval, breakdownField]);

  const processedResults = useMemo<TracesChartProcessedResults | null>(() => {
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
  }, [
    requestResults,
    errorResults,
    latencyResults,
    dataset,
    data,
    actualInterval,
    interval,
    uiSettings,
  ]);

  if (!isTimeBased || !processedResults?.requestChartData) {
    return null;
  }

  return (
    <div className="dscCanvas__chart">
      <AgentTracesTracesChart
        bucketInterval={processedResults.bucketInterval}
        requestChartData={processedResults.requestChartData as Chart}
        errorChartData={processedResults.errorChartData as Chart}
        latencyChartData={processedResults.latencyChartData as Chart}
        requestError={requestError}
        errorQueryError={errorQueryError}
        latencyError={latencyError}
        timeFieldName={dataset?.timeFieldName || 'endTime'}
        config={uiSettings}
        data={data}
        services={services}
        showHistogram={showHistogram}
      />
    </div>
  );
};
