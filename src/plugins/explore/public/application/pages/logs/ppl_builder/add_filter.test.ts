/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addFilterToPPLQuery,
  addFilterToPPLSearchExpression,
  addFilterToPPLWhereCommand,
  buildPPLPredicate,
} from './add_filter';
import { parsePPL } from './parse_ppl';

describe('buildPPLPredicate', () => {
  it('builds an equality predicate for a positive filter', () => {
    expect(buildPPLPredicate('service', 'web-store', '+')).toBe("`service`='web-store'");
  });

  it('builds a not-equal predicate for a negative filter', () => {
    expect(buildPPLPredicate('service', 'web-store', '-')).toBe("`service`!='web-store'");
  });

  it('escapes single quotes in values', () => {
    expect(buildPPLPredicate('msg', "it's fine", '+')).toBe("`msg`='it''s fine'");
  });

  it('strips a trailing .keyword sub-field', () => {
    expect(buildPPLPredicate('service.keyword', 'web', '+')).toBe("`service`='web'");
  });

  it('uses ISNOTNULL for a positive null-value (exists) filter', () => {
    expect(buildPPLPredicate('service', null, '+')).toBe('ISNOTNULL(`service`)');
  });

  it('uses ISNULL for a negative null-value filter', () => {
    expect(buildPPLPredicate('service', undefined, '-')).toBe('ISNULL(`service`)');
  });

  it('emits a boolean value bare (not quoted) so it compares as a boolean', () => {
    expect(buildPPLPredicate('cancelled', false, '+')).toBe('`cancelled`=false');
    expect(buildPPLPredicate('cancelled', true, '-')).toBe('`cancelled`!=true');
  });

  it('emits a numeric value bare (not quoted)', () => {
    expect(buildPPLPredicate('status', 500, '+')).toBe('`status`=500');
    expect(buildPPLPredicate('status', 0, '-')).toBe('`status`!=0');
  });
});

describe('addFilterToPPLSearchExpression', () => {
  const pred = buildPPLPredicate('service', 'web', '+');

  it('returns the query unchanged for an empty predicate', () => {
    expect(addFilterToPPLSearchExpression('source = logs', '')).toBe('source = logs');
  });

  it('sets the predicate as the whole search expression on a source-only query', () => {
    expect(addFilterToPPLSearchExpression('source = logs', pred)).toBe(
      "source = logs `service`='web'"
    );
  });

  it('sets the predicate as the whole expression on a source-less query', () => {
    expect(addFilterToPPLSearchExpression('', pred)).toBe("`service`='web'");
  });

  it('space-appends onto an existing search expression', () => {
    expect(addFilterToPPLSearchExpression('source = logs status>=500', pred)).toBe(
      "source = logs status>=500 `service`='web'"
    );
  });

  it('preserves a trailing stats pipeline', () => {
    expect(
      addFilterToPPLSearchExpression('source = logs | stats count() by span(timestamp, 1m)', pred)
    ).toBe("source = logs `service`='web' | stats count() by span(timestamp, 1m)");
  });

  it('is idempotent when the exact predicate already exists', () => {
    const once = addFilterToPPLSearchExpression('source = logs', pred);
    expect(addFilterToPPLSearchExpression(once, pred)).toBe(once);
  });

  it('flips an existing opposite filter in place instead of stacking', () => {
    const negated = buildPPLPredicate('service', 'web', '-');
    const withNegated = addFilterToPPLSearchExpression('source = logs', negated);
    expect(addFilterToPPLSearchExpression(withNegated, pred)).toBe("source = logs `service`='web'");
  });

  it('handles a source clause with spaces around =', () => {
    expect(addFilterToPPLSearchExpression('source=logs ERROR', pred)).toBe(
      "source=logs ERROR `service`='web'"
    );
  });

  it('produces a builder-representable query (round-trips through parsePPL)', () => {
    const result = addFilterToPPLSearchExpression('source = logs status>=500', pred);
    const parsed = parsePPL(result);
    expect(parsed.canBuild).toBe(true);
    expect(parsed.state.searchExpression).toBe("status>=500 `service`='web'");
  });

  it('round-trips a stats query with an added filter', () => {
    const result = addFilterToPPLSearchExpression('source = logs | stats count() by service', pred);
    const parsed = parsePPL(result);
    expect(parsed.canBuild).toBe(true);
    expect(parsed.state.searchExpression).toBe("`service`='web'");
    expect(parsed.state.aggregations).toHaveLength(1);
  });
});

describe('addFilterToPPLWhereCommand', () => {
  it('returns the query unchanged for an empty predicate', () => {
    expect(addFilterToPPLWhereCommand('source = logs', '')).toBe('source = logs');
  });

  it('inserts a WHERE command after the source clause', () => {
    expect(addFilterToPPLWhereCommand('source = logs', 'ISNOTNULL(`service`)')).toBe(
      'source = logs | WHERE ISNOTNULL(`service`)'
    );
  });

  it('inserts before an existing stats pipeline', () => {
    expect(
      addFilterToPPLWhereCommand('source = logs | stats count()', 'ISNOTNULL(`service`)')
    ).toBe('source = logs | WHERE ISNOTNULL(`service`) | stats count()');
  });

  it('is idempotent when the exact WHERE command already exists', () => {
    const once = addFilterToPPLWhereCommand('source = logs', 'ISNOTNULL(`service`)');
    expect(addFilterToPPLWhereCommand(once, 'ISNOTNULL(`service`)')).toBe(once);
  });

  it('flips an existing opposite WHERE command in place', () => {
    const withNull = addFilterToPPLWhereCommand('source = logs', 'ISNULL(`service`)');
    expect(addFilterToPPLWhereCommand(withNull, 'ISNOTNULL(`service`)')).toBe(
      'source = logs | WHERE ISNOTNULL(`service`)'
    );
  });
});

describe('addFilterToPPLQuery', () => {
  it('merges a value filter into the search expression (builder-representable)', () => {
    const result = addFilterToPPLQuery('source = logs', 'service', 'web', '+');
    expect(result).toBe("source = logs `service`='web'");
    expect(parsePPL(result).canBuild).toBe(true);
  });

  it('merges a not-equal value filter into the search expression', () => {
    expect(addFilterToPPLQuery('source = logs', 'service', 'web', '-')).toBe(
      "source = logs `service`!='web'"
    );
  });

  it('accepts a field object, reading its name', () => {
    expect(addFilterToPPLQuery('source = logs', { name: 'service' } as any, 'web', '+')).toBe(
      "source = logs `service`='web'"
    );
  });

  it('merges a boolean value bare (table cells pass real booleans, not strings)', () => {
    const result = addFilterToPPLQuery('source = logs', 'cancelled', false, '+');
    expect(result).toBe('source = logs `cancelled`=false');
    expect(parsePPL(result).canBuild).toBe(true);
  });

  it('merges a numeric value bare', () => {
    expect(addFilterToPPLQuery('source = logs', 'status', 404, '-')).toBe(
      'source = logs `status`!=404'
    );
  });

  it('routes an exists filter to a WHERE command (values carries the field name)', () => {
    expect(addFilterToPPLQuery('source = logs', '_exists_', 'service', '+')).toBe(
      'source = logs | WHERE ISNOTNULL(`service`)'
    );
  });

  it('routes a negative exists filter to an ISNULL WHERE command', () => {
    expect(addFilterToPPLQuery('source = logs', '_exists_', 'service', '-')).toBe(
      'source = logs | WHERE ISNULL(`service`)'
    );
  });
});
