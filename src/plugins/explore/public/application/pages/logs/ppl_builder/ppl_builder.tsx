/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './ppl_builder.scss';

import React, { useCallback, useMemo, useReducer, useRef, useState, useEffect } from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonEmpty, EuiComboBox, EuiFieldText, EuiButtonIcon } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../../types';
import { createHistogramConfigs } from '../../../../components/chart/utils';
import { builderReducer, buildPPL, sortableColumns } from './build_ppl';
import { PPLBuilderState, emptyState } from './types';
import { SearchBox } from './search_box';
import { AggregationRow } from './aggregation_row';
import { SortRow } from './sort_row';
import { AddMetricMenu } from './add_metric_menu';
import { useFieldData } from './use_field_data';
import { withConnector } from '../../../components/query_builder';
import { useDatasetContext } from '../../../context';

// How far the group branch's vertical line reaches up past its top edge: the
// row's own top margin plus the parent search box's bottom padding ($euiSizeXS,
// 4px), so the line starts at the bottom of the search box rather than into it.
const GROUP_BRANCH_TOP_REACH = 16;

interface PPLBuilderProps {
  initialState?: PPLBuilderState;
  onQueryChange: (query: string, state: PPLBuilderState) => void;
}

// Target bar count for the auto time-bucket, matching the traces chart's density.
const CHART_BAR_TARGET = 15;

// A PPL span interval is a positive number optionally followed by a time unit
// (e.g. `30s`, `1m`, `2d`). Anything else produces an invalid `span(...)` that
// only fails server-side, so flag it in the field.
const SPAN_INTERVAL_RE = /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|M|q|y|second|minute|hour|day|week|month|quarter|year)?s?$/i;

