/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { parsePPL } from './parse_ppl';
import { buildPPL } from './build_ppl';
import { PPLBuilderState } from './types';

// Normalize away builder-generated ids so round-trip comparisons are stable.
const stripIds = (state: PPLBuilderState) => ({
  filters: state.filters.map(({ id, ...rest }) => rest),
  aggregations: state.aggregations.map(({ id, ...rest }) => rest),
  groupBy: state.groupBy,
});

describe('parsePPL — canBuild gating', () => {
  it('treats an empty query as buildable/empty', () => {
    const result = parsePPL('');
    expect(result.canBuild).toBe(true);
    expect(result.state.filters).toHaveLength(0);
  });

  it('parses a plain source with no pipes', () => {
    const result = parsePPL('source = logs');
    expect(result.canBuild).toBe(true);
    expect(result.sourcePrefix).toBe('source = logs');
  });

  it('parses a where clause with field:value and full-text', () => {
    const result = parsePPL(
      "source = logs | where service = 'web-store' and query_string('ERROR')"
    );
    expect(result.canBuild).toBe(true);
    expect(result.sourcePrefix).toBe('source = logs');
    expect(stripIds(result.state).filters).toEqual([
      { field: 'service', op: '=', value: 'web-store', isFullText: false },
      { field: undefined, op: undefined, value: 'ERROR', isFullText: true },
    ]);
  });

  it('parses stats count by span', () => {
    const result = parsePPL('source = logs | stats count() by span(@timestamp, 1m)');
    expect(result.canBuild).toBe(true);
    expect(stripIds(result.state).aggregations).toEqual([{ fn: 'count' }]);
    expect(result.state.groupBy.span).toEqual({
      field: '@timestamp',
      interval: '1m',
      auto: false,
    });
  });

  it('parses avg with a group-by field', () => {
    const result = parsePPL('source = logs | stats avg(bytes) by service');
    expect(result.canBuild).toBe(true);
    expect(stripIds(result.state).aggregations).toEqual([{ fn: 'avg', field: 'bytes' }]);
    expect(result.state.groupBy.fields).toEqual(['service']);
  });

  it('parses percentile', () => {
    const result = parsePPL('source = logs | stats percentile(latency, 95)');
    expect(result.canBuild).toBe(true);
    expect(stripIds(result.state).aggregations).toEqual([
      { fn: 'percentile', field: 'latency', percentile: 95 },
    ]);
  });

  it.each([
    ['OR logic', "source = logs | where a = '1' or b = '2'"],
    ['NOT logic', "source = logs | where not a = '1'"],
    ['IN', 'source = logs | where a in (1, 2)'],
    ['sort command', 'source = logs | sort field'],
    ['dedup command', 'source = logs | dedup field'],
    ['head command', 'source = logs | head 10'],
    ['eval command', 'source = logs | eval x = a + b'],
    ['aliased agg', 'source = logs | stats count() as total'],
    ['where after stats', 'source = logs | stats count() | where count > 1'],
  ])('sets canBuild=false for %s', (_label, query) => {
    expect(parsePPL(query).canBuild).toBe(false);
  });
});

describe('parsePPL / buildPPL round-trip', () => {
  const cases: PPLBuilderState[] = [
    {
      filters: [{ id: 'x', field: 'service', op: '=', value: 'web-store', isFullText: false }],
      aggregations: [],
      groupBy: { fields: [] },
    },
    {
      filters: [
        { id: 'x', field: 'level', op: '!=', value: 'DEBUG', isFullText: false },
        { id: 'y', value: 'timeout', isFullText: true },
      ],
      aggregations: [],
      groupBy: { fields: [] },
    },
    {
      filters: [{ id: 'x', field: 'status', op: '>=', value: '500', isFullText: false }],
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: [], span: { field: '@timestamp', interval: '1m', auto: false } },
    },
    {
      filters: [],
      aggregations: [{ id: 'a', fn: 'avg', field: 'bytes' }],
      groupBy: { fields: ['service'] },
    },
  ];

  it.each(cases.map((c, i) => [i, c]))('round-trips case %i', (_i, state) => {
    const ppl = buildPPL(state as PPLBuilderState, 'source = logs');
    const reparsed = parsePPL(ppl);
    expect(reparsed.canBuild).toBe(true);
    expect(stripIds(reparsed.state)).toEqual(stripIds(state as PPLBuilderState));
  });
});

describe('parsePPL — malformed input', () => {
  it('returns canBuild=false on a syntax error', () => {
    expect(parsePPL('source = logs | where |').canBuild).toBe(false);
  });
});
