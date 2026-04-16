/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BuilderState,
  LabelFilter,
  Operation,
  OperationGrouping,
  RANGE_FUNCTIONS,
} from './promql_parser';
import { AGGREGATION_IDS } from './operation_categories';

export type BuilderAction =
  | { type: 'SET_METRIC'; metric: string }
  | { type: 'SET_LABEL_FILTER'; index: number; filter: Partial<LabelFilter> }
  | { type: 'ADD_LABEL_FILTER' }
  | { type: 'REMOVE_LABEL_FILTER'; index: number }
  | { type: 'ADD_OPERATION'; operation: Operation }
  | { type: 'REMOVE_OPERATION'; index: number }
  | { type: 'SET_OPERATION_PARAM'; index: number; paramIndex: number; value: string }
  | { type: 'SET_OPERATION_GROUPING'; index: number; grouping: OperationGrouping | undefined }
  | { type: 'INIT'; state: BuilderState }
  | { type: 'RESET' };

export const emptyFilter = (): LabelFilter => ({ label: '', op: '=', value: '' });

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_METRIC':
      return { ...state, metric: action.metric };
    case 'SET_LABEL_FILTER': {
      const filters = [...state.labelFilters];
      filters[action.index] = { ...filters[action.index], ...action.filter };
      return { ...state, labelFilters: filters };
    }
    case 'ADD_LABEL_FILTER':
      return { ...state, labelFilters: [...state.labelFilters, emptyFilter()] };
    case 'REMOVE_LABEL_FILTER':
      return { ...state, labelFilters: state.labelFilters.filter((_, i) => i !== action.index) };
    case 'ADD_OPERATION':
      return { ...state, operations: [...state.operations, action.operation] };
    case 'REMOVE_OPERATION':
      return { ...state, operations: state.operations.filter((_, i) => i !== action.index) };
    case 'SET_OPERATION_PARAM': {
      const ops = [...state.operations];
      const params = [...ops[action.index].params];
      params[action.paramIndex] = action.value;
      ops[action.index] = { ...ops[action.index], params };
      return { ...state, operations: ops };
    }
    case 'SET_OPERATION_GROUPING': {
      const ops = [...state.operations];
      ops[action.index] = { ...ops[action.index], grouping: action.grouping };
      return { ...state, operations: ops };
    }
    case 'INIT':
      return action.state;
    case 'RESET':
      return { metric: '', labelFilters: [emptyFilter()], operations: [] };
    default:
      return state;
  }
}

export function buildPromQL(state: BuilderState): string {
  if (!state.metric) return '';

  const matchers = state.labelFilters
    .filter((f) => f.label && f.value)
    .map((f) => `${f.label}${f.op}"${f.value}"`);

  let selector = state.metric;
  if (matchers.length > 0) {
    selector = `${state.metric}{${matchers.join(', ')}}`;
  }

  let expr = selector;
  for (const op of state.operations) {
    if (RANGE_FUNCTIONS.has(op.id)) {
      const interval = op.params[0] || '5m';
      expr = `${op.id}(${expr}[${interval}])`;
    } else if (AGGREGATION_IDS.has(op.id)) {
      const groupingClause = op.grouping?.labels?.length
        ? ` ${op.grouping.mode} (${op.grouping.labels.join(', ')})`
        : '';
      expr = `${op.id}${groupingClause}(${expr})`;
    } else if (['topk', 'bottomk'].includes(op.id)) {
      expr = `${op.id}(${op.params[0] || '5'}, ${expr})`;
    } else if (op.id === 'count_values') {
      expr = `count_values("${op.params[0] || 'value'}", ${expr})`;
    } else if (op.id === 'quantile') {
      expr = `quantile(${op.params[0] || '0.95'}, ${expr})`;
    } else if (op.id === 'histogram_quantile') {
      expr = `histogram_quantile(${op.params[0] || '0.95'}, ${expr})`;
    } else if (['add', 'sub', 'mul', 'div', 'mod', 'pow'].includes(op.id)) {
      const opSymbol: Record<string, string> = {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%',
        pow: '^',
      };
      expr = `${expr} ${opSymbol[op.id]} ${op.params[0] || '0'}`;
    } else if (op.id === 'label_replace') {
      const [dst = '', replacement = '', src = '', regex = ''] = op.params;
      expr = `label_replace(${expr}, "${dst}", "${replacement}", "${src}", "${regex}")`;
    } else if (op.id === 'literal') {
      expr = op.params[0] || '0';
    } else {
      const paramStr = op.params.length > 0 ? ', ' + op.params.join(', ') : '';
      expr = `${op.id}(${expr}${paramStr})`;
    }
  }

  return expr;
}
