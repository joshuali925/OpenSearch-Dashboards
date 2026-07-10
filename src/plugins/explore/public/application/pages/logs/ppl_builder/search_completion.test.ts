/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { analyzeSearchExpression } from './search_completion';

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
