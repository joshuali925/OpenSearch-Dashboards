/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Filter,
  filterMatchesIndex,
  formatTimePickerDate,
  getFilterField,
  IIndexPattern,
  isFilterDisabled,
  TimeRange,
} from '../../../../data/common';
import { formatDate } from '../../../common';

export class FilterUtils {
  /**
   * Get time filter where clause
   * @param timeFieldName Time field name
   * @param timeRange Time range from the time picker
   * @returns where clause of the time range filter
   *
   * The time literals are wrapped in `TIMESTAMP('...')` rather than bare string literals. Modern
   * OpenSearch PPL implicitly coerces a string to a timestamp for `field >= '<string>'`, but legacy
   * Elasticsearch (Open Distro) PPL does not and rejects it with a [TIMESTAMP,STRING] type error.
   * `TIMESTAMP('...')` is accepted by both engines, so this form is portable across all data sources.
   */
  public static getTimeFilterWhereClause(timeFieldName: string, timeRange: TimeRange): string {
    const { fromDate, toDate } = formatTimePickerDate(timeRange, 'YYYY-MM-DD HH:mm:ss.SSS');
    return `WHERE \`${timeFieldName}\` >= TIMESTAMP('${formatDate(
      fromDate
    )}') AND \`${timeFieldName}\` <= TIMESTAMP('${formatDate(toDate)}')`;
  }

  /**
   * Convert core {@link Filter} and convert to a PPL where clause. Only
   * supports non DSL filters.
   */
  public static convertFiltersToWhereClause(
    filters: Filter[],
    indexPattern: IIndexPattern | undefined,
    ignoreFilterIfFieldNotInIndex: boolean = false
  ): string {
    if (!filters) return '';
    const predicates = filters
      .filter((filter) => filter && !isFilterDisabled(filter))
      .filter(
        (filter) => !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern)
      )
      // Wrapped (not passed by reference) so `this` stays bound to `FilterUtils`
      // inside `toPredicate`, which dispatches through `this.comparison`/etc.
      // This path always emits the canonical back-ticked form for query execution.
      .map((filter) => FilterUtils.toPredicate(filter))
      .filter(Boolean);
    const predicate = (predicates.length > 1 ? predicates.map((p) => `(${p})`) : predicates).join(
      ' AND '
    );
    return predicate ? 'WHERE ' + predicate : '';
  }

  public static toPredicate(filter: Filter): string | undefined {
    const meta = filter.meta;
    // SQL/PPL does not accept .keyword and will automatically append it if needed
    const field = getFilterField(filter)?.replace(/.keyword$/, '');
    if (!field) return;
    // Comparison assembly and field/exists rendering go through the seams below
    // (`comparison`, `existsPredicate`, `formatFieldName`), invoked via `this` so
    // subclasses can restyle without reimplementing the filter-type dispatch.
    // The reference is late-bound: `PPLFilterUtils.toPredicate(filter)` runs this
    // body with `this === PPLFilterUtils` and picks up its compact overrides,
    // while the base class keeps the canonical `` `field` = value `` form.
    if (!meta.negate) {
      switch (meta.type) {
        case 'phrase':
          return this.comparison(field, '=', this.quote(meta.params.query));
        case 'phrases':
          return meta.params
            .map((query: string) => this.comparison(field, '=', this.quote(query)))
            .join(' OR ');
        case 'range':
          const ranges = [];
          if (meta.params.gte != null) ranges.push(this.comparison(field, '>=', meta.params.gte));
          if (meta.params.lt != null) ranges.push(this.comparison(field, '<', meta.params.lt));
          return ranges.join(' AND ');
        case 'exists':
          return this.existsPredicate(field, false);
      }
      if (filter.query) {
        if (filter.query.match_phrase && field in filter.query.match_phrase) {
          return this.comparison(field, '=', this.quote(filter.query.match_phrase[field]));
        }
      }
    } else {
      switch (meta.type) {
        case 'phrase':
          return this.comparison(field, '!=', this.quote(meta.params.query));
        case 'phrases':
          return meta.params
            .map((query: string) => this.comparison(field, '!=', this.quote(query)))
            .join(' AND ');
        case 'range':
          const ranges = [];
          if (meta.params.gte != null) ranges.push(this.comparison(field, '<', meta.params.gte));
          if (meta.params.lt != null) ranges.push(this.comparison(field, '>=', meta.params.lt));
          return ranges.join(' OR ');
        case 'exists':
          return this.existsPredicate(field, true);
      }
      if (filter.query) {
        if (filter.query.match_phrase && field in filter.query.match_phrase) {
          return this.comparison(field, '!=', this.quote(filter.query.match_phrase[field]));
        }
      }
    }
  }

  /** Assemble one `<field> <op> <value>` comparison. Overridable for spacing. */
  protected static comparison(field: string, operator: string, value: unknown): string {
    return `${this.formatFieldName(field)} ${operator} ${value}`;
  }

  /** Render an exists/not-exists check as an ISNOTNULL/ISNULL function call. */
  protected static existsPredicate(field: string, negate: boolean): string {
    const fn = negate ? 'ISNULL' : 'ISNOTNULL';
    return `${fn}(${this.formatFieldName(field)})`;
  }

  /** Render a field name for a predicate. Base always back-tick quotes it. */
  protected static formatFieldName(field: string): string {
    return `\`${field}\``;
  }

  protected static quote(value: unknown) {
    if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
    return value;
  }
}
