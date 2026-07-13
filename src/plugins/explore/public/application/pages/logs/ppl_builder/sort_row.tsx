/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonEmpty, EuiButtonIcon, EuiSuperSelect } from '@elastic/eui';
import { BuilderAction } from './build_ppl';
import { Sort } from './types';
import { widestOptionWidth } from '../../../components/query_builder';

interface SortRowProps {
  /** The current sort, or undefined when the query is unsorted. */
  sort?: Sort;
  /**
   * Output columns the sort may target — the query's metrics + group-by fields
   * (see `sortableColumns`). Used verbatim as both the select value and label.
   */
  columns: string[];
  dispatch: React.Dispatch<BuilderAction>;
}

// Direction options for the sort — descending first, since "highest count" is
// the common case when sorting an aggregated result (matches Datadog's default).
const DESC = 'desc';
const ASC = 'asc';

/**
 * The builder's sort control, styled like the group-by/time-span chips: pick one
 * output column and a direction (`Show count() … | sort -\`count()\``). Datadog's
 * "sorted by <measure>" reference maps to this single-column + direction shape.
 * Shown only once the query aggregates (there are columns to sort); collapses to
 * an "Add sort" affordance when unsorted, mirroring the "Add time span" button.
 */
export const SortRow: React.FC<SortRowProps> = ({ sort, columns, dispatch }) => {
  if (!sort) {
    return (
      <EuiButtonEmpty
        size="xs"
        iconType="sortable"
        // Default to the first column (usually the first metric, e.g. count()),
        // descending — the typical "top N" reading of an aggregated result.
        onClick={() =>
          dispatch({ type: 'SET_SORT', sort: { column: columns[0] ?? '', desc: true } })
        }
        isDisabled={columns.length === 0}
        data-test-subj="pplBuilderAddSort"
      >
        {i18n.translate('explore.pplBuilder.addSort', { defaultMessage: 'Add sort' })}
      </EuiButtonEmpty>
    );
  }

  // A sort column can go stale if the metric/field it referenced was removed;
  // surface it as a selectable option so the control still shows the current
  // value rather than snapping to a different column.
  const columnValues = columns.includes(sort.column) ? columns : [sort.column, ...columns];
  const columnOptions = columnValues.map((c) => ({ value: c, inputDisplay: c }));
  // Size the select to its widest column so the open dropdown (which copies the
  // control width) doesn't clip a long metric expression like `avg(bytes)`.
  const columnWidth = widestOptionWidth(columnValues, 44, 140, 320);

  return (
    <div className="plqGroup" data-test-subj="pplBuilderSortChip">
      <span className="plqGroup__label">
        {i18n.translate('explore.pplBuilder.sortBy', { defaultMessage: 'Sort by' })}
      </span>
      <EuiSuperSelect
        compressed
        options={columnOptions}
        valueOfSelected={sort.column}
        onChange={(value) => dispatch({ type: 'SET_SORT', sort: { ...sort, column: value } })}
        style={{ minWidth: columnWidth }}
        data-test-subj="pplBuilderSortColumn"
      />
      <div className="plqSep" />
      <EuiSuperSelect
        compressed
        options={[
          {
            value: DESC,
            inputDisplay: i18n.translate('explore.pplBuilder.sortDesc', {
              defaultMessage: 'Desc',
            }),
          },
          {
            value: ASC,
            inputDisplay: i18n.translate('explore.pplBuilder.sortAsc', {
              defaultMessage: 'Asc',
            }),
          },
        ]}
        valueOfSelected={sort.desc ? DESC : ASC}
        onChange={(value) =>
          dispatch({ type: 'SET_SORT', sort: { ...sort, desc: value === DESC } })
        }
        style={{ minWidth: 80 }}
        data-test-subj="pplBuilderSortDirection"
      />
      <div className="plqSep" />
      <EuiButtonIcon
        iconType="cross"
        color="text"
        size="s"
        aria-label={i18n.translate('explore.pplBuilder.removeSort', {
          defaultMessage: 'Remove sort',
        })}
        onClick={() => dispatch({ type: 'REMOVE_SORT' })}
        data-test-subj="pplBuilderRemoveSort"
      />
    </div>
  );
};
