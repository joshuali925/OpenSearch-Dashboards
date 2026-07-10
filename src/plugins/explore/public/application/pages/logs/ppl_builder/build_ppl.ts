/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Aggregation, GroupBy, PPLBuilderState, TimeBucket, emptyState, nextAggId } from './types';

export type BuilderAction =
  | { type: 'SET_SEARCH_EXPRESSION'; searchExpression: string }
  | { type: 'ADD_AGGREGATION'; agg?: Partial<Aggregation> }
  | { type: 'SET_AGGREGATION'; index: number; agg: Partial<Aggregation> }
  | { type: 'REMOVE_AGGREGATION'; index: number }
  | { type: 'SET_GROUPBY_FIELDS'; fields: string[] }
  | { type: 'SET_SPAN'; span: TimeBucket }
  | { type: 'REMOVE_SPAN' }
  | { type: 'INIT'; state: PPLBuilderState }
  | { type: 'RESET' };

export function builderReducer(state: PPLBuilderState, action: BuilderAction): PPLBuilderState {
  switch (action.type) {
    case 'SET_SEARCH_EXPRESSION':
      return { ...state, searchExpression: action.searchExpression };
    case 'ADD_AGGREGATION':
      return {
        ...state,
        aggregations: [...state.aggregations, { id: nextAggId(), fn: 'count', ...action.agg }],
      };
    case 'SET_AGGREGATION': {
      const aggregations = [...state.aggregations];
      aggregations[action.index] = { ...aggregations[action.index], ...action.agg };
      return { ...state, aggregations };
    }
    case 'REMOVE_AGGREGATION':
      return {
        ...state,
        aggregations: state.aggregations.filter((_, i) => i !== action.index),
      };
    case 'SET_GROUPBY_FIELDS':
      return { ...state, groupBy: { ...state.groupBy, fields: action.fields } };
    case 'SET_SPAN':
      return { ...state, groupBy: { ...state.groupBy, span: action.span } };
    case 'REMOVE_SPAN': {
      const { span: _span, ...rest } = state.groupBy;
      return { ...state, groupBy: rest };
    }
    case 'INIT':
      return action.state;
    case 'RESET':
      return emptyState();
    default:
      return state;
  }
}

export function compileAggregation(agg: Aggregation): string | null {
  switch (agg.fn) {
    case 'count':
      // Datadog "Count of all logs" — count all rows, no field argument.
      return 'count()';
    case 'percentile':
      if (!agg.field) return null;
      return `percentile(${agg.field}, ${agg.percentile ?? 95})`;
    default:
      if (!agg.field) return null;
      return `${agg.fn}(${agg.field})`;
  }
}

function compileGroupBy(groupBy: GroupBy): string {
  const parts: string[] = [...groupBy.fields.filter(Boolean)];
  if (groupBy.span) {
    parts.push(`span(${groupBy.span.field}, ${groupBy.span.interval})`);
  }
  return parts.join(', ');
}

/**
 * Serialize builder state to a **source-less** PPL query — just the user's
 * search expression plus any trailing `| stats … by …`. The leading
 * `source = <index>` clause is deliberately omitted: it is the dataset's
 * concern, hidden from the builder UI, and prepended automatically by the
 * execution layer (`addPPLSourceClause`) when the query is run. This keeps the
 * builder preview and the Code editor showing only what the user typed
 * (e.g. `event.dataset=sample_web_logs`), mirroring how a user types in Code
 * mode.
 */
export function buildPPL(state: PPLBuilderState): string {
  const searchExpr = (state.searchExpression || '').trim();

  const parts: string[] = searchExpr ? [searchExpr] : [];

  if (state.aggregations.length > 0) {
    const aggStr = state.aggregations
      .map(compileAggregation)
      .filter((c): c is string => c !== null)
      .join(', ');
    if (aggStr) {
      let statsClause = `stats ${aggStr}`;
      const by = compileGroupBy(state.groupBy);
      if (by) {
        statsClause += ` by ${by}`;
      }
      parts.push(statsClause);
    }
  }

  // A stats clause with no leading search expression must start with a pipe so
  // that the auto-prepended source clause produces valid PPL
  // (`source = <index> | stats …`, not `source = <index> stats …`).
  if (parts.length > 0 && !searchExpr) {
    return `| ${parts.join(' | ')}`;
  }
  return parts.join(' | ');
}
