/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildPPL, builderReducer, ensureSourcePrefix } from './build_ppl';
import { PPLBuilderState, emptyState } from './types';

const SOURCE = 'source = logs';

describe('buildPPL', () => {
  it('returns just the source prefix when empty', () => {
    expect(buildPPL(emptyState(), SOURCE)).toBe('source = logs');
  });

  it('appends the search expression to the source segment (no pipe)', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      searchExpression: 'service="web-store"',
    };
    expect(buildPPL(state, SOURCE)).toBe('source = logs service="web-store"');
  });

  it('appends a boolean search expression verbatim', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      searchExpression: 'status>=500 AND service="web-store"',
    };
    expect(buildPPL(state, SOURCE)).toBe('source = logs status>=500 AND service="web-store"');
  });

  it('combines a search expression with a stats clause', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      searchExpression: 'ERROR',
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: [], span: { field: '@timestamp', interval: '1m', auto: true } },
    };
    expect(buildPPL(state, SOURCE)).toBe(
      'source = logs ERROR | stats count() by span(@timestamp, 1m)'
    );
  });

  it('compiles count() with no field', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
    };
    expect(buildPPL(state, SOURCE)).toBe('source = logs | stats count()');
  });

  it('compiles agg with field and group-by fields', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'avg', field: 'bytes' }],
      groupBy: { fields: ['service'] },
    };
    expect(buildPPL(state, SOURCE)).toBe('source = logs | stats avg(bytes) by service');
  });

  it('injects the time span into the group-by', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: [], span: { field: '@timestamp', interval: '1m', auto: true } },
    };
    expect(buildPPL(state, SOURCE)).toBe('source = logs | stats count() by span(@timestamp, 1m)');
  });

  it('combines fields and span in the group-by', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: ['service'], span: { field: '@timestamp', interval: '5m', auto: false } },
    };
    expect(buildPPL(state, SOURCE)).toBe(
      'source = logs | stats count() by service, span(@timestamp, 5m)'
    );
  });

  it('compiles percentile', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'percentile', field: 'latency', percentile: 95 }],
    };
    expect(buildPPL(state, SOURCE)).toBe('source = logs | stats percentile(latency, 95)');
  });

  it('synthesizes a source clause from the index when the prefix has none', () => {
    const state: PPLBuilderState = { ...emptyState(), searchExpression: 'ERROR' };
    expect(buildPPL(state, '', 'logs')).toBe('source = logs ERROR');
  });

  it('keeps an existing source prefix over the index fallback', () => {
    const state: PPLBuilderState = { ...emptyState(), searchExpression: 'ERROR' };
    expect(buildPPL(state, 'source = other', 'logs')).toBe('source = other ERROR');
  });

  it('emits an empty query when neither prefix nor index is available', () => {
    expect(buildPPL(emptyState(), '')).toBe('');
  });
});

describe('ensureSourcePrefix', () => {
  it('returns the prefix unchanged when it already has a source clause', () => {
    expect(ensureSourcePrefix('source = logs', 'other')).toBe('source = logs');
    expect(ensureSourcePrefix('index = logs', 'other')).toBe('index = logs');
  });

  it('synthesizes source = <index> when the prefix has no source clause', () => {
    expect(ensureSourcePrefix('', 'logs')).toBe('source = logs');
  });

  it('returns the (empty) prefix when no index is available', () => {
    expect(ensureSourcePrefix('', '')).toBe('');
    expect(ensureSourcePrefix('', undefined)).toBe('');
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
