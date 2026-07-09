/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildPPL, builderReducer, escapePPLString, isNumericLiteral } from './build_ppl';
import { PPLBuilderState, emptyState } from './types';

const SOURCE = 'source = logs';

describe('buildPPL', () => {
  it('returns just the source prefix when empty', () => {
    expect(buildPPL(emptyState(), SOURCE)).toBe('source = logs');
  });

  it('compiles a single field:value filter to a where clause', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      filters: [{ id: 'a', field: 'service', op: '=', value: 'web-store', isFullText: false }],
    };
    expect(buildPPL(state, SOURCE)).toBe("source = logs | where service = 'web-store'");
  });

  it('AND-joins multiple filters and a bare full-text term', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      filters: [
        { id: 'a', field: 'service', op: '=', value: 'web-store', isFullText: false },
        { id: 'b', field: 'level', op: '!=', value: 'DEBUG', isFullText: false },
        { id: 'c', value: 'ERROR', isFullText: true },
      ],
    };
    expect(buildPPL(state, SOURCE)).toBe(
      "source = logs | where service = 'web-store' and level != 'DEBUG' and query_string('ERROR')"
    );
  });

  it('leaves numeric comparison values unquoted', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      filters: [{ id: 'a', field: 'status', op: '>=', value: '500', isFullText: false }],
    };
    expect(buildPPL(state, SOURCE)).toBe('source = logs | where status >= 500');
  });

  it('quotes a like pattern even when numeric-looking', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      filters: [{ id: 'a', field: 'msg', op: 'like', value: '5%', isFullText: false }],
    };
    expect(buildPPL(state, SOURCE)).toBe("source = logs | where msg like '5%'");
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

  it('escapes single quotes in values', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      filters: [{ id: 'a', field: 'name', op: '=', value: "O'Brien", isFullText: false }],
    };
    expect(buildPPL(state, SOURCE)).toBe("source = logs | where name = 'O\\'Brien'");
  });

  it('drops incomplete filters', () => {
    const state: PPLBuilderState = {
      ...emptyState(),
      filters: [
        { id: 'a', field: '', op: '=', value: '', isFullText: false },
        { id: 'b', field: 'ok', op: '=', value: 'yes', isFullText: false },
      ],
    };
    expect(buildPPL(state, SOURCE)).toBe("source = logs | where ok = 'yes'");
  });
});

describe('escapePPLString / isNumericLiteral', () => {
  it('escapes backslashes and quotes', () => {
    expect(escapePPLString("a\\b'c")).toBe("a\\\\b\\'c");
  });
  it('detects numeric literals', () => {
    expect(isNumericLiteral('500')).toBe(true);
    expect(isNumericLiteral('-3.14')).toBe(true);
    expect(isNumericLiteral('5xx')).toBe(false);
    expect(isNumericLiteral('')).toBe(false);
  });
});

describe('builderReducer', () => {
  it('adds and removes filters', () => {
    let state = emptyState();
    state = builderReducer(state, { type: 'ADD_FILTER' });
    expect(state.filters).toHaveLength(1);
    state = builderReducer(state, { type: 'REMOVE_FILTER', index: 0 });
    expect(state.filters).toHaveLength(0);
  });

  it('sets a filter field partially', () => {
    let state = builderReducer(emptyState(), { type: 'ADD_FILTER' });
    state = builderReducer(state, { type: 'SET_FILTER', index: 0, filter: { field: 'svc' } });
    expect(state.filters[0].field).toBe('svc');
  });

  it('adds an aggregation defaulting to count', () => {
    const state = builderReducer(emptyState(), { type: 'ADD_AGGREGATION' });
    expect(state.aggregations[0].fn).toBe('count');
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
