/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharStream, CommonTokenStream, Token } from 'antlr4ng';
import { CodeCompletionCore } from 'antlr4-c3';
import { PPLSearchLexer, PPLSearchParser } from '@osd/antlr-grammar';

/**
 * Grammar-driven analysis of the "Search for" expression at a cursor position.
 *
 * This drives autocomplete for the PPL `search` command's search-expression
 * syntax ONLY (full-text terms, `field <op> value`, `IN (...)`, `AND`/`OR`/`NOT`,
 * parentheses) — not the full PPL pipeline. It uses antlr4-c3's
 * {@link CodeCompletionCore} over the restricted {@link PPLSearchParser} so that
 * fields, values, operators, and boolean keywords are each suggested only where
 * the grammar actually permits them at the caret.
 */
export interface SearchAnalysis {
  /** Suggest field names (cursor is where a field / bare term is expected). */
  suggestFields: boolean;
  /** When set, suggest values for this field (cursor is on a comparison RHS). */
  suggestValuesForField?: string;
  /** Operator / boolean-keyword texts valid at the caret (e.g. `=`, `AND`). */
  keywords: string[];
  /** Char range [start, end) of the token under the caret, for replacement. */
  replaceStart: number;
  replaceEnd: number;
  /** The partial text already typed for the token under the caret. */
  partial: string;
}

// Operators and boolean keywords, mapped to the text we surface. Comparison
// operators use their literal symbol; keywords use their upper-case name.
const OPERATOR_TOKENS: Record<number, string> = {
  [PPLSearchParser.EQ]: '=',
  [PPLSearchParser.NEQ]: '!=',
  [PPLSearchParser.GT]: '>',
  [PPLSearchParser.GE]: '>=',
  [PPLSearchParser.LT]: '<',
  [PPLSearchParser.LE]: '<=',
};
const KEYWORD_TOKENS: Record<number, string> = {
  [PPLSearchParser.AND]: 'AND',
  [PPLSearchParser.OR]: 'OR',
  [PPLSearchParser.NOT]: 'NOT',
  [PPLSearchParser.IN]: 'IN',
};

const WS = PPLSearchParser.WS;
const VALUE_LIKE = new Set<number>([
  PPLSearchParser.PHRASE,
  PPLSearchParser.TERM,
  PPLSearchParser.BACKTICK,
]);
const COMPARISON_OPS = new Set<number>([
  PPLSearchParser.EQ,
  PPLSearchParser.NEQ,
  PPLSearchParser.GT,
  PPLSearchParser.GE,
  PPLSearchParser.LT,
  PPLSearchParser.LE,
]);

/** Exclusive 0-based char offset where a token ends. */
const tokenEnd = (t: Token) => t.column + (t.text?.length || 0);

/** Find the 1-based-safe token index the caret sits in/before (0-based column). */
function findCursorTokenIndex(tokenStream: CommonTokenStream, cursorColumn: number): number {
  for (let i = 0; i < tokenStream.size; i++) {
    const token = tokenStream.get(i);
    if (token.type === Token.EOF) return i;
    const start = token.column;
    const end = tokenEnd(token);
    if (end >= cursorColumn) {
      // If the caret is just past a whitespace/operator/paren/comma boundary, the
      // relevant candidates belong to the next slot.
      const moveNext =
        token.type === WS ||
        COMPARISON_OPS.has(token.type) ||
        token.type === PPLSearchParser.LPAREN ||
        token.type === PPLSearchParser.COMMA ||
        token.type === PPLSearchParser.IN;
      if (moveNext && cursorColumn >= end) return i + 1;
      if (start > cursorColumn) return i;
      return i;
    }
  }
  return tokenStream.size > 0 ? tokenStream.size - 1 : 0;
}

