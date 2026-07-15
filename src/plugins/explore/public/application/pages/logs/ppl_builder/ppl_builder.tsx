/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './ppl_builder.scss';

import React, { useCallback, useMemo, useReducer, useRef, useState, useEffect } from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../../types';
import { createHistogramConfigs } from '../../../../components/chart/utils';
import { builderReducer, buildPPL, sortableColumns } from './build_ppl';
import { PPLBuilderState, emptyState } from './types';
import { SearchBox } from './search_box';
import { AggregationRow } from './aggregation_row';
import { SortRow } from './sort_row';
import { AddMetricMenu } from './add_metric_menu';
import { FieldMenu } from './field_menu';
import { SpanIntervalMenu } from './span_interval_menu';
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
const SPAN_INTERVAL_RE =
  /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|M|q|y|second|minute|hour|day|week|month|quarter|year)?s?$/i;

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
    numericAndAggregatableNames,
    numericFieldNames,
    groupByFieldNames,
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
    // sortableColumns reads only aggregations + group-by fields, so recompute
    // when those change — not on unrelated state edits (e.g. search keystrokes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasAggregation, state.aggregations, state.groupBy.fields, sortableFieldNames]
  );

  // Add time grouping — a `span(<time field>, <auto interval>)` on the dataset's
  // designated time field. Surfaced in the builder as the "over time" entry in
  // the group-by popover; the field itself is a code-mode concern.
  const addSpan = () => {
    dispatch({
      type: 'SET_SPAN',
      span: { field: timeFieldName, interval: deriveAutoInterval(), auto: true },
    });
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
          — add-metric — by (fields first, then the "every" time chip) — [spacer]
          — Sort. Sort is pinned to the far right after a divider; the by-group
          only appears once at least one metric exists. Time grouping is entered
          from the by popover ("over time"), not a standalone button. */}
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
            numericFieldOptions={numericFieldNames}
            anyFieldOptions={numericAndAggregatableNames}
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

              {/* Group-by field picker: a search-first popover (like the "Show"
                  and ƒx menus) rather than an inline combobox whose dropdown is
                  clipped to a narrow width. Selected fields render as removable
                  blue pills; a trailing caret opens the readable multi-select
                  list. */}
              <FieldMenu
                multi
                options={groupByFieldNames}
                value={state.groupBy.fields}
                onChange={(fields) => dispatch({ type: 'SET_GROUPBY_FIELDS', fields })}
                // "Over time" leads the popover — plain-language time grouping,
                // offered only while no span exists (PPL allows one). Picking it
                // adds a `span(<time field>, auto)`; the chip's ✕ brings it back.
                overTime={
                  state.groupBy.span
                    ? undefined
                    : {
                        hint: i18n.translate('explore.pplBuilder.overTimeHint', {
                          defaultMessage: 'every {interval}',
                          values: { interval: deriveAutoInterval() },
                        }),
                        tooltip: i18n.translate('explore.pplBuilder.overTimeTooltip', {
                          defaultMessage:
                            'span({field}, {interval}) — uses the dataset’s time field',
                          values: { field: timeFieldName, interval: deriveAutoInterval() },
                        }),
                        onSelect: addSpan,
                      }
                }
                dataTestSubj="pplBuilderGroupByFields"
                caretAriaLabel={i18n.translate('explore.pplBuilder.editGroupByFields', {
                  defaultMessage: 'Edit group-by fields',
                })}
                renderTrigger={(caret, onToggle) => (
                  <span className="plqPills">
                    {/* "Everything" is the semantic default — shown only when the
                        box is truly empty (no fields AND no time grouping). Once
                        an "every" chip exists the box has content, so the caret
                        alone stands in as the inline "add field" affordance. */}
                    {state.groupBy.fields.length === 0 && !state.groupBy.span ? (
                      <button
                        type="button"
                        className="plqPills__placeholder"
                        onClick={onToggle}
                        data-test-subj="pplBuilderGroupByFields"
                      >
                        {i18n.translate('explore.pplBuilder.groupByEverything', {
                          defaultMessage: 'Everything',
                        })}
                      </button>
                    ) : (
                      state.groupBy.fields.map((f) => (
                        <span key={f} className="plqPill">
                          {/* The field name is static text — only its ✕ removes it
                              and the trailing caret opens the picker. Clicking the
                              label itself does nothing (matches the mock's chips). */}
                          <span className="plqPill__label">{f}</span>
                          <EuiButtonIcon
                            className="plqPill__remove"
                            iconType="cross"
                            color="text"
                            size="s"
                            aria-label={i18n.translate('explore.pplBuilder.removeGroupByField', {
                              defaultMessage: 'Remove {field}',
                              values: { field: f },
                            })}
                            onClick={() =>
                              dispatch({
                                type: 'SET_GROUPBY_FIELDS',
                                fields: state.groupBy.fields.filter((x) => x !== f),
                              })
                            }
                          />
                        </span>
                      ))
                    )}

                    {/* Time grouping, when present, is the LAST grouping chip —
                        a modifier pinned after the plain field chips, matching
                        PPL's `by <fields>, span(...)` order. It reads as natural
                        language ("every 1h"); the real span(...) syntax lives in
                        the tooltip, and the time field is a code-mode concern (not
                        editable here). The add-field caret trails it, so the box
                        reads `<fields> every 1h  ˅`. */}
                    {state.groupBy.span && (
                      <EuiToolTip
                        content={i18n.translate('explore.pplBuilder.spanChipTooltip', {
                          defaultMessage:
                            'span({field}, {interval}) — uses the dataset’s time field',
                          values: {
                            field: state.groupBy.span.field,
                            interval: state.groupBy.span.interval,
                          },
                        })}
                        position="top"
                      >
                        <span className="plqChip" data-test-subj="pplBuilderSpanChip">
                          <span className="plqChip__nat">
                            {i18n.translate('explore.pplBuilder.every', {
                              defaultMessage: 'every',
                            })}
                          </span>
                          <SpanIntervalMenu
                            interval={state.groupBy.span.interval}
                            isInvalid={!SPAN_INTERVAL_RE.test(state.groupBy.span.interval.trim())}
                            onChange={(interval) =>
                              dispatch({
                                type: 'SET_SPAN',
                                span: {
                                  field: state.groupBy.span!.field,
                                  interval,
                                  auto: false,
                                },
                              })
                            }
                            dataTestSubj="pplBuilderSpanInterval"
                          />
                          <EuiButtonIcon
                            className="plqX"
                            iconType="cross"
                            color="text"
                            size="s"
                            aria-label={i18n.translate('explore.pplBuilder.removeSpan', {
                              defaultMessage: 'Remove time grouping',
                            })}
                            onClick={() => dispatch({ type: 'REMOVE_SPAN' })}
                            data-test-subj="pplBuilderRemoveSpan"
                          />
                        </span>
                      </EuiToolTip>
                    )}

                    {/* Add / edit grouping — the trailing caret IS the popover
                        anchor, so the panel hangs from the dropdown icon rather
                        than centering under the wide pills box. Kept last so it
                        sits to the right of the "every" chip. */}
                    {caret}
                  </span>
                )}
              />
            </div>
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
