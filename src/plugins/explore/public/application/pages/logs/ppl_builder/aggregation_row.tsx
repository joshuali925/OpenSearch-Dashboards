/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiButtonIcon,
  EuiSuperSelect,
  EuiFieldNumber,
  EuiToolTip,
} from '@elastic/eui';
import { BuilderAction } from './build_ppl';
import { Aggregation, AggFn, ScalarCall } from './types';
import { AGG_FN_MAP, AGG_FUNCTIONS, SCALAR_FN_MAP } from './operations';
import { FunctionMenu } from './function_menu';
import { comboBoxWidth, inputWidth } from '../../metrics/promql_builder/measure_text';

interface AggregationRowProps {
  agg: Aggregation;
  idx: number;
  /** Numeric-only field options, for aggregations that require a number. */
  numericFieldOptions: EuiComboBoxOptionOption[];
  /** Any aggregatable field, for aggregations that accept non-numeric fields. */
  anyFieldOptions: EuiComboBoxOptionOption[];
  dispatch: React.Dispatch<BuilderAction>;
}

/**
 * One scalar function applied to the aggregation's field: e.g. `round`, with
 * inline inputs for any extra args (round's decimals). Each function is wrapped
 * in an EuiBadge so it reads as one discrete, self-contained token; the badge's
 * own close (✕) button removes just that function. This visually distinguishes
 * removing a scalar function (the badge ✕, inside the pill) from removing the
 * whole metric (the row-level ✕ outside any badge). Functions render to the
 * RIGHT of the field, so the row reads left-to-right as application order
 * (`field → round → abs` = `abs(round(field))`), matching the innermost-first
 * compile order.
 */
const FunctionPill: React.FC<{
  fn: ScalarCall;
  aggIdx: number;
  fnIdx: number;
  dispatch: React.Dispatch<BuilderAction>;
}> = ({ fn, aggIdx, fnIdx, dispatch }) => {
  const def = SCALAR_FN_MAP[fn.id];
  const removeLabel = i18n.translate('explore.pplBuilder.removeFunction', {
    defaultMessage: 'Remove function',
  });
  return (
    <EuiBadge
      className="plqFnBadge"
      color="hollow"
      iconType="cross"
      iconSide="right"
      iconOnClick={() => dispatch({ type: 'REMOVE_FUNCTION', index: aggIdx, fnIndex: fnIdx })}
      iconOnClickAriaLabel={removeLabel}
      data-test-subj={`pplBuilderFn-${aggIdx}-${fnIdx}`}
    >
      <span className="plqFnBadge__inner">
        <EuiToolTip content={def?.description || fn.name}>
          <span className="plqFnBadge__name">{fn.name}</span>
        </EuiToolTip>
        {fn.params.map((p, pi) => {
          const placeholder = def?.paramNames?.[pi] || '';
          const displayText = p || placeholder;
          return (
            <input
              key={pi}
              value={p}
              placeholder={placeholder}
              onChange={(e) =>
                dispatch({
                  type: 'SET_FUNCTION_PARAM',
                  index: aggIdx,
                  fnIndex: fnIdx,
                  paramIndex: pi,
                  value: e.target.value,
                })
              }
              className="plqParamInput plqFnBadge__param"
              style={{ width: inputWidth(displayText, 16, 44, 120) }}
              aria-label={placeholder || fn.name}
              data-test-subj={`pplBuilderFnParam-${aggIdx}-${fnIdx}-${pi}`}
            />
          );
        })}
      </span>
    </EuiBadge>
  );
};

/**
 * One aggregation row: "Show <fn> of <field>" — the datadog "Show Count of all
 * logs" control. Count needs no field; other fns aggregate over a field, and
 * percentile adds a numeric percentile input. When the row has a field, an
 * "Add function" menu wraps it in scalar functions (e.g. avg(round(latency))).
 */