/** Walk back from the caret token to the field name governing a value position. */
function findGoverningField(tokenStream: CommonTokenStream, cursorIndex: number): string | null {
  let i = cursorIndex - 1;
  // Skip back over the value list we might be inside (values, commas, quotes, WS).
  while (i >= 0) {
    const t = tokenStream.get(i);
    if (t.type === WS) {
      i--;
      continue;
    }
    if (COMPARISON_OPS.has(t.type) || t.type === PPLSearchParser.IN) {
      i--;
      // Next non-WS token going back should be the field.
      while (i >= 0 && tokenStream.get(i).type === WS) i--;
      if (i >= 0) {
        const f = tokenStream.get(i);
        if (f.type === PPLSearchParser.TERM || f.type === PPLSearchParser.BACKTICK) {
          return f.text || null;
        }
      }
      return null;
    }
    if (
      VALUE_LIKE.has(t.type) ||
      t.type === PPLSearchParser.COMMA ||
      t.type === PPLSearchParser.LPAREN
    ) {
      // Part of the value / IN-list; keep scanning back for the operator.
      i--;
      continue;
    }
    break;
  }
  return null;
}

export interface FilterRange {
  /** Char offset (0-based) where the `field <op> [value]` filter begins. */
  start: number;
  /** Char offset (0-based, exclusive) where the filter ends. */
  end: number;
}

/**
 * Tokenize the search expression and return the char ranges of each filter — a
 * `field <op> [value]` comparison or a `field IN (...)` list. The value is
 * optional so a box appears as soon as the field and its operator exist (e.g.
 * `agent=`), before the value is typed. Used to draw a box around each filter so
 * the composed query reads as a set of discrete conditions. Best-effort: returns
 * `[]` on any lexing error.
 */
export function findFilterRanges(query: string): FilterRange[] {
  const ranges: FilterRange[] = [];
  try {
    const inputStream = CharStream.fromString(query);
    const lexer = new PPLSearchLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    tokenStream.fill();

    const tokens: Token[] = [];
    for (let i = 0; i < tokenStream.size; i++) {
      const t = tokenStream.get(i);
      if (t.type === Token.EOF) break;
      tokens.push(t);
    }

    const nextNonWs = (from: number) => {
      let j = from;
      while (j < tokens.length && tokens[j].type === WS) j++;
      return j;
    };

    for (let i = 0; i < tokens.length; i++) {
      const field = tokens[i];
      if (field.type !== PPLSearchParser.TERM && field.type !== PPLSearchParser.BACKTICK) continue;

      const opIdx = nextNonWs(i + 1);
      if (opIdx >= tokens.length) continue;
      const op = tokens[opIdx];

      if (COMPARISON_OPS.has(op.type)) {
        const valIdx = nextNonWs(opIdx + 1);
        if (valIdx < tokens.length && VALUE_LIKE.has(tokens[valIdx].type)) {
          // field <op> value
          ranges.push({ start: field.column, end: tokenEnd(tokens[valIdx]) });
          i = valIdx;
        } else {
          // field <op> (value not yet typed) — box the field and operator.
          ranges.push({ start: field.column, end: tokenEnd(op) });
          i = opIdx;
        }
      } else if (op.type === PPLSearchParser.IN) {
        const parenIdx = nextNonWs(opIdx + 1);
        if (parenIdx < tokens.length && tokens[parenIdx].type === PPLSearchParser.LPAREN) {
          let depth = 0;
          let end = -1;
          let last = parenIdx;
          for (let m = parenIdx; m < tokens.length; m++) {
            if (tokens[m].type === PPLSearchParser.LPAREN) depth++;
            else if (tokens[m].type === PPLSearchParser.RPAREN) {
              depth--;
              if (depth === 0) {
                end = tokenEnd(tokens[m]);
                last = m;
                break;
              }
            }
          }
          if (end > 0) {
            ranges.push({ start: field.column, end });
            i = last;
          }
        }
      }
    }
  } catch {
    // Best-effort decoration only.
  }
  return ranges;
}

/** A boolean connective sitting alone in the seam between two filters. */
const TRAILING_BOOLEAN_RE = /\s+(?:AND|OR|NOT)\s*$/i;
const LEADING_BOOLEAN_RE = /^\s*(?:AND|OR|NOT)\s+/i;

