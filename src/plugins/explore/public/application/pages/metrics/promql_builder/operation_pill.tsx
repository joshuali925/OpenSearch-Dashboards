/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { Operation } from './promql_parser';
import { BuilderAction } from './build_promql';
import {
  OperationDef,
  GROUPABLE_AGGREGATION_IDS,
  OP_DEF_MAP,
  getCategoryLabel,
} from './operation_categories';
import { useAggregationGrouping } from './aggregation_grouping';
import { comboBoxWidth, inputWidth } from './measure_text';

interface OperationPillProps {
  op: Operation;
  idx: number;
  dispatch: React.Dispatch<BuilderAction>;
  labelOptions: EuiComboBoxOptionOption[];
  getOperationSiblings: (opId: string) => OperationDef[];
}

export const OperationPill: React.FC<OperationPillProps> = ({
  op,
  idx,
  dispatch,
  labelOptions,
  getOperationSiblings,
}) => {
  const isAgg = GROUPABLE_AGGREGATION_IDS.has(op.id);
  const grouping = useAggregationGrouping(op, idx, labelOptions, dispatch);
  const opDef = OP_DEF_MAP[op.id];

  return (
    <div className="pqbGroup">
      <span className="pqbGroup__label">{getCategoryLabel(op.id)}</span>
      <div className="pqbPill__body">
        <EuiComboBox
          compressed
          singleSelection={{ asPlainText: true }}
          options={getOperationSiblings(op.id).map((s) => ({ label: s.name }))}
          selectedOptions={[{ label: op.name }]}
          onChange={(selected) => {
            const newName = selected[0]?.label || op.name;
            const newDef = getOperationSiblings(op.id).find((s) => s.name === newName);
            if (newDef) {
              dispatch({
                type: 'REPLACE_OPERATION',
                index: idx,
                operation: { id: newDef.id, name: newDef.name, params: [...newDef.params] },
              });
            }
          }}
          style={{ minWidth: comboBoxWidth(op.name, 60, 140) }}
        />
        {isAgg && <div className="pqbSep" />}
        {isAgg && grouping.modeEl}
        {isAgg && <div className="pqbSep" />}
        {isAgg && grouping.labelsComboEl}
        {op.params.length > 0 &&
          op.params.map((p, pi) => {
            const placeholder = opDef?.paramNames?.[pi] || '';
            const displayText = p || placeholder;
            return (
              <React.Fragment key={pi}>
                <div className="pqbSep" />
                <input
                  value={p}
                  placeholder={placeholder}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_OPERATION_PARAM',
                      index: idx,
                      paramIndex: pi,
                      value: e.target.value,
                    })
                  }
                  className="pqbParamInput"
                  style={{ width: inputWidth(displayText) }}
                />
              </React.Fragment>
            );
          })}
        <div className="pqbSep" />
        <EuiButtonIcon
          iconType="cross"
          size="s"
          color="text"
          aria-label={i18n.translate('explore.promqlBuilder.removeOperation', {
            defaultMessage: 'Remove operation',
          })}
          onClick={() => dispatch({ type: 'REMOVE_OPERATION', index: idx })}
        />
        <EuiToolTip content={opDef?.description || ''}>
          <EuiButtonIcon
            iconType="iInCircle"
            size="s"
            color="text"
            aria-label={i18n.translate('explore.promqlBuilder.operationInfo', {
              defaultMessage: 'Operation info',
            })}
          />
        </EuiToolTip>
      </div>
    </div>
  );
};
