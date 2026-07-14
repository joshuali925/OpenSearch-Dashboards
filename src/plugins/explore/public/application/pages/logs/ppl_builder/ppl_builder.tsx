/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './ppl_builder.scss';

import React, { useCallback, useMemo, useReducer, useRef, useState, useEffect } from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonIcon, EuiComboBox, EuiFieldText, EuiToolTip } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../../types';
import { createHistogramConfigs } from '../../../../components/chart/utils';
import { builderReducer, buildPPL, sortableColumns } from './build_ppl';
import { PPLBuilderState, emptyState } from './types';
import { SearchBox } from './search_box';
import { AggregationRow } from './aggregation_row';
import { SortRow } from './sort_row';
import { AddMetricMenu } from './add_metric_menu';
import { ModeToggleButton } from './mode_toggle_button';
import { useFieldData } from './use_field_data';
import { useDatasetContext } from '../../../context';

interface PPLBuilderProps {
  initialState?: PPLBuilderState;
  onQueryChange: (query: string, state: PPLBuilderState) => void;
  /** Switch to code mode (the `</>` toggle in the search row). */
  onSwitchToCode?: () => void;
}

// Target bar count for the auto time-bucket, matching the traces chart's density.
const CHART_BAR_TARGET = 15;

// A PPL span interval is a positive number optionally followed by a time unit
// (e.g. `30s`, `1m`, `2d`). Anything else produces an invalid `span(...)` that
// only fails server-side, so flag it in the field.
const SPAN_INTERVAL_RE = /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|M|q|y|second|minute|hour|day|week|month|quarter|year)?s?$/i;

export const PPLBuilder: React.FC<PPLBuilderProps> = ({
  initialState,
  onQueryChange,
  onSwitchToCode,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { dataset } = useDatasetContext();
  const [state, dispatch] = useReducer(
    builderReducer,
    initialState ?? null,
    (seed) => seed ?? emptyState()
  );
  const {
    fieldNames,
    sortableFieldNames,
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

  // Candidate sort columns. When the query aggregates, sort targets an output
  // column (metrics + group-by fields, via `sortableColumns`); otherwise sort
  // applies to raw rows, so offer the dataset's sortable fields (excluding
  // `.keyword` multi-fields, which the PPL engine rejects as a sort target).
  // Recomputed from state so it tracks metric/group-by edits.
  const sortColumns = useMemo(
    () => (hasAggregation ? sortableColumns(state) : sortableFieldNames),
    [hasAggregation, state, sortableFieldNames]
  );

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
      {/* Row 1 — search / filter, with the </> code toggle pinned at its end. */}
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
        {onSwitchToCode && <ModeToggleButton isCode={false} onToggle={onSwitchToCode} />}
      </div>

      {/* Row 2 — the whole aggregation on one wrapping line: Group into — metrics
          — add-metric — by (with time span chip) — add time span — [spacer] —
          Sort. Sort is pinned to the far right after a divider; the by-group and
          time-span only appear once at least one metric exists. */}
      <div className="plqRow plqRow--builder">
        <span className="plqRow__label">
          {i18n.translate('explore.pplBuilder.groupInto', { defaultMessage: 'Group into' })}
        </span>

        {/* Metric aggregation groups. */}
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

        {/* Add-metric: a labelled ghost button when the row is empty (labels
            teach), collapsing to an icon-only dashed ＋ once a metric exists
            (icons keep it dense). */}
        <AddMetricMenu
          hasMetrics={hasAggregation}
          onAdd={(fn) => dispatch({ type: 'ADD_AGGREGATION', agg: { fn } })}
          dataTestSubj="pplBuilderAddAggregation"
        />

        {/* Group-by + time-bucket, shown only once the query aggregates. */}
        {hasAggregation && (
          <>
            {/* Group-by fields — outlined group matching the metric groups, with
                the "by" label floating on the top border. The time span, when
                present, renders as a chip inside this same box. */}
            <div className="plqGroup" data-test-subj="pplBuilderGroupBy">
              <span className="plqGroup__label">
                {i18n.translate('explore.pplBuilder.by', { defaultMessage: 'by' })}
              </span>

              <EuiComboBox
                compressed
                // Each selected field pill carries its own × to remove it, so
                // the box-wide clear button is redundant.
                isClearable={false}
                style={{ minWidth: 160 }}
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

              {/* Time span, when present, renders as a chip to the RIGHT of the
                  group-by fields — it's another grouping key appended after the
                  plain fields, matching `by span(...), clientip` reading order. */}
              {state.groupBy.span && (
                <span className="plqChip" data-test-subj="pplBuilderSpanChip">
                  <span className="plqChip__mono">span({state.groupBy.span.field},</span>
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
                    className="plqChip__mono plqSpanInterval"
                    style={{ width: 48 }}
                    aria-label={i18n.translate('explore.pplBuilder.spanInterval', {
                      defaultMessage: 'Time span interval',
                    })}
                    data-test-subj="pplBuilderSpanInterval"
                  />
                  <span className="plqChip__mono">)</span>
                  <EuiButtonIcon
                    className="plqX"
                    iconType="cross"
                    color="text"
                    size="s"
                    aria-label={i18n.translate('explore.pplBuilder.removeSpan', {
                      defaultMessage: 'Remove time span',
                    })}
                    onClick={toggleSpan}
                    data-test-subj="pplBuilderRemoveSpan"
                  />
                </span>
              )}
            </div>

            {/* Add time span — a dashed clock icon; hidden once a span exists
                (only one span is supported, and its chip's ✕ brings it back). */}
            {!state.groupBy.span && (
              <EuiToolTip
                content={i18n.translate('explore.pplBuilder.addSpan', {
                  defaultMessage: 'Add time span',
                })}
                position="top"
              >
                <EuiButtonIcon
                  className="plqIconBtn plqIconBtn--ghost"
                  iconType="clock"
                  color="text"
                  size="s"
                  onClick={toggleSpan}
                  aria-label={i18n.translate('explore.pplBuilder.addSpan', {
                    defaultMessage: 'Add time span',
                  })}
                  data-test-subj="pplBuilderAddSpan"
                />
              </EuiToolTip>
            )}
          </>
        )}

        {/* Sort — its own trailing `| sort` pipe operation, pinned to the far
            right after a divider. Shown independently of whether the query
            aggregates. Collapses to a ghost "＋ Sort" when unsorted. */}
        <span className="plqSpacer" />
        <span className="plqDivider" />
        <SortRow sort={state.sort} columns={sortColumns} dispatch={dispatch} />
      </div>
    </div>
  );
};
