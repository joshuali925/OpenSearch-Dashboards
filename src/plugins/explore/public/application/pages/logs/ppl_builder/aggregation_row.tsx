/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import {
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
 * One scalar-function chip wrapping the aggregation's field: e.g. `round`, with
 * inline inputs for any extra args (round's decimals). Rendered as a filled
 * inline token (`.plqFnChip`) rather than a nested outlined box, so it reads as
 * a tag attached to the field — not a box-inside-a-box. The wrapped field is the
 * function's first argument and is shown by the field combobox to the right.
 */
const FunctionPill: React.FC<{
  fn: ScalarCall;
  aggIdx: number;
  fnIdx: number;
  dispatch: React.Dispatch<BuilderAction>;
}> = ({ fn, aggIdx, fnIdx, dispatch }) => {
  const def = SCALAR_FN_MAP[fn.id];
  return (
    <div className="plqFnChip" data-test-subj={`pplBuilderFn-${aggIdx}-${fnIdx}`}>
      <EuiToolTip content={def?.description || fn.name}>
        <span className="plqFnChip__name">{fn.name}</span>
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
            className="plqFnChip__param"
            style={{ width: inputWidth(displayText, 12, 48, 120) }}
            aria-label={placeholder || fn.name}
            data-test-subj={`pplBuilderFnParam-${aggIdx}-${fnIdx}-${pi}`}
          />
        );
      })}
      <EuiButtonIcon
        className="plqFnChip__remove"
        iconType="cross"
        color="text"
        size="s"
        aria-label={i18n.translate('explore.pplBuilder.removeFunction', {
          defaultMessage: 'Remove function',
        })}
        onClick={() => dispatch({ type: 'REMOVE_FUNCTION', index: aggIdx, fnIndex: fnIdx })}
        data-test-subj={`pplBuilderRemoveFn-${aggIdx}-${fnIdx}`}
      />
    </div>
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
          {/* Scalar-function chain wrapping the field. The chain array is
              innermost-first (matching compile order); render it in that order
              so the field sits to the right of its functions. */}
          {(agg.functions ?? []).map((fn, fnIdx) => (
            <FunctionPill key={fnIdx} fn={fn} aggIdx={idx} fnIdx={fnIdx} dispatch={dispatch} />
          ))}
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
          <div className="plqSep" />
          <FunctionMenu
            onAddFunction={(fn) => dispatch({ type: 'ADD_FUNCTION', index: idx, fn })}
            dataTestSubj={`pplBuilderAddFn-${idx}`}
          />
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
      <div className="plqSep" />
      <EuiButtonIcon
        iconType="cross"
        color="text"
        size="s"
        aria-label={i18n.translate('explore.pplBuilder.removeAggregation', {
          defaultMessage: 'Remove aggregation',
        })}
        onClick={() => dispatch({ type: 'REMOVE_AGGREGATION', index: idx })}
      />
    </div>
  );
};