export const AggregationRow: React.FC<AggregationRowProps> = ({
  agg,
  idx,
  numericFieldOptions,
  anyFieldOptions,
  dispatch,
}) => {
  const def = AGG_FN_MAP[agg.fn];
  // Numeric aggregations (avg/sum/…) only offer numeric fields; the rest
  // (min/max/distinct_count/earliest/…) accept any aggregatable field.
  const fieldOptions = def?.numericOnly ? numericFieldOptions : anyFieldOptions;
  return (
    <div className="plqGroup" data-test-subj={`pplBuilderAgg-${idx}`}>
      <span className="plqGroup__label">
        {i18n.translate('explore.pplBuilder.show', { defaultMessage: 'Show' })}
      </span>
      <EuiSuperSelect
        compressed
        options={AGG_FUNCTIONS.map((f) => ({ value: f.id, inputDisplay: f.label }))}
        valueOfSelected={agg.fn}
        onChange={(value) =>
          dispatch({ type: 'SET_AGGREGATION', index: idx, agg: { fn: value as AggFn } })
        }
        style={{ minWidth: 110 }}
        data-test-subj={`pplBuilderAggFn-${idx}`}
      />
      {def?.needsField && (
        <>
          <div className="plqSep" />
          <EuiComboBox
            compressed
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            placeholder={i18n.translate('explore.pplBuilder.ofField', {
              defaultMessage: 'of field',
            })}
            options={fieldOptions}
            selectedOptions={agg.field ? [{ label: agg.field }] : []}
            onChange={(selected) =>
              dispatch({
                type: 'SET_AGGREGATION',
                index: idx,
                agg: { field: selected[0]?.label || '' },
              })
            }
            onCreateOption={(val) => {
              const v = val.trim();
              if (v) dispatch({ type: 'SET_AGGREGATION', index: idx, agg: { field: v } });
            }}
            style={{ minWidth: comboBoxWidth(agg.field || 'of field') }}
            data-test-subj={`pplBuilderAggField-${idx}`}
          />
          {/* Scalar functions wrapping the field, rendered to the RIGHT of it so
              the row reads left-to-right as application order. The chain array is
              innermost-first, which matches that left-to-right reading. Each is a
              self-contained badge, so no dividers between them. */}
          {(agg.functions ?? []).map((fn, fnIdx) => (
            <FunctionPill key={fnIdx} fn={fn} aggIdx={idx} fnIdx={fnIdx} dispatch={dispatch} />
          ))}
        </>
      )}
      {agg.fn === 'percentile' && (
        <>
          <div className="plqSep" />
          <EuiFieldNumber
            compressed
            controlOnly
            value={agg.percentile ?? 95}
            min={0}
            max={100}
            onChange={(e) =>
              dispatch({
                type: 'SET_AGGREGATION',
                index: idx,
                agg: { percentile: Number(e.target.value) },
              })
            }
            className="plqParamInput"
            style={{ width: 56 }}
            aria-label={i18n.translate('explore.pplBuilder.percentileValue', {
              defaultMessage: 'Percentile',
            })}
            data-test-subj={`pplBuilderAggPercentile-${idx}`}
          />
        </>
      )}
      {/* Add-function (⋮) menu comes first, then the metric-level remove (✕) at
          the far-right edge. The ⋮ and the metric ✕ are visually separated from
          the scalar-function badges (whose own close buttons remove just that
          function), so the trailing ✕ unambiguously deletes the whole metric.
          Row reads `Show <fn> <field> <fn-badges…> │ ⋮ ✕`. */}
      <div className="plqSep" />
      {def?.needsField && (
        <FunctionMenu
          onAddFunction={(fn) => dispatch({ type: 'ADD_FUNCTION', index: idx, fn })}
          dataTestSubj={`pplBuilderAddFn-${idx}`}
        />
      )}
      <EuiButtonIcon
        iconType="cross"
        color="text"
        size="s"
        aria-label={i18n.translate('explore.pplBuilder.removeAggregation', {
          defaultMessage: 'Remove aggregation',
        })}
        onClick={() => dispatch({ type: 'REMOVE_AGGREGATION', index: idx })}
        data-test-subj={`pplBuilderRemoveAgg-${idx}`}
      />
    </div>
  );
};
