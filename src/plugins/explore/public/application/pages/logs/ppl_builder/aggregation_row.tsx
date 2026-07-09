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
} from '@elastic/eui';
import { BuilderAction } from './build_ppl';
import { Aggregation, AggFn } from './types';
import { AGG_FN_MAP, AGG_FUNCTIONS } from './operations';

interface AggregationRowProps {
  agg: Aggregation;
  idx: number;
  fieldOptions: EuiComboBoxOptionOption[];
  dispatch: React.Dispatch<BuilderAction>;
}

/**
 * One aggregation row: "Show <fn> of <field>" — the datadog "Show Count of all
 * logs" control. Count needs no field; other fns aggregate over a field, and
 * percentile adds a numeric percentile input.
 */
export const AggregationRow: React.FC<AggregationRowProps> = ({
  agg,
  idx,
  fieldOptions,
  dispatch,
}) => {
  const def = AGG_FN_MAP[agg.fn];
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
            style={{ minWidth: 120 }}
            data-test-subj={`pplBuilderAggField-${idx}`}
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
