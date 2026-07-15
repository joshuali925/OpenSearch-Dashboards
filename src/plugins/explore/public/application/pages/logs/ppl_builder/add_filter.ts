/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Helpers for the "Filter for / Filter out value" actions (field sidebar and doc
 * viewer) when the logs PPL query builder is in play.
 *
 * The builder models a query as `source=<index> <search-expression> | stats …`
 * and only the leading **search-expression** segment (before the first pipe) is
 * editable as free-text filters — a trailing `| WHERE …` command is NOT
 * builder-representable (`parsePPL` bails to code mode on any non-`stats`
 * command). So a value filter merges its predicate into that search expression,
 * keeping the query round-trippable through `parsePPL`/`buildPPL` and letting
 * the visual builder re-render it as a filter chip.
 *
 * Exists filters are the exception: `ISNULL()`/`ISNOTNULL()` are function calls,
 * which the search-expression grammar has no production for, so they fall back
 * to a `| WHERE` command (and the query opens in code mode).
 */

import { DataViewField, IndexPatternField } from '../../../../../../data/common';

/** Single-quote a string literal for PPL, escaping embedded quotes as `''`. */
function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Build a bare PPL predicate (no leading `WHERE`) for a field/value filter.
 *
 * Mirrors the phrase/exists handling of the shared `FilterUtils.toPredicate` but
 * emits a search-expression-friendly comparison the builder can box as a chip:
 *   - `'+'` with a value    -> `` `field`='value' ``
 *   - `'-'` with a value    -> `` `field`!='value' ``
 *   - `'+'` with null value -> `ISNOTNULL(\`field\`)`
 *   - `'-'` with null value -> `ISNULL(\`field\`)`
 *
 * `.keyword` sub-fields are stripped (PPL appends it automatically when needed),
 * matching the shared util.
 */
export function buildPPLPredicate(
  field: string,
  value: string | null | undefined,
  operation: '+' | '-'
): string {
  const cleanField = field.replace(/\.keyword$/, '');
  const negate = operation === '-';

  if (value === null || value === undefined) {
    return negate ? `ISNULL(\`${cleanField}\`)` : `ISNOTNULL(\`${cleanField}\`)`;
  }

  const op = negate ? '!=' : '=';
  return `\`${cleanField}\`${op}${quote(value)}`;
}

/** Split a PPL query at its first top-level `|` into `[head, tail]`. */
function splitAtFirstPipe(query: string): [string, string] {
  const idx = query.indexOf('|');
  if (idx === -1) return [query, ''];
  return [query.slice(0, idx), query.slice(idx)];
}