export const PPLBuilder: React.FC<PPLBuilderProps> = ({ initialState, onQueryChange }) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { dataset } = useDatasetContext();
  const [state, dispatch] = useReducer(
    builderReducer,
    initialState ?? null,
    (seed) => seed ?? emptyState()
  );
  const {
    fieldNames,
    fieldOptions,
    numericAndAggregatableOptions,
    numericOptions,
    timeFieldName,
    getValues,
  } = useFieldData();

  // The search box owns its text (the search-expression, source of truth for the
  // row). Seeded once from the reducer's initial state; the parent remounts (via
  // key) to re-seed on external changes, mirroring how MetricsQueryPanel re-inits
  // rows.
  const [searchText, setSearchText] = useState(() => state.searchExpression);

  // Derive an adaptive span interval from the current time range, reusing the
  // same createHistogramConfigs path the logs histogram uses.
  const deriveAutoInterval = useCallback((): string => {
    // Use the fully-resolved DataView (with timeFieldName + fields) so
    // createAggConfigs succeeds and the interval actually adapts to the range.
    // The lightweight queryString descriptor lacks these and forces the fallback.
    if (!dataset?.timeFieldName) return '1m';
    try {
      const configs = createHistogramConfigs(
        dataset,
        'auto',
        services.data,
        services.uiSettings,
        undefined,
        CHART_BAR_TARGET
      );
      const bucketAgg = configs?.aggs?.[1] as any;
      return bucketAgg?.buckets?.getInterval?.()?.expression || '1m';
    } catch {
      return '1m';
    }
  }, [services, dataset]);

  // The builder emits a source-less query (just the search expression + stats).
  // The `source = <index>` clause is the dataset's concern — hidden from the UI
  // and prepended by the execution layer when the query runs.
  const query = useMemo(() => buildPPL(state), [state]);

  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;
  useEffect(() => {
    onQueryChangeRef.current(query, state);
  }, [query, state]);

  const onSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      dispatch({ type: 'SET_SEARCH_EXPRESSION', searchExpression: text });
    },
    [dispatch]
  );

  const hasAggregation = state.aggregations.length > 0;

  // Columns the sort row can target: the metrics + group-by fields the query
  // produces. Recomputed from state so it tracks metric/group-by edits.
  const sortColumns = useMemo(() => sortableColumns(state), [state]);

  const toggleSpan = () => {
    if (state.groupBy.span) {
      dispatch({ type: 'REMOVE_SPAN' });
    } else {
      dispatch({
        type: 'SET_SPAN',
        span: { field: timeFieldName, interval: deriveAutoInterval(), auto: true },
      });
    }
  };

  return (
    <div className="plqBuilder" data-test-subj="pplBuilder">
      {/* Search / filter row */}
      <div className="plqRow">
        <span className="plqRow__label">
          {i18n.translate('explore.pplBuilder.searchFor', { defaultMessage: 'Search for' })}
        </span>
        <div className="plqSearchBoxWrap">
          <SearchBox
            value={searchText}
            fieldNames={fieldNames}
            onRequestValues={getValues}
            onChange={onSearchChange}
          />
        </div>
      </div>

      {/* Group / aggregate row — branched beneath "Search for" as an indented
          child so the two rows read as a query tree (mirrors the metric
          explorer's tree connectors between stacked operations). */}
      {withConnector(
        0,
        <div className="plqRow plqRow--branch plqGroupBranch">
          <span className="plqRow__label">
            {i18n.translate('explore.pplBuilder.groupInto', { defaultMessage: 'Group into' })}
          </span>
          {/* Tree connector tying the "Group into" label to its child rows so
              the group reads as one unit rather than an isolated pill. */}
          <div className="plqGroupBranch__connector" />
          <div className="plqGroupBranch__kids">
            {/* Metric aggregations + the add-metric affordance. */}
            <div className="plqGroupChildRow">
              {state.aggregations.map((agg, idx) => (
                <AggregationRow
                  key={agg.id}
                  agg={agg}
                  idx={idx}
                  numericFieldOptions={numericOptions}
                  anyFieldOptions={numericAndAggregatableOptions}
                  dispatch={dispatch}
                />
              ))}
              <AddMetricMenu
                onAdd={(fn) => dispatch({ type: 'ADD_AGGREGATION', agg: { fn } })}
                dataTestSubj="pplBuilderAddAggregation"
              />
            </div>

            {/* Group-by + time-bucket, stacked as a second child row under the
                same connector so the whole aggregation reads as one group. */}
            {hasAggregation && (
              <div className="plqGroupChildRow">
                {/* Group-by fields — outlined group matching the metric pills, with
                    the "by" label floating on the top border. */}
                <div className="plqGroup" data-test-subj="pplBuilderGroupBy">
                  <span className="plqGroup__label">
                    {i18n.translate('explore.pplBuilder.by', { defaultMessage: 'by' })}
                  </span>
                  <EuiComboBox
                    compressed
                    style={{ minWidth: 200 }}
                    placeholder={i18n.translate('explore.pplBuilder.groupByEverything', {
                      defaultMessage: 'Everything',
                    })}
                    options={fieldOptions}
                    selectedOptions={state.groupBy.fields.map((f) => ({ label: f }))}
                    onChange={(selected) =>
                      dispatch({
                        type: 'SET_GROUPBY_FIELDS',
                        fields: selected.map((s) => s.label),
                      })
                    }
                    onCreateOption={(val) => {
                      const v = val.trim();
                      if (v) {
                        dispatch({
                          type: 'SET_GROUPBY_FIELDS',
                          fields: [...state.groupBy.fields, v],
                        });
                      }
                    }}
                    data-test-subj="pplBuilderGroupByFields"
                  />
                </div>

                {/* Time span chip */}
                {state.groupBy.span ? (
                  <div className="plqGroup" data-test-subj="pplBuilderSpanChip">
                    <span className="plqGroup__label">
                      {i18n.translate('explore.pplBuilder.span', {
                        defaultMessage: 'Time span',
                      })}
                    </span>
                    <EuiFieldText
                      compressed
                      controlOnly
                      isInvalid={!SPAN_INTERVAL_RE.test(state.groupBy.span.interval.trim())}
                      value={state.groupBy.span.interval}
                      onChange={(e) =>
                        dispatch({
                          type: 'SET_SPAN',
                          span: {
                            field: state.groupBy.span!.field,
                            interval: e.target.value,
                            auto: false,
                          },
                        })
                      }
                      className="plqParamInput"
                      style={{ width: 64 }}
                      aria-label={i18n.translate('explore.pplBuilder.spanInterval', {
                        defaultMessage: 'Time span interval',
                      })}
                      data-test-subj="pplBuilderSpanInterval"
                    />
                    <div className="plqSep" />
                    <EuiButtonIcon
                      iconType="cross"
                      color="text"
                      size="s"
                      aria-label={i18n.translate('explore.pplBuilder.removeSpan', {
                        defaultMessage: 'Remove time span',
                      })}
                      onClick={toggleSpan}
                      data-test-subj="pplBuilderRemoveSpan"
                    />
                  </div>
                ) : (
                  <EuiButtonEmpty
                    size="xs"
                    iconType="clock"
                    onClick={toggleSpan}
                    data-test-subj="pplBuilderAddSpan"
                  >
                    {i18n.translate('explore.pplBuilder.addSpan', {
                      defaultMessage: 'Add time span',
                    })}
                  </EuiButtonEmpty>
                )}
              </div>
            )}

            {/* Sort row — a third child under the same connector, shown once the
                query aggregates (there are output columns to sort). */}
            {hasAggregation && (
              <div className="plqGroupChildRow">
                <SortRow sort={state.sort} columns={sortColumns} dispatch={dispatch} />
              </div>
            )}
          </div>
        </div>,
        true,
        undefined,
        GROUP_BRANCH_TOP_REACH
      )}
    </div>
  );
};
