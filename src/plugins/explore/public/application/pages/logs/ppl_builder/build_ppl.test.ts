/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildPPL, builderReducer } from './build_ppl';
import { PPLBuilderState, emptyState } from './types';

describe('buildPPL — source-less output', () => {
  it('returns an empty string when the state is empty', () => {
    expect(buildPPL(emptyState())).toBe('');
  });

  it('emits just the search expression (no source clause)', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      searchExpression: 'service="web-store"',
    };
    expect(buildPPL(state)).toBe('service="web-store"');
  });

  it('emits a boolean search expression verbatim', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      searchExpression: 'status>=500 AND service="web-store"',
    };
    expect(buildPPL(state)).toBe('status>=500 AND service="web-store"');
  });

  it('combines a search expression with a stats clause', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      searchExpression: 'ERROR',
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: [], span: { field: '@timestamp', interval: '1m', auto: true } },
    };
    expect(buildPPL(state)).toBe('ERROR | stats count() by span(@timestamp, 1m)');
  });

  it('leads a stats-only query with a pipe so the source clause prepends cleanly', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
    };
    expect(buildPPL(state)).toBe('| stats count()');
  });

  it('compiles agg with field and group-by fields (stats-only, leading pipe)', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'avg', field: 'bytes' }],
      groupBy: { fields: ['service'] },
    };
    expect(buildPPL(state)).toBe('| stats avg(bytes) by service');
  });

  it('injects the time span into the group-by', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: [], span: { field: '@timestamp', interval: '1m', auto: true } },
    };
    expect(buildPPL(state)).toBe('| stats count() by span(@timestamp, 1m)');
  });

  it('combines fields and span in the group-by', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: ['service'], span: { field: '@timestamp', interval: '5m', auto: false } },
    };
    expect(buildPPL(state)).toBe('| stats count() by service, span(@timestamp, 5m)');
  });

  it('compiles percentile', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'percentile', field: 'latency', percentile: 95 }],
    };
    expect(buildPPL(state)).toBe('| stats percentile(latency, 95)');
  });
});

describe('builderReducer', () => {
  it('sets the search expression', () => {
    const state = builderReducer(emptyState(), {
      type: 'SET_SEARCH_EXPRESSION',
      searchExpression: 'status>=500',
    });
    expect(state.searchExpression).toBe('status>=500');
  });

  it('adds an aggregation defaulting to count', () => {
    const state = builderReducer(emptyState(), { type: 'ADD_AGGREGATION' });
    expect(state.aggregations[0].fn).toBe('count');
  });

  it('removes an aggregation by index', () => {
    let state = builderReducer(emptyState(), { type: 'ADD_AGGREGATION' });
    state = builderReducer(state, { type: 'ADD_AGGREGATION', agg: { fn: 'avg', field: 'b' } });
    state = builderReducer(state, { type: 'REMOVE_AGGREGATION', index: 0 });
    expect(state.aggregations).toHaveLength(1);
    expect(state.aggregations[0].fn).toBe('avg');
  });

  it('sets and removes the span', () => {
    let state = builderReducer(emptyState(), {
      type: 'SET_SPAN',
      span: { field: '@timestamp', interval: '1m', auto: true },
    });
    expect(state.groupBy.span?.interval).toBe('1m');
    state = builderReducer(state, { type: 'REMOVE_SPAN' });
    expect(state.groupBy.span).toBeUndefined();
  });
});
