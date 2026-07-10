/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { SimplifiedOpenSearchPPLLexer, SimplifiedOpenSearchPPLParser } from '@osd/antlr-grammar';
import { AggFn, Aggregation, PPLBuilderState, emptyState, nextAggId } from './types';

export interface PPLParseResult {
  canBuild: boolean;
  state: PPLBuilderState;
}

const AGG_FN_NAMES = new Set<string>(['avg', 'sum', 'min', 'max']);

/** Strip surrounding quotes/backticks and unescape a PPL string literal. */
function unquote(text: string): string {
  const trimmed = text.trim();
  const first = trimmed[0];
  if ((first === "'" || first === '"' || first === '`') && trimmed.endsWith(first)) {
    return trimmed.slice(1, -1).replace(/\\\\/g, '\\').replace(/\\'/g, "'").replace(/\\"/g, '"');
  }
  return trimmed;
}

/** Parse a single statsFunction's text into an Aggregation, or null if unmodeled. */
function parseAggFunctionText(text: string): Aggregation | null {
  const compact = text.replace(/\s+/g, '');
  if (/^(count|c)\(\)$/i.test(compact)) {
    return { id: nextAggId(), fn: 'count' };
  }
  const call = compact.match(/^([a-zA-Z_]+)\((.*)\)$/);
  if (!call) return null;
  const fn = call[1].toLowerCase();
  const args = call[2];
  if (AGG_FN_NAMES.has(fn)) {
    if (!args || args.includes(',')) return null;
    return { id: nextAggId(), fn: fn as AggFn, field: unquote(args) };
  }
  if (fn === 'percentile' || fn === 'percentile_approx') {
    const parts = args.split(',');
    if (parts.length !== 2) return null;
    const pct = Number(parts[1]);
    if (!Number.isFinite(pct)) return null;
    return { id: nextAggId(), fn: 'percentile', field: unquote(parts[0]), percentile: pct };
  }
  return null;
}

function parseStatsByClause(byCtx: any, state: PPLBuilderState): boolean {
  const fieldListCtx = byCtx.fieldList && byCtx.fieldList();
  if (fieldListCtx) {
    const exprs = fieldListCtx.fieldExpression ? fieldListCtx.fieldExpression() : [];
    const list = Array.isArray(exprs) ? exprs : [exprs];
    state.groupBy.fields = list.map((e: any) => unquote(e.getText())).filter(Boolean);
  }
  const bySpanCtx = byCtx.bySpanClause && byCtx.bySpanClause();
  if (bySpanCtx) {
    // A renamed span (AS alias) isn't modeled — bail to code mode.
    if (typeof bySpanCtx.AS === 'function' && bySpanCtx.AS()) return false;
    const spanCtx = bySpanCtx.spanClause && bySpanCtx.spanClause();
    if (spanCtx) {
      const field = unquote(spanCtx.fieldExpression().getText());
      const value = spanCtx.literalValue().getText();
      const unitCtx = spanCtx.timespanUnit && spanCtx.timespanUnit();
      const unit = unitCtx ? unitCtx.getText() : '';
      state.groupBy.span = { field, interval: `${value}${unit}`, auto: false };
    }
  }
  return true;
}

/**
 * Parse a PPL query into builder state. `canBuild` is false when the query uses
 * any command/expression the visual builder can't round-trip.
 *
 * The builder shape is: `source=<index> <search-expression> | stats … by …`.
 * The search expression (everything on the source segment after the
 * `source=<index>` fromClause) is captured verbatim into `searchExpression`;
 * only a single trailing `stats` command is modeled beyond it.
 */
