/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './_histogram.scss';

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import dateMath from '@elastic/datemath';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { IUiSettingsClient } from 'opensearch-dashboards/public';
import { useDispatch, useSelector } from 'react-redux';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import { DataPublicPluginStart, search } from '../../../../data/public';
import { TimechartHeader, TimechartHeaderBucketInterval } from './timechart_header';
import { DiscoverHistogram } from './histogram/histogram';
import { AgentTracesServices } from '../../types';
import { Chart } from './utils';
import {
  setInterval,
  clearResultsByKey,
  clearResults,
  setShowHistogram,
  setDateRange,
} from '../../application/utils/state_management/slices';
import {
  clearQueryStatusMap,
  setIndividualQueryStatus,
} from '../../application/utils/state_management/slices/query_editor';
import { QueryExecutionStatus } from '../../application/utils/state_management/types';
import { RootState } from '../../application/utils/state_management/store';
import {
  executeQueries,
  defaultPrepareQueryString,
  prepareHistogramCacheKey,
} from '../../application/utils/state_management/actions/query_actions';

const tracesIntervalOptions = search.aggs.intervalOptions.filter((option) => {
  // Only exclude milliseconds (ms) - PPL doesn't support it, all others work
  return option.val !== 'ms';
});

const isFieldMissingError = (error: any): boolean => {
  return (
    error?.message?.type === 'SemanticCheckException' &&
    error?.message?.details?.includes("can't resolve Symbol")
  );
};

const extractMissingFieldName = (error: any): string => {
  const details = error?.message?.details || '';
  const match = details.match(/Symbol\(namespace=FIELD_NAME, name=([^)]+)\)/);
  return match ? match[1] : 'unknown field';
};

const getFieldMissingMessage = (
  chartType: string,
  fieldName: string,
  timeFieldName?: string
): string => {
  // Handle time field dynamically
  if (timeFieldName && fieldName === timeFieldName) {
    return i18n.translate('agentTraces.traces.error.missingDynamicTimeField', {
      defaultMessage:
        'Time field "{timeFieldName}" not found in this dataset. This field is required for time-based metrics.',
      values: { timeFieldName },
    });
  }

  const fieldMessages: Record<string, string> = {
    durationInNanos: i18n.translate('agentTraces.traces.error.missingDurationField', {
      defaultMessage:
        'Duration field "durationInNanos" not found in this dataset. This field is required for latency metrics.',
    }),
    status: i18n.translate('agentTraces.traces.error.missingStatusField', {
      defaultMessage:
        'Status field "status" not found in this dataset. This field is required for error metrics.',
    }),
    endTime: i18n.translate('agentTraces.traces.error.missingEndTimeField', {
      defaultMessage:
        'Time field "endTime" not found in this dataset. This field is required for time-based metrics.',
    }),
  };

  return (
    fieldMessages[fieldName] ||
    i18n.translate('agentTraces.traces.error.missingGenericField', {
      defaultMessage:
        'Required field "{fieldName}" not found in this dataset for {chartType} chart.',
      values: { fieldName, chartType },
    })
  );
};

interface ChartQueryError {
  statusCode: number;
  error: string;
  message: {
    details: string;
    reason: string;
    type?: string;
  };
  originalErrorMessage: string;
}

interface AgentTracesTracesChartProps {
  bucketInterval?: TimechartHeaderBucketInterval;
  requestChartData?: Chart;
  errorChartData?: Chart;
  latencyChartData?: Chart;
  requestError?: ChartQueryError | null;
  errorQueryError?: ChartQueryError | null;
  latencyError?: ChartQueryError | null;
  timeFieldName?: string;
  config: IUiSettingsClient;
  data: DataPublicPluginStart;
  services: AgentTracesServices;
  showHistogram: boolean;
}

