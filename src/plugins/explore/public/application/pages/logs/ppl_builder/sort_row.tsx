/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonIcon, EuiComboBox, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import { BuilderAction } from './build_ppl';
import { Sort } from './types';

interface SortRowProps {
  /** The current sort, or undefined when the query is unsorted. */
  sort?: Sort;
  /**
   * Candidate sort columns: the aggregated query's output columns (metrics +
   * group-by fields) when the query aggregates, otherwise the dataset's fields
   * for sorting raw search rows. Offered as combobox suggestions; any value may
   * still be typed since sort is a free pipe operation.
   */
  columns: string[];
  dispatch: React.Dispatch<BuilderAction>;
}

// Direction options for the sort — descending first, since "highest first" is
// the common case (matches Datadog's default when sorting a measure).
const DESC = 'desc';
const ASC = 'asc';

/**
 * The builder's sort control — its own top-level pipe operation (`… | sort
 * -\`count()\``), a sibling of the aggregation rather than part of the grouping.
 * Pick one column and a direction. It applies to an aggregated result (sorting
 * by an output column) or to raw search rows (sorting by any field), so it is
 * offered independently of whether the query aggregates. Collapses to an "Add
 * sort" affordance when unsorted, mirroring the "Add time span" button.
 */
export const SortRow: React.FC<SortRowProps> = ({ sort, columns, dispatch }) => {
  if (!sort) {
    const addSortLabel = i18n.translate('explore.pplBuilder.addSort', {
      defaultMessage: 'Add sort',
    });
    return (
      <EuiToolTip content={addSortLabel} position="top">
        <EuiButtonIcon
          className="plqIconBtn"
          iconType="sortable"
          color="primary"
          size="s"
          // Default to the first candidate column, descending — the typical
          // "top N" reading of a result.
          onClick={() =>
            dispatch({ type: 'SET_SORT', sort: { column: columns[0] ?? '', desc: true } })
          }
          aria-label={addSortLabel}
          data-test-subj="pplBuilderAddSort"
        />
      </EuiToolTip>
    );
  }

  const options = columns.map((c) => ({ label: c }));
  const selectedOptions = sort.column ? [{ label: sort.column }] : [];
  const setColumn = (column: string) => dispatch({ type: 'SET_SORT', sort: { ...sort, column } });

  return (
    <div className="plqGroup" data-test-subj="pplBuilderSortChip">
      <span className="plqGroup__label">
        {i18n.translate('explore.pplBuilder.sortBy', { defaultMessage: 'Sort by' })}
      </span>
      <EuiComboBox
        compressed
        singleSelection={{ asPlainText: true }}
        style={{ minWidth: 200 }}
        placeholder={i18n.translate('explore.pplBuilder.sortColumnPlaceholder', {
          defaultMessage: 'column',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={(selected) => setColumn(selected[0]?.label ?? '')}
        onCreateOption={(value) => {
          const v = value.trim();
          if (v) setColumn(v);
        }}
        isClearable={false}
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
