/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { analyzeSearchExpression, findFilterRanges, removeFilterRange } from './search_completion';

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

describe('findFilterRanges', () => {
  it('returns no ranges for empty / bare-term input', () => {
    expect(findFilterRanges('')).toEqual([]);
    expect(findFilterRanges('error')).toEqual([]);
  });

  it('boxes a single field=value comparison', () => {
    const q = 'status=500';
    expect(findFilterRanges(q)).toEqual([{ start: 0, end: q.length }]);
  });

  it('boxes comparisons regardless of spacing around the operator', () => {
    const q = 'status = 500';
    expect(findFilterRanges(q)).toEqual([{ start: 0, end: q.length }]);
  });

  it('boxes each filter in a boolean expression', () => {
    const q = 'status=500 AND service="web"';
    const ranges = findFilterRanges(q);
    expect(ranges).toHaveLength(2);
    expect(q.slice(ranges[0].start, ranges[0].end)).toBe('status=500');
    expect(q.slice(ranges[1].start, ranges[1].end)).toBe('service="web"');
  });

  it('boxes field and operator before the value is typed', () => {
    const q = 'agent=';
    expect(findFilterRanges(q)).toEqual([{ start: 0, end: q.length }]);
  });

  it('boxes the field=operator prefix even when followed by another filter', () => {
    const q = 'agent= AND status=500';
    const ranges = findFilterRanges(q);
    expect(ranges).toHaveLength(2);
    expect(q.slice(ranges[0].start, ranges[0].end)).toBe('agent=');
    expect(q.slice(ranges[1].start, ranges[1].end)).toBe('status=500');
  });

  it('boxes a field IN (...) list as one filter', () => {
    const q = "severityText IN ('ERROR', 'WARN')";
    const ranges = findFilterRanges(q);
    expect(ranges).toHaveLength(1);
    expect(q.slice(ranges[0].start, ranges[0].end)).toBe(q);
  });
});

describe('removeFilterRange', () => {
  // Remove the filter at the given 0-based index using the ranges the box
  // decorator would have computed, mirroring SearchBox.removeFilterAt.
  const removeNth = (q: string, index: number) => removeFilterRange(q, findFilterRanges(q)[index]);

  it('removes the only filter, leaving an empty expression', () => {
    expect(removeNth('status=500', 0)).toBe('');
  });

  it('removes the first filter and collapses the seam', () => {
    expect(removeNth('status=500 service="web"', 0)).toBe('service="web"');
  });

  it('removes the last filter and collapses the seam', () => {
    expect(removeNth('status=500 service="web"', 1)).toBe('status=500');
  });

  it('removes a middle filter, single-spacing the neighbours', () => {
    expect(removeNth('status=500 extension="gz" service="web"', 1)).toBe(
      'status=500 service="web"'
    );
  });

  it('preserves whitespace inside a surviving quoted value', () => {
    const q = `status=500 \`machine.os\` = 'win 7'`;
    expect(removeNth(q, 0)).toBe(`\`machine.os\` = 'win 7'`);
  });

  it('drops a dangling AND when the first of two keyword-joined filters is removed', () => {
    expect(removeNth('status=500 AND service="web"', 0)).toBe('service="web"');
  });

  it('drops a dangling AND when the last of two keyword-joined filters is removed', () => {
    expect(removeNth('status=500 AND service="web"', 1)).toBe('status=500');
  });
});
