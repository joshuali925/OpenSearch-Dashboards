/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Filter, getFilterField, isExistsFilter } from '../../../../data/common';
import { FilterUtils } from './filter_utils';

/** Detects a leading `source=<x>` / `index=<x>` clause in the head segment. */
const SOURCE_CLAUSE_RE = /^\s*(?:source|index)\s*=\s*(?:`[^`]*`|[^\s|]+)\s*/i;

export class PPLFilterUtils extends FilterUtils {
  /**
   * Inserts a WHERE command into a PPL query string after the first command.
   *
   * @param query - The original PPL query string
   * @param whereCommand - The where command string to insert
   * @returns A new PPL query string with the WHERE command inserted
   */
  public static insertWhereCommand(query: string, whereCommand: string): string {
    if (!whereCommand) return query;

    const commands = query.split('|');
    commands.splice(1, 0, whereCommand);
    return commands.map((cmd) => cmd.trim()).join(' | ');
  }

  /**
   * Whether `searchExpr` contains `term` as a standalone term (not a substring of
   * a longer token), so idempotency/flip checks don't fire on `` `f`='web' ``
   * inside `` `f`='website' ``.
   */
  private static containsTerm(searchExpr: string, term: string): boolean {
    const idx = searchExpr.indexOf(term);
    if (idx === -1) return false;
    const before = searchExpr[idx - 1];
    const after = searchExpr[idx + term.length];
    const boundaryBefore = before === undefined || /\s|\(/.test(before);
    const boundaryAfter = after === undefined || /\s|\)/.test(after);
    return boundaryBefore && boundaryAfter;
  }

  /**
   * Merge a bare predicate into the leading search-expression segment of a PPL
   * query — the part before the first `|`, after any `source=`/`index=` clause.
   *
   * This is the representation the Explore logs visual builder can round-trip: a
   * trailing `| WHERE …` is not builder-representable, but a search-expression
   * term re-renders as a filter chip. Adjacent search terms are implicit-AND, so
   * a predicate that itself contains `OR` (multi-value phrases) is parenthesized
   * to preserve precedence. Idempotent, and flips an existing `=`/`!=` opposite
   * in place so re-clicking toggles rather than stacks.
   */
  private static addPredicateToSearchExpression(query: string, predicate: string): string {
    if (!predicate) return query;

    const pipeIdx = query.indexOf('|');
    const head = pipeIdx === -1 ? query : query.slice(0, pipeIdx);
    const tail = pipeIdx === -1 ? '' : query.slice(pipeIdx);

    const sourceMatch = head.match(SOURCE_CLAUSE_RE);
    const sourcePart = sourceMatch ? sourceMatch[0] : '';
    const searchPart = head.slice(sourcePart.length).trim();

    const term = / OR /i.test(predicate) ? `(${predicate})` : predicate;
    const negatedTerm = PPLFilterUtils.negateComparison(term);

    let nextSearch: string;
    if (!searchPart) {
      nextSearch = term;
    } else if (PPLFilterUtils.containsTerm(searchPart, term)) {
      nextSearch = searchPart;
    } else if (negatedTerm && PPLFilterUtils.containsTerm(searchPart, negatedTerm)) {
      nextSearch = searchPart.replace(negatedTerm, term);
    } else {
      nextSearch = `${searchPart} ${term}`;
    }

    const normalizedSource = sourcePart ? `${sourcePart.trim()} ` : '';
    const rebuiltHead = `${normalizedSource}${nextSearch}`.trim();
    const rebuiltTail = tail ? ` ${tail.trim()}` : '';
    return `${rebuiltHead}${rebuiltTail}`.trim();
  }

  /** Return the `=`/`!=` negation of a single comparison, or '' if not one. */
  private static negateComparison(predicate: string): string {
    if (predicate.includes('!=')) return predicate.replace('!=', '=');
    if (predicate.includes('=')) return predicate.replace('=', '!=');
    return '';
  }

  /** Insert (or flip in place) a `| WHERE <predicate>` command after the first command. */
  private static addWhereCommand(query: string, predicate: string): string {
    const whereCommand = 'WHERE ' + predicate;
    const negatedPredicate = PPLFilterUtils.negateComparison(predicate);
    const negatedWhereCommand = negatedPredicate ? 'WHERE ' + negatedPredicate : '';
    const commands = query.split('|').map((cmd) => cmd.trim());

    for (let i = 0; i < commands.length; i++) {
      if (commands[i] === whereCommand) return commands.join(' | ').trim();
      if (negatedWhereCommand && commands[i] === negatedWhereCommand) {
        commands[i] = whereCommand;
        return commands.join(' | ').trim();
      }
    }

    commands.splice(1, 0, whereCommand);
    return commands.join(' | ').trim();
  }

  private static addFilterToQuery(query: string, filter: Filter): string {
    // Exists filters serialize to ISNULL()/ISNOTNULL() function calls, which the
    // search-expression grammar has no production for, so they use a `| WHERE`
    // command (not builder-representable — opens in code mode). `toPredicate`
    // does not handle exists filters, so build the predicate here.
    if (isExistsFilter(filter)) {
      const field = getFilterField(filter);
      if (!field) return query;
      const predicate = filter.meta.negate ? `ISNULL(\`${field}\`)` : `ISNOTNULL(\`${field}\`)`;
      return PPLFilterUtils.addWhereCommand(query, predicate);
    }

    const predicate = PPLFilterUtils.toPredicate(filter);
    if (!predicate) return query;

    // Value/range/phrases predicates merge into the search expression so the
    // Explore logs visual builder can round-trip them as chips; the same form is
    // valid PPL everywhere else.
    return PPLFilterUtils.addPredicateToSearchExpression(query, predicate);
  }

  /**
   * Inserts filters into a query string by converting them to PPL predicates.
   * Value filters (equals/not-equals/range/phrases) merge into the leading
   * search expression so the visual builder can round-trip them; exists filters
   * fall back to a `| WHERE` command. If a matching filter already exists it is
   * not added again, and a negated version is flipped in place.
   *
   * @param query - The query string
   * @param filters - The Filter objects to insert into the query
   * @returns A new query string with the filters applied
   */
  public static addFiltersToQuery(query: string, filters: Filter[]): string {
    return filters.reduce(PPLFilterUtils.addFilterToQuery, query);
  }
}
