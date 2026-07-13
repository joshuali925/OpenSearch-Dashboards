/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { addFilterToPPLSearchExpression, buildPPLPredicate } from './add_filter';
import { parsePPL } from './parse_ppl';

describe('buildPPLPredicate', () => {
  it('builds an equality predicate for a positive filter', () => {
    expect(buildPPLPredicate('service', 'web-store', '+')).toBe("`service` = 'web-store'");
  });

  it('builds a not-equal predicate for a negative filter', () => {
    expect(buildPPLPredicate('service', 'web-store', '-')).toBe("`service` != 'web-store'");
  });

  it('escapes single quotes in values', () => {
    expect(buildPPLPredicate('msg', "it's fine", '+')).toBe("`msg` = 'it''s fine'");
  });

  it('strips a trailing .keyword sub-field', () => {
    expect(buildPPLPredicate('service.keyword', 'web', '+')).toBe("`service` = 'web'");
  });

  it('uses ISNOTNULL for a positive null-value (exists) filter', () => {
    expect(buildPPLPredicate('service', null, '+')).toBe('ISNOTNULL(`service`)');
  });

  it('uses ISNULL for a negative null-value filter', () => {
    expect(buildPPLPredicate('service', undefined, '-')).toBe('ISNULL(`service`)');
  });
});

describe('addFilterToPPLSearchExpression', () => {
  const pred = buildPPLPredicate('service', 'web', '+');

  it('returns the query unchanged for an empty predicate', () => {
    expect(addFilterToPPLSearchExpression('source = logs', '')).toBe('source = logs');
  });

  it('sets the predicate as the whole search expression on a source-only query', () => {
    expect(addFilterToPPLSearchExpression('source = logs', pred)).toBe(
      "source = logs `service` = 'web'"
    );
  });

  it('sets the predicate as the whole expression on a source-less query', () => {
    expect(addFilterToPPLSearchExpression('', pred)).toBe("`service` = 'web'");
  });

  it('ANDs onto an existing search expression', () => {
    expect(addFilterToPPLSearchExpression('source = logs status>=500', pred)).toBe(
      "source = logs status>=500 AND `service` = 'web'"
    );
  });

  it('preserves a trailing stats pipeline', () => {
    expect(
      addFilterToPPLSearchExpression('source = logs | stats count() by span(timestamp, 1m)', pred)
    ).toBe("source = logs `service` = 'web' | stats count() by span(timestamp, 1m)");
  });

  it('is idempotent when the exact predicate already exists', () => {
    const once = addFilterToPPLSearchExpression('source = logs', pred);
    expect(addFilterToPPLSearchExpression(once, pred)).toBe(once);
  });

  it('flips an existing opposite filter in place instead of stacking', () => {
    const negated = buildPPLPredicate('service', 'web', '-');
    const withNegated = addFilterToPPLSearchExpression('source = logs', negated);
    expect(addFilterToPPLSearchExpression(withNegated, pred)).toBe(
      "source = logs `service` = 'web'"
    );
  });

  it('handles a source clause with spaces around =', () => {
    expect(addFilterToPPLSearchExpression('source=logs ERROR', pred)).toBe(
      "source=logs ERROR AND `service` = 'web'"
    );
  });

  it('produces a builder-representable query (round-trips through parsePPL)', () => {
    const result = addFilterToPPLSearchExpression('source = logs status>=500', pred);
    const parsed = parsePPL(result);
    expect(parsed.canBuild).toBe(true);
    expect(parsed.state.searchExpression).toBe("status>=500 AND `service` = 'web'");
  });

  it('round-trips a stats query with an added filter', () => {
    const result = addFilterToPPLSearchExpression('source = logs | stats count() by service', pred);
    const parsed = parsePPL(result);
    expect(parsed.canBuild).toBe(true);
    expect(parsed.state.searchExpression).toBe("`service` = 'web'");
    expect(parsed.state.aggregations).toHaveLength(1);
  });
});
