/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Datadog-style search-box syntax <-> `SearchFilter[]` conversion.
 *
 * The "Search for" row is a single free-text box (not a set of pills). Its text
 * is a view over `state.filters`; this module converts between the two so the
 * PPL string can stay the single source of truth (parse PPL -> filters ->
 * search text on load; search text -> filters -> build PPL on edit).
 *
 * Token grammar (whitespace-separated, values may be double-quoted):
 *   field:value      -> { field, op: '=',  value }
 *   field:!=value    -> { field, op: '!=', value }
 *   field:>value     -> { field, op: '>',  value }   (also >=, <, <=)
 *   field:~value     -> { field, op: 'like', value }
 *   bareTerm         -> { isFullText: true, value: bareTerm }
 * A double-quoted segment keeps its inner whitespace; embedded quotes escape as `\"`.
 */

import { FilterOp, SearchFilter, nextFilterId } from './types';

// Longest prefixes first so `>=`/`<=`/`!=` win over `>`/`<`.
const OP_PREFIXES: Array<{ prefix: string; op: FilterOp }> = [
  { prefix: '>=', op: '>=' },
  { prefix: '<=', op: '<=' },
  { prefix: '!=', op: '!=' },
  { prefix: '>', op: '>' },
  { prefix: '<', op: '<' },
  { prefix: '~', op: 'like' },
];

/** Wrap in double quotes when the value is empty or contains whitespace/quotes/colons. */
function quoteIfNeeded(value: string): string {
  if (value === '' || /[\s":]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** Strip surrounding double quotes and unescape `\"` within a token segment. */
function unquote(text: string): string {
  const t = text.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

/** Serialize one filter to a search-box token, or '' when it can't be represented yet. */
export function filterToToken(filter: SearchFilter): string {
  if (filter.isFullText) {
    return filter.value ? quoteIfNeeded(filter.value) : '';
  }
  if (!filter.field) return '';
  const op = filter.op || '=';
  const prefix = op === '=' ? '' : OP_PREFIXES.find((p) => p.op === op)?.prefix ?? '';
  return `${filter.field}:${prefix}${quoteIfNeeded(filter.value)}`;
}

/** Serialize the committed filter list to the search-box text. */
export function filtersToSearchText(filters: SearchFilter[]): string {
  return filters.map(filterToToken).filter(Boolean).join(' ');
}

export interface RawToken {
  raw: string;
  start: number;
  end: number;
}

/**
 * Split search text into raw tokens, keeping their original offsets and treating
 * double-quoted segments (which may contain spaces) as part of a single token.
 */
export function tokenizeRaw(text: string): RawToken[] {
  const out: RawToken[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    while (i < n && text[i] === ' ') i++;
    if (i >= n) break;
    const start = i;
    let inQuote = false;
    while (i < n) {
      const c = text[i];
      if (c === '"') {
        inQuote = !inQuote;
        i++;
        continue;
      }
      if (c === ' ' && !inQuote) break;
      i++;
    }
    out.push({ raw: text.slice(start, i), start, end: i });
  }
  return out;
}

/** Index of the first unquoted `:` in a raw token, or -1 if none. */
function unquotedColonIndex(raw: string): number {
  let inQuote = false;
  for (let j = 0; j < raw.length; j++) {
    const c = raw[j];
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (c === ':' && !inQuote) return j;
  }
  return -1;
}

/** Parse a raw token into a filter (a bare term becomes a full-text filter). */
function parseRawToken(raw: string): SearchFilter {
  const colon = unquotedColonIndex(raw);
  if (colon === -1) {
    return { id: nextFilterId(), value: unquote(raw), isFullText: true };
  }
  const field = unquote(raw.slice(0, colon));
  let rhs = raw.slice(colon + 1);
  let op: FilterOp = '=';
  for (const { prefix, op: o } of OP_PREFIXES) {
    if (rhs.startsWith(prefix)) {
      op = o;
      rhs = rhs.slice(prefix.length);
      break;
    }
  }
  return { id: nextFilterId(), field, op, value: unquote(rhs), isFullText: false };
}

/** Parse the whole search-box text into filters. */
export function searchTextToFilters(text: string): SearchFilter[] {
  return tokenizeRaw(text).map((t) => parseRawToken(t.raw));
}

/** Which suggestion kind the caret position calls for, plus the token being edited. */
export interface ActiveToken {
  /** Text of the token under the caret (empty when caret is on whitespace). */
  raw: string;
  start: number;
  end: number;
  /** When the token is `field:partial`, the field name and the partial value. */
  field?: string;
  valuePartial?: string;
  /** The field-name prefix being typed when no unquoted colon is present. */
  fieldPartial?: string;
}

/** Locate the token the caret sits in/at, and classify it for suggestions. */
export function activeTokenAt(text: string, caret: number): ActiveToken {
  const tokens = tokenizeRaw(text);
  const tok = tokens.find((t) => caret >= t.start && caret <= t.end);
  if (!tok) {
    return { raw: '', start: caret, end: caret, fieldPartial: '' };
  }
  const colon = unquotedColonIndex(tok.raw);
  if (colon === -1) {
    return { raw: tok.raw, start: tok.start, end: tok.end, fieldPartial: unquote(tok.raw) };
  }
  const field = unquote(tok.raw.slice(0, colon));
  let rhs = tok.raw.slice(colon + 1);
  for (const { prefix } of OP_PREFIXES) {
    if (rhs.startsWith(prefix)) {
      rhs = rhs.slice(prefix.length);
      break;
    }
  }
  return { raw: tok.raw, start: tok.start, end: tok.end, field, valuePartial: unquote(rhs) };
}
