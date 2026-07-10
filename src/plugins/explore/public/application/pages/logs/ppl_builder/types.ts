/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Data model for the logs PPL visual query builder.
 *
 * The PPL query string is the single source of truth; this state is *derived*
 * from it on render (see `parsePPL`) and *serialized* back to it on edit (see
 * `buildPPL`). Nothing here is persisted separately in Redux.
 *
 * The "Search for" row holds a raw PPL **search-expression** string (the syntax
 * accepted by the `search` command after `source=<index>`: full-text terms,
 * `field <op> value`, `IN (...)`, `AND`/`OR`/`NOT`, parentheses, wildcards, and
 * `earliest=`/`latest=` time modifiers). It is stored verbatim so any valid
 * search expression round-trips; structured pills are not used.
 */

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
  // Raw PPL search-expression text for the "Search for" row (may be empty).
  searchExpression: string;
  aggregations: Aggregation[];
  groupBy: GroupBy;
}

let aggIdCounter = 0;
export const nextAggId = (): string => `ag-${++aggIdCounter}`;

export const emptyState = (): PPLBuilderState => ({
  searchExpression: '',
  aggregations: [],
  groupBy: { fields: [] },
});
