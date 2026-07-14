/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { analyzeSearchExpression, classifySearchTokens } from './search_completion';

describe('analyzeSearchExpression', () => {
  it('suggests fields on empty input', () => {
    const a = analyzeSearchExpression('', 0);
    expect(a.suggestFields).toBe(true);
    expect(a.suggestValuesForField).toBeUndefined();
  });

  it('suggests fields while typing a bare term / field name', () => {
    const a = analyzeSearchExpression('stat', 4);
    expect(a.suggestFields).toBe(true);
    expect(a.partial).toBe('stat');
    // The token under the caret is replaced, not appended.
    expect(a.replaceStart).toBe(0);
    expect(a.replaceEnd).toBe(4);
  });

  it('suggests comparison operators right after a field', () => {
    // caret right after "status" (before the operator is typed)
    const a = analyzeSearchExpression('status ', 7);
    expect(a.keywords).toEqual(expect.arrayContaining(['=', '!=', '>', '>=', '<', '<=']));
  });

  it('suggests values for the governing field after an operator', () => {
    const a = analyzeSearchExpression('status=', 7);
    expect(a.suggestValuesForField).toBe('status');
  });

  it('suggests values for the field while typing the value', () => {
    const a = analyzeSearchExpression('service=web', 11);
    expect(a.suggestValuesForField).toBe('service');
    expect(a.partial).toBe('web');
  });

  it('suggests boolean keywords after a completed comparison', () => {
    const a = analyzeSearchExpression('status=500 ', 11);
    expect(a.keywords).toEqual(expect.arrayContaining(['AND', 'OR']));
  });

  it('suggests fields again after a boolean keyword', () => {
    const a = analyzeSearchExpression('status=500 AND ', 15);
    expect(a.suggestFields).toBe(true);
  });

  it('resolves the governing field for an IN list', () => {
    const a = analyzeSearchExpression('severityText IN (', 17);
    expect(a.suggestValuesForField).toBe('severityText');
  });

  it('handles a backtick-quoted field name', () => {
    const a = analyzeSearchExpression('`resource.service`=', 19);
    expect(a.suggestValuesForField).toBe('`resource.service`');
  });
});

describe('classifySearchTokens', () => {
  // Slice each classified range back out of the query so assertions read as the
  // literal token text + its color role.
  const classify = (q: string) =>
    classifySearchTokens(q).map(({ start, end, scope }) => ({ text: q.slice(start, end), scope }));

  it('returns no tokens for empty / bare-term input', () => {
    expect(classifySearchTokens('')).toEqual([]);
    expect(classifySearchTokens('error')).toEqual([]);
  });

  it('colors the field and value of a comparison', () => {
    expect(classify('status=500')).toEqual([
      { text: 'status', scope: 'field' },
      { text: '500', scope: 'string' },
    ]);
  });

  it('colors comparisons regardless of spacing around the operator', () => {
    expect(classify('status = 500')).toEqual([
      { text: 'status', scope: 'field' },
      { text: '500', scope: 'string' },
    ]);
  });

  it('colors each field/value and the boolean keyword in an expression', () => {
    expect(classify('status=500 AND service="web"')).toEqual([
      { text: 'status', scope: 'field' },
      { text: '500', scope: 'string' },
      { text: 'AND', scope: 'keyword' },
      { text: 'service', scope: 'field' },
      { text: '"web"', scope: 'string' },
    ]);
  });

  it('colors the field before its value is typed', () => {
    expect(classify('agent=')).toEqual([{ text: 'agent', scope: 'field' }]);
  });

  it('colors IN as a keyword and its governing field', () => {
    expect(classify("severityText IN ('ERROR', 'WARN')")).toEqual([
      { text: 'severityText', scope: 'field' },
      { text: 'IN', scope: 'keyword' },
    ]);
  });
});
