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

/** PPL string literals use single quotes; escape embedded quotes and backslashes. */
export function escapePPLString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** A bare number (int/float, optional sign) can be emitted unquoted in a comparison. */
export function isNumericLiteral(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value.trim());
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
 * Serialize builder state to a PPL query. `sourcePrefix` is the dataset-owned
 * leading command (e.g. `source = logs`). The search expression is appended to
 * the source segment (the PPL `search` command syntax:
 * `source=<index> <search-expression>`), and aggregations become a trailing
 * `| stats … by …`. Returns just the prefix when the builder is empty.
 */
export function buildPPL(state: PPLBuilderState, sourcePrefix: string): string {
  const prefix = sourcePrefix.trim();
  const searchExpr = (state.searchExpression || '').trim();

  // The search expression lives on the same segment as source= (no pipe).
  const sourceSegment = [prefix, searchExpr].filter(Boolean).join(' ');
  const parts: string[] = sourceSegment ? [sourceSegment] : [];

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

  return parts.join(' | ');
}