/** Detects a leading `source=<x>` / `index=<x>` clause in the head segment. */
const SOURCE_CLAUSE_RE = /^\s*(?:source|index)\s*=\s*(?:`[^`]*`|[^\s|]+)\s*/i;

/**
 * Merge a bare predicate into the search-expression segment of a PPL query.
 *
 * Preserves any leading `source=<index>` clause and any trailing `| stats …`
 * pipeline. When the search expression already has terms, the predicate is
 * space-appended (PPL treats adjacent search terms as an implicit AND);
 * otherwise it becomes the whole expression. Idempotent: if the exact predicate
 * already appears in the search expression it is not added again, and its
 * negation (`=` <-> `!=`) is replaced in place so re-clicking flips rather than
 * stacks.
 */
export function addFilterToPPLSearchExpression(query: string, predicate: string): string {
  if (!predicate) return query;

  const [head, tail] = splitAtFirstPipe(query);

  const sourceMatch = head.match(SOURCE_CLAUSE_RE);
  const sourcePart = sourceMatch ? sourceMatch[0] : '';
  const searchPart = head.slice(sourcePart.length).trim();

  const negatedPredicate = negatePredicate(predicate);

  let nextSearch: string;
  if (!searchPart) {
    nextSearch = predicate;
  } else if (containsPredicate(searchPart, predicate)) {
    nextSearch = searchPart;
  } else if (negatedPredicate && containsPredicate(searchPart, negatedPredicate)) {
    nextSearch = searchPart.replace(negatedPredicate, predicate);
  } else {
    nextSearch = `${searchPart} ${predicate}`;
  }

  const normalizedSource = sourcePart ? `${sourcePart.trim()} ` : '';
  const rebuiltHead = `${normalizedSource}${nextSearch}`.trim();
  const rebuiltTail = tail ? ` ${tail.trim()}` : '';
  return `${rebuiltHead}${rebuiltTail}`.trim();
}

/**
 * Insert a `| WHERE <predicate>` command after the leading source clause.
 *
 * Used for filters that are not search-expression-representable (exists). The
 * resulting query is valid PPL but not builder-representable, so it opens in
 * code mode. Idempotent, and flips an existing opposite predicate in place —
 * mirroring `addFilterToPPLSearchExpression`'s behavior for the WHERE form.
 */
export function addFilterToPPLWhereCommand(query: string, predicate: string): string {
  if (!predicate) return query;

  const whereCommand = `WHERE ${predicate}`;
  const negated = negatePredicate(predicate);
  const negatedCommand = negated ? `WHERE ${negated}` : '';

  const commands = query.split('|').map((cmd) => cmd.trim());
  for (let i = 0; i < commands.length; i++) {
    if (commands[i] === whereCommand) return commands.join(' | ').trim();
    if (negatedCommand && commands[i] === negatedCommand) {
      commands[i] = whereCommand;
      return commands.join(' | ').trim();
    }
  }

  commands.splice(1, 0, whereCommand);
  return commands.join(' | ').trim();
}

/**
 * Apply a "Filter for/out value" action to a PPL query, choosing the
 * representation the builder can round-trip when possible.
 *
 * Value filters (equals/not-equals) merge into the search expression so the
 * builder renders a chip. Exists filters (`_exists_` sentinel field, where
 * `values` carries the target field name) emit `ISNULL()`/`ISNOTNULL()`, which
 * the search grammar can't hold, so they fall back to a `| WHERE` command.
 */
export function addFilterToPPLQuery(
  query: string,
  field: string | IndexPatternField | DataViewField,
  values: string,
  operation: '+' | '-'
): string {
  const fieldName = typeof field === 'string' ? field : field.name;

  // `_exists_` is generateFilters' convention: the target field name is carried
  // in `values`, and a null predicate value yields ISNULL/ISNOTNULL.
  if (fieldName === '_exists_') {
    return addFilterToPPLWhereCommand(query, buildPPLPredicate(values, null, operation));
  }

  return addFilterToPPLSearchExpression(query, buildPPLPredicate(fieldName, values, operation));
}

/** Return the `=`/`!=` negation of a comparison predicate, or '' if not one. */
function negatePredicate(predicate: string): string {
  if (predicate.includes('!=')) return predicate.replace('!=', '=');
  if (predicate.includes('=')) return predicate.replace('=', '!=');
  if (predicate.startsWith('ISNOTNULL(')) return predicate.replace('ISNOTNULL(', 'ISNULL(');
  if (predicate.startsWith('ISNULL(')) return predicate.replace('ISNULL(', 'ISNOTNULL(');
  return '';
}

/**
 * Whether `searchExpr` already contains `predicate` as a standalone term (not a
 * substring of a longer token). Uses word-ish boundaries around the predicate.
 */
function containsPredicate(searchExpr: string, predicate: string): boolean {
  const idx = searchExpr.indexOf(predicate);
  if (idx === -1) return false;
  const before = searchExpr[idx - 1];
  const after = searchExpr[idx + predicate.length];
  const boundaryBefore = before === undefined || /\s|\(/.test(before);
  const boundaryAfter = after === undefined || /\s|\)/.test(after);
  return boundaryBefore && boundaryAfter;
}
