/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Data model for the logs PPL visual query builder.
 *
 * The PPL query string is the single source of truth; this state is *derived*
 * from it on render (see `parsePPL`) and *serialized* back to it on edit (see
 * `buildPPL`). Nothing here is persisted separately in Redux — mirrors the
 * metrics PromQL builder's `BuilderState`.
 */

/** Comparison operators the builder can represent in a `where` clause. */
export type FilterOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like';

export const FILTER_OPS: FilterOp[] = ['=', '!=', '>', '<', '>=', '<=', 'like'];

/**
 * One search-row pill. Either a structured `field <op> value` matcher, or a
 * bare full-text term (`isFullText: true`, compiled to `query_string('term')`).
 */
export interface SearchFilter {
  // Stable id generated at creation so React keys survive reorder/removal.
  id: string;
  field?: string;
  op?: FilterOp;
  value: string;
  isFullText: boolean;
}

/** Aggregation functions expressible in a PPL `stats` clause. */
export type AggFn = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percentile';

export interface Aggregation {
  id: string;
  fn: AggFn;
  // `count` needs no field; other fns aggregate over `field`. `percentile`
  // additionally uses `percentile` (e.g. 95 -> percentile(field, 95)).
  field?: string;
  percentile?: number;
}

export interface TimeBucket {
  field: string; // time field, e.g. '@timestamp'
  interval: string; // e.g. '1m', '30s'
  auto: boolean; // when true, interval is re-derived from the time range
}

export interface GroupBy {
  fields: string[];
  span?: TimeBucket;
}

export interface PPLBuilderState {
  filters: SearchFilter[];
  aggregations: Aggregation[];
  groupBy: GroupBy;
}

let filterIdCounter = 0;
export const nextFilterId = (): string => `sf-${++filterIdCounter}`;

let aggIdCounter = 0;
export const nextAggId = (): string => `ag-${++aggIdCounter}`;

export const emptyFilter = (): SearchFilter => ({
  id: nextFilterId(),
  field: '',
  op: '=',
  value: '',
  isFullText: false,
});

export const emptyState = (): PPLBuilderState => ({
  filters: [],
  aggregations: [],
  groupBy: { fields: [] },
});
