/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { SimplifiedOpenSearchPPLLexer, SimplifiedOpenSearchPPLParser } from '@osd/antlr-grammar';
import {
  AggFn,
  Aggregation,
  FilterOp,
  PPLBuilderState,
  SearchFilter,
  emptyState,
  nextAggId,
  nextFilterId,
} from './types';

export interface PPLParseResult {
  canBuild: boolean;
  state: PPLBuilderState;
  /** The dataset-owned leading text (e.g. `source = logs`), stripped of the trailing pipe. */
  sourcePrefix: string;
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

function isQuoted(text: string): boolean {
  const t = text.trim();
  return /^['"`]/.test(t);
}

const OP_TOKEN_MAP: Array<{ token: string; op: FilterOp }> = [
  { token: 'EQUAL', op: '=' },
  { token: 'DOUBLE_EQUAL', op: '=' },
  { token: 'NOT_EQUAL', op: '!=' },
  { token: 'LESS', op: '<' },
  { token: 'GREATER', op: '>' },
  // NOT_GREATER is '<=', NOT_LESS is '>=' (see lexer grammar).
  { token: 'NOT_GREATER', op: '<=' },
  { token: 'NOT_LESS', op: '>=' },
  { token: 'LIKE', op: 'like' },
];

function mapComparisonOperator(opCtx: any): FilterOp | null {
  for (const { token, op } of OP_TOKEN_MAP) {
    if (typeof opCtx[token] === 'function' && opCtx[token]() !== null) {
      return op;
    }
  }
  return null; // REGEXP or anything unmodeled
}

/**
 * Parse one `expression` node into a SearchFilter, or return null if it isn't
 * a shape the builder can represent (which forces canBuild=false upstream).
 */
function parseExpression(exprCtx: any): SearchFilter | null {
  // Reject IN / BETWEEN.
  if (typeof exprCtx.IN === 'function' && exprCtx.IN()) return null;
  if (typeof exprCtx.BETWEEN === 'function' && exprCtx.BETWEEN()) return null;

  // Comparison: field <op> value.
  if (typeof exprCtx.comparisonOperator === 'function' && exprCtx.comparisonOperator()) {
    const op = mapComparisonOperator(exprCtx.comparisonOperator());
    if (!op) return null;
    const left = exprCtx.expression(0);
    const right = exprCtx.expression(1);
    if (!left || !right) return null;
    const field = unquote(left.getText());
    const rawRight = right.getText();
    const value = unquote(rawRight);
    // A quoted `like` pattern or any comparison — value stored verbatim.
    if (!field || value === '') return null;
    // Reject a right-hand side that isn't a plain literal (e.g. another field).
    if (!isQuoted(rawRight) && !/^-?\d+(\.\d+)?$/.test(rawRight.trim())) return null;
    return { id: nextFilterId(), field, op, value, isFullText: false };
  }

  // Full-text: query_string('term') / simple_query_string('term') with NO field list.
  if (typeof exprCtx.relevanceExpression === 'function' && exprCtx.relevanceExpression()) {
    const rel = exprCtx.relevanceExpression();
    const multi = rel.multiFieldRelevanceFunction && rel.multiFieldRelevanceFunction();
    if (!multi) return null; // single-field match(field, ...) is targeted — not modeled
    // Field list present ([...]) means a targeted query — not a bare "search for".
    if (typeof multi.LT_SQR_PRTHS === 'function' && multi.LT_SQR_PRTHS()) return null;
    const nameCtx =
      multi.multiFieldRelevanceFunctionName && multi.multiFieldRelevanceFunctionName();
    const fnName = nameCtx ? nameCtx.getText().toLowerCase() : '';
    if (fnName !== 'query_string' && fnName !== 'simple_query_string') return null;
    const queryCtx = multi.relevanceQuery && multi.relevanceQuery();
    if (!queryCtx) return null;
    const value = unquote(queryCtx.getText());
    if (!value) return null;
    return { id: nextFilterId(), field: undefined, op: undefined, value, isFullText: true };
  }

  return null;
}

/**
 * Flatten a `logicalExpression` into AND-joined filters. Returns null when it
 * contains OR/XOR/NOT or any leaf the builder can't represent.
 */
function parseLogicalExpression(logCtx: any): SearchFilter[] | null {
  // Reject OR / XOR / NOT.
  if (typeof logCtx.OR === 'function' && logCtx.OR()) return null;
  if (typeof logCtx.XOR === 'function' && logCtx.XOR()) return null;
  if (typeof logCtx.NOT === 'function' && logCtx.NOT()) return null;

  // AND: recurse both sides.
  if (typeof logCtx.AND === 'function' && logCtx.AND()) {
    const left = parseLogicalExpression(logCtx.logicalExpression(0));
    const right = parseLogicalExpression(logCtx.logicalExpression(1));
    if (!left || !right) return null;
    return [...left, ...right];
  }

  // LogicalExpr wrapper -> expression.
  if (typeof logCtx.expression === 'function' && logCtx.expression()) {
    const filter = parseExpression(logCtx.expression());
    return filter ? [filter] : null;
  }

  return null;
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
 * any command/expression the visual builder can't round-trip (per plan decision 3).
 */
export function parsePPL(query: string): PPLParseResult {
  const fallback: PPLParseResult = { canBuild: false, state: emptyState(), sourcePrefix: query };
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { canBuild: true, state: emptyState(), sourcePrefix: '' };
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

    const commands = queryStmt.commands ? queryStmt.commands() : [];
    const commandList = Array.isArray(commands) ? commands : commands ? [commands] : [];

    // Derive the source prefix: original text up to the first builder pipe.
    let sourcePrefix = query.trim();
    if (commandList.length > 0) {
      const firstCmd = commandList[0];
      const startIdx = firstCmd.start ? firstCmd.start.start : undefined;
      if (typeof startIdx === 'number') {
        sourcePrefix = query
          .slice(0, startIdx)
          .replace(/\|\s*$/, '')
          .trim();
      }
    }

    const state = emptyState();
    let seenStats = false;

    for (const cmd of commandList) {
      const whereCtx = cmd.whereCommand && cmd.whereCommand();
      const statsCtx = cmd.statsCommand && cmd.statsCommand();

      if (whereCtx) {
        // A where after stats can't be represented (builder is where-then-stats).
        if (seenStats) return fallback;
        const logCtx = whereCtx.logicalExpression && whereCtx.logicalExpression();
        const filters = logCtx ? parseLogicalExpression(logCtx) : null;
        if (!filters) return fallback;
        state.filters.push(...filters);
        continue;
      }

      if (statsCtx) {
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
        continue;
      }

      // Any other command (sort, dedup, head, eval, ...) is unmodeled.
      return fallback;
    }

    return { canBuild: true, state, sourcePrefix };
  } catch {
    return fallback;
  }
}