export function parsePPL(query: string): PPLParseResult {
  const fallback: PPLParseResult = { canBuild: false, state: emptyState() };
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { canBuild: true, state: emptyState() };
  }

  try {
    const inputStream = CharStream.fromString(query);
    const lexer = new SimplifiedOpenSearchPPLLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new SimplifiedOpenSearchPPLParser(tokenStream);
    // Surface syntax errors as a parse failure rather than a partial tree.
    let hadError = false;
    parser.removeErrorListeners();
    parser.addErrorListener({
      syntaxError: () => {
        hadError = true;
      },
      reportAmbiguity: () => {},
      reportAttemptingFullContext: () => {},
      reportContextSensitivity: () => {},
    });

    const root = parser.root();
    if (hadError) return fallback;

    const stmt = root.pplStatement && root.pplStatement();
    const queryStmt = stmt && stmt.queryStatement && stmt.queryStatement();
    if (!queryStmt) return fallback;

    const pplCommands = queryStmt.pplCommands && queryStmt.pplCommands();
    const searchCmd = pplCommands && pplCommands.searchCommand && pplCommands.searchCommand();
    if (!searchCmd) return fallback; // describe/show aren't builder-representable

    const state = emptyState();

    // The simplified grammar parses `source = logs` as a searchExpression (a
    // `source=logs` field comparison), NOT as a fromClause — so the source
    // clause and the real search terms both appear as top-level
    // searchExpression nodes. The dataset-owned source clause is the first node
    // whose field is `source`/`index`; it is dropped (the builder is source-less
    // — see `buildPPL`), and everything after it is the user's search expression,
    // sliced verbatim from the original query so it round-trips.
    const searchExprs = searchCmd.searchExpression ? searchCmd.searchExpression() : [];
    const exprList = Array.isArray(searchExprs) ? searchExprs : searchExprs ? [searchExprs] : [];

    const exprRange = (e: any): [number, number] | null => {
      const s = e?.start ? e.start.start : undefined;
      const t = e?.stop ? e.stop.stop : undefined;
      return typeof s === 'number' && typeof t === 'number' ? [s, t] : null;
    };

    let searchStartIdx = 0;
    if (exprList.length > 0 && /^(source|index)\s*=/i.test(exprList[0].getText())) {
      searchStartIdx = 1;
    }

    const searchNodes = exprList.slice(searchStartIdx);
    if (searchNodes.length > 0) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const e of searchNodes) {
        const r = exprRange(e);
        if (r) {
          lo = Math.min(lo, r[0]);
          hi = Math.max(hi, r[1]);
        }
      }
      if (Number.isFinite(lo) && hi >= 0) {
        state.searchExpression = query.slice(lo, hi + 1).trim();
      }
    }

    // Only a single trailing `stats` command is modeled beyond the source.
    const commands = queryStmt.commands ? queryStmt.commands() : [];
    const commandList = Array.isArray(commands) ? commands : commands ? [commands] : [];
    let seenStats = false;

    for (const cmd of commandList) {
      const statsCtx = cmd.statsCommand && cmd.statsCommand();
      if (!statsCtx) return fallback; // any non-stats trailing command is unmodeled
      if (seenStats) return fallback; // only one stats clause modeled
      seenStats = true;

      // Reject statsArgs (partitions/allnum/delim/...) and dedupSplit.
      const statsArgs = statsCtx.statsArgs && statsCtx.statsArgs();
      if (statsArgs && statsArgs.getText && statsArgs.getText() !== '') return fallback;
      if (statsCtx.dedupSplitArg && statsCtx.dedupSplitArg()) return fallback;

      const aggTerms = statsCtx.statsAggTerm ? statsCtx.statsAggTerm() : [];
      const terms = Array.isArray(aggTerms) ? aggTerms : [aggTerms];
      for (const term of terms) {
        // An aliased aggregation (AS foo) isn't modeled.
        if (typeof term.AS === 'function' && term.AS()) return fallback;
        const fnCtx = term.statsFunction && term.statsFunction();
        if (!fnCtx) return fallback;
        const agg = parseAggFunctionText(fnCtx.getText());
        if (!agg) return fallback;
        state.aggregations.push(agg);
      }

      const byCtx = statsCtx.statsByClause && statsCtx.statsByClause();
      if (byCtx) {
        if (!parseStatsByClause(byCtx, state)) return fallback;
      }
    }

    return { canBuild: true, state };
  } catch {
    return fallback;
  }
}
