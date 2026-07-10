/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './ppl_builder.scss';

import React, { useCallback, useMemo, useReducer, useRef, useState, useEffect } from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiComboBox,
  EuiFieldText,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../../types';
import { createHistogramConfigs } from '../../../../components/chart/utils';
import { builderReducer, buildPPL } from './build_ppl';
import { PPLBuilderState, emptyState } from './types';
import { SearchBox } from './search_box';
import { AggregationRow } from './aggregation_row';
import { useFieldData } from './use_field_data';
import { useDatasetContext } from '../../../context';

interface PPLBuilderProps {
  sourcePrefix: string;
  initialState?: PPLBuilderState;
  onQueryChange: (query: string, state: PPLBuilderState) => void;
}

// Target bar count for the auto time-bucket, matching the traces chart's density.
const CHART_BAR_TARGET = 15;

export const PPLBuilder: React.FC<PPLBuilderProps> = ({
  sourcePrefix,
  initialState,
  onQueryChange,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { dataset } = useDatasetContext();
  const [state, dispatch] = useReducer(builderReducer, initialState || emptyState());
  const {
    fieldNames,
    fieldOptions,
    numericAndAggregatableOptions,
    timeFieldName,
    getValues,
  } = useFieldData();

  // The search box owns its text (the search-expression, source of truth for the
  // row). Seeded once from the initial state; the parent remounts (via key) to
  // re-seed on external changes, mirroring how MetricsQueryPanel re-inits rows.
  const [searchText, setSearchText] = useState(
    () => (initialState || emptyState()).searchExpression
  );

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

  // Fall back to the dataset title so the built query always names an index,
  // even when `sourcePrefix` arrives without a `source =` clause.
  const datasetTitle = (dataset as any)?.title as string | undefined;
  const query = useMemo(() => buildPPL(state, sourcePrefix, datasetTitle), [
    state,
    sourcePrefix,
    datasetTitle,
  ]);

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

      {/* Group / aggregate row */}
      <div className="plqRow">
        <span className="plqRow__label">
          {i18n.translate('explore.pplBuilder.groupInto', { defaultMessage: 'Group into' })}
        </span>
        {state.aggregations.map((agg, idx) => (
          <AggregationRow
            key={agg.id}
            agg={agg}
            idx={idx}
            fieldOptions={numericAndAggregatableOptions}
            dispatch={dispatch}
          />
        ))}
        <EuiButtonEmpty
          size="xs"
          iconType="plusInCircle"
          onClick={() => dispatch({ type: 'ADD_AGGREGATION' })}
          data-test-subj="pplBuilderAddAggregation"
        >
          {i18n.translate('explore.pplBuilder.addMetric', { defaultMessage: 'Add metric' })}
        </EuiButtonEmpty>

        {hasAggregation && (
          <>
            <span className="plqRow__label">
              {i18n.translate('explore.pplBuilder.by', { defaultMessage: 'by' })}
            </span>
            <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
              <EuiComboBox
                compressed
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
            </EuiFlexItem>

            {/* Time bucket (span) chip */}
            {state.groupBy.span ? (
              <div className="plqGroup" data-test-subj="pplBuilderSpanChip">
                <span className="plqGroup__label">
                  {i18n.translate('explore.pplBuilder.span', { defaultMessage: 'Time bucket' })}
                </span>
                <EuiFieldText
                  compressed
                  controlOnly
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
                    defaultMessage: 'Time bucket interval',
                  })}
                  data-test-subj="pplBuilderSpanInterval"
                />
                <div className="plqSep" />
                <EuiButtonIcon
                  iconType="cross"
                  color="text"
                  size="s"
                  aria-label={i18n.translate('explore.pplBuilder.removeSpan', {
                    defaultMessage: 'Remove time bucket',
                  })}
                  onClick={toggleSpan}
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
                  defaultMessage: 'Add time bucket',
                })}
              </EuiButtonEmpty>
            )}
          </>
        )}
      </div>

      {/* Live PPL preview */}
      <div className="plqQueryPreviewStrip" data-test-subj="pplBuilderQueryPreview">
        <EuiCode language="sql" transparentBackground className="plqQueryPreview">
          {query ||
            i18n.translate('explore.pplBuilder.previewPlaceholder', {
              defaultMessage: 'Add a filter or metric to build a query.',
            })}
        </EuiCode>
      </div>
    </div>
  );
};
