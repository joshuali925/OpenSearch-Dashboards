/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiButtonIcon,
  EuiSuperSelect,
  EuiFieldText,
} from '@elastic/eui';
import { BuilderAction } from './build_ppl';
import { FILTER_OPS, SearchFilter } from './types';

interface SearchFilterRowProps {
  filter: SearchFilter;
  idx: number;
  fieldOptions: EuiComboBoxOptionOption[];
  valueOptions: EuiComboBoxOptionOption[];
  valueLoading: boolean;
  dispatch: React.Dispatch<BuilderAction>;
  onLoadValues: (fieldName: string) => void;
}

/**
 * One search-row pill: either a `field <op> value` matcher or a bare full-text
 * term. Mirrors the metrics LabelFilterRow layout with a PPL-oriented op set.
 */
export const SearchFilterRow: React.FC<SearchFilterRowProps> = ({
  filter,
  idx,
  fieldOptions,
  valueOptions,
  valueLoading,
  dispatch,
  onLoadValues,
}) => {
  if (filter.isFullText) {
    return (
      <div className="plqGroup" data-test-subj={`pplBuilderFilter-${idx}`}>
        <span className="plqGroup__label">
          {i18n.translate('explore.pplBuilder.searchTerm', { defaultMessage: 'Search' })}
        </span>
        <EuiFieldText
          compressed
          controlOnly
          placeholder={i18n.translate('explore.pplBuilder.searchTermPlaceholder', {
            defaultMessage: 'Full-text term',
          })}
          value={filter.value}
          onChange={(e) =>
            dispatch({ type: 'SET_FILTER', index: idx, filter: { value: e.target.value } })
          }
          className="plqParamInput"
          data-test-subj={`pplBuilderFilterTerm-${idx}`}
        />
        <div className="plqSep" />
        <EuiButtonIcon
          iconType="cross"
          color="text"
          size="s"
          aria-label={i18n.translate('explore.pplBuilder.removeFilter', {
            defaultMessage: 'Remove filter',
          })}
          onClick={() => dispatch({ type: 'REMOVE_FILTER', index: idx })}
        />
      </div>
    );
  }

  return (
    <div className="plqGroup" data-test-subj={`pplBuilderFilter-${idx}`}>
      <span className="plqGroup__label">
        {i18n.translate('explore.pplBuilder.filter', { defaultMessage: 'Filter' })}
      </span>
      <EuiComboBox
        compressed
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        placeholder={i18n.translate('explore.pplBuilder.fieldName', {
          defaultMessage: 'Field',
        })}
        options={fieldOptions}
        selectedOptions={filter.field ? [{ label: filter.field }] : []}
        onChange={(selected) => {
          const field = selected[0]?.label || '';
          dispatch({ type: 'SET_FILTER', index: idx, filter: { field, value: '' } });
          if (field) onLoadValues(field);
        }}
        onCreateOption={(val) => {
          const field = val.trim();
          if (field) {
            dispatch({ type: 'SET_FILTER', index: idx, filter: { field, value: '' } });
            onLoadValues(field);
          }
        }}
        style={{ minWidth: 120 }}
        data-test-subj={`pplBuilderFilterField-${idx}`}
      />
      <div className="plqSep" />
      <EuiSuperSelect
        compressed
        options={FILTER_OPS.map((op) => ({ value: op, inputDisplay: op }))}
        valueOfSelected={filter.op}
        onChange={(value) => dispatch({ type: 'SET_FILTER', index: idx, filter: { op: value } })}
        className="plqOperatorSelect"
        data-test-subj={`pplBuilderFilterOp-${idx}`}
      />
      <div className="plqSep" />
      <EuiComboBox
        compressed
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        placeholder={i18n.translate('explore.pplBuilder.fieldValue', {
          defaultMessage: 'Value',
        })}
        options={valueOptions}
        isLoading={valueLoading}
        selectedOptions={filter.value ? [{ label: filter.value }] : []}
        onChange={(selected) =>
          dispatch({ type: 'SET_FILTER', index: idx, filter: { value: selected[0]?.label || '' } })
        }
        onCreateOption={(val) => {
          const v = val.trim();
          if (v) dispatch({ type: 'SET_FILTER', index: idx, filter: { value: v } });
        }}
        onFocus={() => {
          if (filter.field) onLoadValues(filter.field);
        }}
        style={{ minWidth: 120 }}
        data-test-subj={`pplBuilderFilterValue-${idx}`}
      />
      <div className="plqSep" />
      <EuiButtonIcon
        iconType="cross"
        color="text"
        size="s"
        aria-label={i18n.translate('explore.pplBuilder.removeFilter', {
          defaultMessage: 'Remove filter',
        })}
        onClick={() => dispatch({ type: 'REMOVE_FILTER', index: idx })}
      />
    </div>
  );
};
