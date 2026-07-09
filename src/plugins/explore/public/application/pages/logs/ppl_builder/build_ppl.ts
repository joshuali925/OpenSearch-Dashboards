/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Aggregation,
  FilterOp,
  GroupBy,
  PPLBuilderState,
  SearchFilter,
  TimeBucket,
  emptyFilter,
  emptyState,
  nextAggId,
} from './types';

export type BuilderAction =
  | { type: 'SET_FILTER'; index: number; filter: Partial<SearchFilter> }
  | { type: 'SET_FILTERS'; filters: SearchFilter[] }
  | { type: 'ADD_FILTER' }
  | { type: 'ADD_FILTER_WITH_VALUE'; filter: Omit<SearchFilter, 'id'> }
  | { type: 'REMOVE_FILTER'; index: number }
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
    case 'SET_FILTER': {
      const filters = [...state.filters];
      filters[action.index] = { ...filters[action.index], ...action.filter };
      return { ...state, filters };
    }
    case 'SET_FILTERS':
      return { ...state, filters: action.filters };
    case 'ADD_FILTER':
      return { ...state, filters: [...state.filters, emptyFilter()] };
    case 'ADD_FILTER_WITH_VALUE':
      return {
        ...state,
        filters: [...state.filters, { id: `sf-added-${state.filters.length}`, ...action.filter }],
      };
    case 'REMOVE_FILTER':
      return { ...state, filters: state.filters.filter((_, i) => i !== action.index) };
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

function compileFullText(value: string): string {
  // Omitting the field list makes query_string search across all fields —
  // this is the round-trip target for a bare "search for" term.
  return `query_string('${escapePPLString(value)}')`;
}

function compileValue(op: FilterOp, value: string): string {
  // `like` is always a quoted pattern; comparisons keep bare numbers unquoted.
  if (op !== 'like' && isNumericLiteral(value)) {
    return value.trim();
  }
  return `'${escapePPLString(value)}'`;
}

export function compileFilter(filter: SearchFilter): string | null {
  if (filter.isFullText) {
    return filter.value.trim() ? compileFullText(filter.value.trim()) : null;
  }
  if (!filter.field || !filter.op || !filter.value.trim()) {
    return null;
  }
  return `${filter.field} ${filter.op} ${compileValue(filter.op, filter.value.trim())}`;
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
 * leading command (e.g. `source = logs`); the builder only appends the trailing
 * pipes. Returns just the prefix when the builder is empty.
 */
export function buildPPL(state: PPLBuilderState, sourcePrefix: string): string {
  const prefix = sourcePrefix.trim();
  const parts: string[] = prefix ? [prefix] : [];

  const whereClause = state.filters
    .map(compileFilter)
    .filter((c): c is string => c !== null)
    .join(' and ');
  if (whereClause) {
    parts.push(`where ${whereClause}`);
  }

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
