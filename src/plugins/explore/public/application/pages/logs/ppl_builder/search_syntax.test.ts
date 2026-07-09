/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  activeTokenAt,
  filterToToken,
  filtersToSearchText,
  searchTextToFilters,
  tokenizeRaw,
} from './search_syntax';
import { SearchFilter } from './types';

// Compare filters ignoring their generated ids.
const strip = (f: SearchFilter) => ({
  field: f.field,
  op: f.op,
  value: f.value,
  isFullText: f.isFullText,
});

describe('filtersToSearchText', () => {
  it('serializes equality, comparison, like, and full-text filters', () => {
    const filters: SearchFilter[] = [
      { id: '1', field: 'service', op: '=', value: 'web', isFullText: false },
      { id: '2', field: 'status', op: '>=', value: '500', isFullText: false },
      { id: '3', field: 'msg', op: 'like', value: 'oom', isFullText: false },
      { id: '4', value: 'error', isFullText: true },
    ];
    expect(filtersToSearchText(filters)).toBe('service:web status:>=500 msg:~oom error');
  });

  it('quotes values containing spaces and full-text phrases', () => {
    expect(
      filterToToken({ id: '1', field: 'service', op: '=', value: 'web store', isFullText: false })
    ).toBe('service:"web store"');
    expect(filterToToken({ id: '2', value: 'fatal error', isFullText: true })).toBe(
      '"fatal error"'
    );
  });

  it('drops filters that have no field or value yet', () => {
    const filters: SearchFilter[] = [
      { id: '1', field: '', op: '=', value: '', isFullText: false },
      { id: '2', field: 'ok', op: '=', value: 'yes', isFullText: false },
    ];
    expect(filtersToSearchText(filters)).toBe('ok:yes');
  });
});

describe('searchTextToFilters', () => {
  it('parses field:value, comparisons, like, and bare terms', () => {
    expect(searchTextToFilters('service:web status:>=500 msg:~oom error').map(strip)).toEqual([
      { field: 'service', op: '=', value: 'web', isFullText: false },
      { field: 'status', op: '>=', value: '500', isFullText: false },
      { field: 'msg', op: 'like', value: 'oom', isFullText: false },
      { field: undefined, op: undefined, value: 'error', isFullText: true },
    ]);
  });

  it('keeps whitespace inside quoted values', () => {
    expect(searchTextToFilters('service:"web store" "fatal error"').map(strip)).toEqual([
      { field: 'service', op: '=', value: 'web store', isFullText: false },
      { field: undefined, op: undefined, value: 'fatal error', isFullText: true },
    ]);
  });

  it('round-trips with filtersToSearchText', () => {
    const text = 'service:web status:>=500 msg:~oom error';
    expect(filtersToSearchText(searchTextToFilters(text))).toBe(text);
  });
});

describe('tokenizeRaw', () => {
  it('tracks offsets and treats quoted spans as one token', () => {
    const toks = tokenizeRaw('a:1 "two words" b');
    expect(toks.map((t) => t.raw)).toEqual(['a:1', '"two words"', 'b']);
    expect(toks[0].start).toBe(0);
    expect(toks[1].start).toBe(4);
  });
});

describe('activeTokenAt', () => {
  it('classifies a field-name-in-progress token', () => {
    const tok = activeTokenAt('serv', 4);
    expect(tok.fieldPartial).toBe('serv');
    expect(tok.field).toBeUndefined();
  });

  it('classifies a value-in-progress token and exposes the field + partial', () => {
    const tok = activeTokenAt('service:web', 11);
    expect(tok.field).toBe('service');
    expect(tok.valuePartial).toBe('web');
  });

  it('strips a leading operator from the value partial', () => {
    const tok = activeTokenAt('status:>=5', 10);
    expect(tok.field).toBe('status');
    expect(tok.valuePartial).toBe('5');
  });

  it('returns an empty field partial when the caret is on whitespace', () => {
    const tok = activeTokenAt('a:1 ', 4);
    expect(tok.fieldPartial).toBe('');
  });
});