export const AgentTracesTracesChart = ({
  bucketInterval,
  requestChartData,
  errorChartData,
  latencyChartData,
  requestError,
  errorQueryError,
  latencyError,
  timeFieldName,
  config,
  data,
  services,
  showHistogram,
}: AgentTracesTracesChartProps) => {
  const { from, to } = data.query.timefilter.timefilter.getTime();
  const timeRange = useMemo(() => {
    return {
      from: dateMath.parse(from)?.format('YYYY-MM-DDTHH:mm:ss.SSSZ') || '',
      to: dateMath.parse(to, { roundUp: true })?.format('YYYY-MM-DDTHH:mm:ss.SSSZ') || '',
    };
  }, [from, to]);
  const { interval } = useSelector((state: RootState) => state.legacy);
  const query = useSelector((state: RootState) => state.query);
  const breakdownField = useSelector((state: RootState) => state.queryEditor.breakdownField);
  const dispatch = useDispatch();

  const onChangeInterval = (newInterval: string) => {
    dispatch(setInterval(newInterval));

    // Clear only chart-related cache keys
    const baseQuery = defaultPrepareQueryString(query);
    const histogramCacheKey = prepareHistogramCacheKey(query, !!breakdownField);

    // Clear histogram and trace aggregation cache keys
    const chartCacheKeys = [
      histogramCacheKey,
      `trace-requests:${baseQuery}`,
      `trace-errors:${baseQuery}`,
      `trace-latency:${baseQuery}`,
    ];

    chartCacheKeys.forEach((cacheKey) => {
      dispatch(clearResultsByKey(cacheKey));
      // Also clear the query status so the query gets re-executed
      dispatch(
        setIndividualQueryStatus({
          cacheKey,
          status: {
            status: QueryExecutionStatus.UNINITIALIZED,
            startTime: undefined,
            elapsedMs: undefined,
            error: undefined,
          },
        })
      );
    });

    dispatch(executeQueries({ services }));
  };
  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      dispatch(
        setDateRange({
          from: moment(ranges.from).toISOString(),
          to: moment(ranges.to).toISOString(),
        })
      );
      dispatch(clearResults());
      dispatch(clearQueryStatusMap());
      dispatch(executeQueries({ services }));
    },
    [dispatch, services]
  );

  // Individual chart titles for when expanded
  const requestChartTitle = i18n.translate('agentTraces.traces.requestChart.title', {
    defaultMessage: 'Request Count',
  });

  const errorChartTitle = i18n.translate('agentTraces.traces.errorChart.title', {
    defaultMessage: 'Error Count',
  });

  const latencyChartTitle = i18n.translate('agentTraces.traces.latencyChart.title', {
    defaultMessage: 'Latency (ms)',
  });

  const timeChartHeader = showHistogram ? (
    // When expanded, show individual chart titles spread out
    <div className="agentTracesChart__TimechartHeader" data-test-subj="dscChartTimechartHeader">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem className="agentTracesTracesChart__headerItem">
          <h4 className="agentTracesTracesChart__title">{requestChartTitle}</h4>
        </EuiFlexItem>
        <EuiFlexItem className="agentTracesTracesChart__headerItem">
          <h4 className="agentTracesTracesChart__title">{errorChartTitle}</h4>
        </EuiFlexItem>
        <EuiFlexItem className="agentTracesTracesChart__headerItem">
          <h4 className="agentTracesTracesChart__title">{latencyChartTitle}</h4>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  ) : (
    // When collapsed, show combined title with all controls
    <div className="agentTracesChart__TimechartHeader" data-test-subj="dscChartTimechartHeader">
      <TimechartHeader
        title={i18n.translate('agentTraces.discover.timechartHeader.traces', {
          defaultMessage: 'Request, Errors, and Latency',
        })}
        bucketInterval={bucketInterval}
        dateFormat={config.get('dateFormat')}
        timeRange={timeRange}
        options={tracesIntervalOptions}
        onChangeInterval={onChangeInterval}
        stateInterval={interval || ''}
        services={services}
        hideIntervalSelector={true}
      />
    </div>
  );

  const toggleLabel = i18n.translate('agentTraces.discover.histogram.collapse', {
    defaultMessage: 'Toggle histogram',
  });

  const toggle = (
    <EuiToolTip content={toggleLabel}>
      <EuiButtonIcon
        aria-expanded={showHistogram}
        aria-label={toggleLabel}
        data-test-subj="histogramCollapseBtn"
        onClick={() => dispatch(setShowHistogram(!showHistogram))}
        iconType={showHistogram ? 'arrowDown' : 'arrowRight'}
        iconSize="m"
        color="text"
      />
    </EuiToolTip>
  );

  const queryEnhancedHistogramHeader = (
    <EuiFlexGroup
      direction="row"
      gutterSize="m"
      className="agentTracesChart__chartheader"
      data-test-subj="dscChartChartheader"
    >
      <EuiFlexItem grow={false}>{toggle}</EuiFlexItem>
      <EuiFlexItem grow={true} className="agentTracesChart__chartheaderContent">
        {timeChartHeader}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className="agentTracesChart__wrapper agentTracesChart__wrapper--enhancement"
      data-test-subj="dscChartWrapper"
    >
      {queryEnhancedHistogramHeader}
      {showHistogram && (
        <EuiFlexGroup direction="row" gutterSize="m">
          {/* Spacer to align with toggle button */}
          <EuiFlexItem grow={false} className="agentTracesTracesChart__spacer" />
          {/* Request Count Chart - Fixed Container */}
          <EuiFlexItem className="agentTracesTracesChart__container">
            <section
              aria-label={i18n.translate('agentTraces.traces.requestChartAriaLabel', {
                defaultMessage: 'Request count histogram',
              })}
              className="agentTracesTimechart agentTracesTimechart--request agentTracesTracesChart__section"
              data-test-subj="agentTracesTimechart-request"
            >
              <div
                className="agentTracesHistogram agentTracesHistogram--request agentTracesTracesChart__histogram"
                data-test-subj="agentTracesChart-request"
              >
                {requestChartData ? (
                  <DiscoverHistogram
                    chartData={requestChartData}
                    chartType={'HistogramBar'}
                    timefilterUpdateHandler={timefilterUpdateHandler}
                    services={services}
                    showYAxisLabel={false}
                  />
                ) : requestError && isFieldMissingError(requestError) ? (
                  <EuiCallOut
                    title={i18n.translate('agentTraces.traces.error.requestChartTitle', {
                      defaultMessage: 'Request Count Unavailable',
                    })}
                    color="danger"
                    iconType="alert"
                    size="s"
                  >
                    <p>
                      {getFieldMissingMessage(
                        'Request Count',
                        extractMissingFieldName(requestError),
                        timeFieldName
                      )}
                    </p>
                  </EuiCallOut>
                ) : requestError ? (
                  <EuiCallOut
                    title={i18n.translate('agentTraces.traces.error.requestChartGenericTitle', {
                      defaultMessage: 'Request Count Unavailable',
                    })}
                    color="danger"
                    iconType="alert"
                    size="s"
                  >
                    <p>
                      {requestError.originalErrorMessage ||
                        requestError.message?.details ||
                        requestError.error ||
                        i18n.translate('agentTraces.traces.error.requestChartFallback', {
                          defaultMessage:
                            'Failed to load request count data. Please try again or check your query.',
                        })}
                    </p>
                  </EuiCallOut>
                ) : (
                  <div className="agentTracesTracesChart__loading">
                    <EuiLoadingSpinner size="m" />
                  </div>
                )}
              </div>
            </section>
          </EuiFlexItem>

          {/* Error Count Chart - Fixed Container */}
          <EuiFlexItem className="agentTracesTracesChart__container">
            <section
              aria-label={i18n.translate('agentTraces.traces.errorChartAriaLabel', {
                defaultMessage: 'Error count histogram',
              })}
              className="agentTracesTimechart agentTracesTimechart--error agentTracesTracesChart__section"
              data-test-subj="agentTracesTimechart-error"
            >
              <div
                className="agentTracesHistogram agentTracesHistogram--error agentTracesTracesChart__histogram"
                data-test-subj="agentTracesChart-error"
              >
                {errorChartData ? (
                  <DiscoverHistogram
                    chartData={errorChartData}
                    chartType={'HistogramBar'}
                    timefilterUpdateHandler={timefilterUpdateHandler}
                    services={services}
                    showYAxisLabel={false}
                    customChartsTheme={{
                      colors: {
                        vizColors: [euiThemeVars.euiColorDanger],
                      },
                    }}
                  />
                ) : errorQueryError && isFieldMissingError(errorQueryError) ? (
                  <EuiCallOut
                    title={i18n.translate('agentTraces.traces.error.errorChartTitle', {
                      defaultMessage: 'Error Count Unavailable',
                    })}
                    color="danger"
                    iconType="alert"
                    size="s"
                  >
                    <p>
                      {getFieldMissingMessage(
                        'Error Count',
                        extractMissingFieldName(errorQueryError),
                        timeFieldName
                      )}
                    </p>
                  </EuiCallOut>
                ) : errorQueryError ? (
                  <EuiCallOut
                    title={i18n.translate('agentTraces.traces.error.errorChartGenericTitle', {
                      defaultMessage: 'Error Count Unavailable',
                    })}
                    color="danger"
                    iconType="alert"
                    size="s"
                  >
                    <p>
                      {errorQueryError.originalErrorMessage ||
                        errorQueryError.message?.details ||
                        errorQueryError.error ||
                        i18n.translate('agentTraces.traces.error.errorChartFallback', {
                          defaultMessage:
                            'Failed to load error count data. Please try again or check your query.',
                        })}
                    </p>
                  </EuiCallOut>
                ) : (
                  <div className="agentTracesTracesChart__loading">
                    <EuiLoadingSpinner size="m" />
                  </div>
                )}
              </div>
            </section>
          </EuiFlexItem>

          {/* Latency Chart - Fixed Container */}
          <EuiFlexItem className="agentTracesTracesChart__container">
            <section
              aria-label={i18n.translate('agentTraces.traces.latencyChartAriaLabel', {
                defaultMessage: 'Average latency chart',
              })}
              className="agentTracesTimechart agentTracesTimechart--latency agentTracesTracesChart__section"
              data-test-subj="agentTracesTimechart-latency"
            >
              <div
                className="agentTracesHistogram agentTracesHistogram--latency agentTracesTracesChart__histogram"
                data-test-subj="agentTracesChart-latency"
              >
                {latencyChartData ? (
                  <DiscoverHistogram
                    chartData={latencyChartData}
                    chartType={'Line'}
                    timefilterUpdateHandler={timefilterUpdateHandler}
                    services={services}
                    showYAxisLabel={false}
                  />
                ) : latencyError && isFieldMissingError(latencyError) ? (
                  <EuiCallOut
                    title={i18n.translate('agentTraces.traces.error.latencyChartTitle', {
                      defaultMessage: 'Latency Unavailable',
                    })}
                    color="danger"
                    iconType="alert"
                    size="s"
                  >
                    <p>
                      {getFieldMissingMessage(
                        'Latency',
                        extractMissingFieldName(latencyError),
                        timeFieldName
                      )}
                    </p>
                  </EuiCallOut>
                ) : latencyError ? (
                  <EuiCallOut
                    title={i18n.translate('agentTraces.traces.error.latencyChartGenericTitle', {
                      defaultMessage: 'Latency Unavailable',
                    })}
                    color="danger"
                    iconType="alert"
                    size="s"
                  >
                    <p>
                      {latencyError.originalErrorMessage ||
                        latencyError.message?.details ||
                        latencyError.error ||
                        i18n.translate('agentTraces.traces.error.latencyChartFallback', {
                          defaultMessage:
                            'Failed to load latency data. Please try again or check your query.',
                        })}
                    </p>
                  </EuiCallOut>
                ) : (
                  <div className="agentTracesTracesChart__loading">
                    <EuiLoadingSpinner size="m" />
                  </div>
                )}
              </div>
            </section>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};
