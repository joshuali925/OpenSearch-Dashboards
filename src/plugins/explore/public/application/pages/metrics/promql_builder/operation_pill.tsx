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
  AGGREGATION_IDS,
  OP_DEF_MAP,
  getCategoryLabel,
} from './operation_categories';
import { useAggregationGrouping } from './aggregation_grouping';
import { comboBoxWidth } from './measure_text';

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
  const isAgg = AGGREGATION_IDS.has(op.id);
  const grouping = useAggregationGrouping(op, idx, labelOptions, dispatch);
  const opDef = OP_DEF_MAP[op.id];

  return (
    <div className="pqbPill">
      <div className="pqbPill__label">{getCategoryLabel(op.id)}</div>
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
              dispatch({ type: 'REMOVE_OPERATION', index: idx });
              dispatch({
                type: 'ADD_OPERATION',
                operation: { id: newDef.id, name: newDef.name, params: [...newDef.params] },
              });
            }
          }}
          style={{ minWidth: comboBoxWidth(op.name) }}
          append={isAgg ? grouping.appendEl : undefined}
        />
        {isAgg && grouping.badgesEl}
        {op.params.length > 0 &&
          op.params.map((p, pi) => (
            <input
              key={pi}
              value={p}
              placeholder={opDef?.paramNames?.[pi] || ''}
              onChange={(e) =>
                dispatch({
                  type: 'SET_OPERATION_PARAM',
                  index: idx,
                  paramIndex: pi,
                  value: e.target.value,
                })
              }
              className="pqbParamInput"
            />
          ))}
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