/**
 * Remove the filter occupying char range `[start, end)` from `query`, collapsing
 * the whitespace seam left behind so the remaining filters stay single-spaced.
 * Whitespace inside a surviving filter's value (e.g. `'win 7'`) is untouched —
 * only the join between the removed slot and its neighbours is trimmed. A boolean
 * connective (`AND`/`OR`/`NOT`) left dangling in that seam is dropped too, so the
 * result stays a valid expression whether filters were space- or keyword-joined.
 */
export function removeFilterRange(query: string, range: FilterRange): string {
  let before = query.slice(0, range.start).replace(/\s+$/, '');
  let after = query.slice(range.end).replace(/^\s+/, '');
  // Drop a connective that bordered the removed filter (`… AND <removed>` or
  // `<removed> AND …`), preferring the trailing side so a leading keyword on the
  // remainder doesn't survive.
  if (TRAILING_BOOLEAN_RE.test(before)) before = before.replace(TRAILING_BOOLEAN_RE, '');
  else if (LEADING_BOOLEAN_RE.test(after)) after = after.replace(LEADING_BOOLEAN_RE, '');
  const merged = before && after ? `${before} ${after}` : `${before}${after}`;
  return merged.trim();
}

/**
 * Analyze the search expression at a caret (0-based char offset) and report what
 * to suggest. Returns a "suggest fields" default on empty/whitespace input.
 */
export function analyzeSearchExpression(query: string, cursorColumn: number): SearchAnalysis {
  const empty: SearchAnalysis = {
    suggestFields: true,
    keywords: [],
    replaceStart: cursorColumn,
    replaceEnd: cursorColumn,
    partial: '',
  };
  try {
    const inputStream = CharStream.fromString(query);
    const lexer = new PPLSearchLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new PPLSearchParser(tokenStream);
    parser.removeErrorListeners();
    parser.searchExpression();
    tokenStream.fill();

    const cursorIndex = findCursorTokenIndex(tokenStream, cursorColumn);

    // Compute the replacement range from the token under the caret (if it's a
    // word-like token the caret is inside/touching), else an empty range.
    let replaceStart = cursorColumn;
    let replaceEnd = cursorColumn;
    let partial = '';
    const here = cursorIndex < tokenStream.size ? tokenStream.get(cursorIndex) : null;
    if (
      here &&
      here.type !== Token.EOF &&
      here.type !== WS &&
      (here.type === PPLSearchParser.TERM ||
        here.type === PPLSearchParser.PHRASE ||
        here.type === PPLSearchParser.BACKTICK)
    ) {
      const start = here.column;
      const end = tokenEnd(here);
      if (cursorColumn >= start && cursorColumn <= end) {
        replaceStart = start;
        replaceEnd = end;
        partial = here.text?.slice(0, cursorColumn - start) || '';
      }
    }

    const core = new CodeCompletionCore(parser);
    core.preferredRules = new Set([
      PPLSearchParser.RULE_field,
      PPLSearchParser.RULE_value,
      PPLSearchParser.RULE_term,
    ]);
    core.ignoredTokens = new Set([PPLSearchParser.RPAREN]);

    const candidates = core.collectCandidates(cursorIndex);

    const rules = candidates.rules;
    // Fields/terms are suggested when the grammar expects a field or a bare term.
    const suggestFields =
      rules.has(PPLSearchParser.RULE_field) || rules.has(PPLSearchParser.RULE_term);

    // Values are suggested when the grammar expects a value (comparison RHS or IN
    // list). Resolve the governing field so we can fetch its value suggestions.
    let suggestValuesForField: string | undefined;
    if (rules.has(PPLSearchParser.RULE_value)) {
      const field = findGoverningField(tokenStream, cursorIndex);
      if (field) suggestValuesForField = field;
    }

    const keywords: string[] = [];
    for (const token of candidates.tokens.keys()) {
      if (OPERATOR_TOKENS[token]) keywords.push(OPERATOR_TOKENS[token]);
      else if (KEYWORD_TOKENS[token]) keywords.push(KEYWORD_TOKENS[token]);
    }

    return { suggestFields, suggestValuesForField, keywords, replaceStart, replaceEnd, partial };
  } catch {
    return empty;
  }
}
