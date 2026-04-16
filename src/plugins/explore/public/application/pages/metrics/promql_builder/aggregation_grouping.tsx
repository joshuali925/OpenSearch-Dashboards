/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiComboBoxOptionOption, EuiBadge, EuiPopover, EuiSuperSelect } from '@elastic/eui';
import { Operation, OperationGrouping } from './promql_parser';
import { BuilderAction } from './build_promql';

const MODE_OPTIONS = [
  { value: 'by' as const, inputDisplay: 'by labels ▾' },
  { value: 'without' as const, inputDisplay: 'without ▾' },
];

export const useAggregationGrouping = (
  op: Operation,
  opIndex: number,
  labelOptions: EuiComboBoxOptionOption[],
  dispatch: React.Dispatch<BuilderAction>
) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const mode = op.grouping?.mode || 'by';
  const labels = op.grouping?.labels || [];

  const availableLabels = useMemo(() => {
    const all = labelOptions.map((o) => o.label);
    if (!search) return all;
    const lower = search.toLowerCase();
    return all.filter((l) => l.toLowerCase().includes(lower));
  }, [labelOptions, search]);

  const setGrouping = (g?: OperationGrouping) =>
    dispatch({ type: 'SET_OPERATION_GROUPING', index: opIndex, grouping: g });

  const toggleLabel = (label: string) => {
    const next = labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label];
    setGrouping(next.length ? { mode, labels: next } : undefined);
  };

  const removeLabel = (label: string) => {
    const next = labels.filter((l) => l !== label);
    setGrouping(next.length ? { mode, labels: next } : undefined);
  };

  const setMode = (newMode: 'by' | 'without') => setGrouping({ mode: newMode, labels });

  const toggleSelectAll = () => {
    const all = labelOptions.map((o) => o.label);
    const next = labels.length === all.length ? [] : all;
    setGrouping(next.length ? { mode, labels: next } : undefined);
  };

  const appendEl = (
    <EuiPopover
      button={
        <button
          onClick={() => setPopoverOpen(!popoverOpen)}
          className="euiFormControlLayout__append pqbGroupingButton"
        >
          {mode} labels ▾
        </button>
      }
      isOpen={popoverOpen}
      closePopover={() => {
        setPopoverOpen(false);
        setSearch('');
      }}
      panelPaddingSize="s"
      anchorPosition="downLeft"
    >
      <div className="pqbGroupingPanel">
        <EuiSuperSelect
          compressed
          options={MODE_OPTIONS}
          valueOfSelected={mode}
          onChange={(val) => setMode(val)}
          className="pqbGroupingModeSelect"
        />
        <input
          placeholder={i18n.translate('explore.promqlBuilder.searchLabels', {
            defaultMessage: 'Search labels...',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pqbGroupingSearch"
        />
        <label className="pqbCheckboxLabel">
          <input
            type="checkbox"
            checked={labels.length > 0 && labels.length === labelOptions.length}
            readOnly
            onChange={toggleSelectAll}
          />
          {i18n.translate('explore.promqlBuilder.selectAll', { defaultMessage: 'Select all' })}
        </label>
        <div className="pqbCheckboxList">
          {availableLabels.map((label) => (
            <label key={label} className="pqbCheckboxLabel">
              <input
                type="checkbox"
                checked={labels.includes(label)}
                onChange={() => toggleLabel(label)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </EuiPopover>
  );

  const badgesEl = labels.map((label) => (
    <EuiBadge
      key={label}
      color="hollow"
      iconType="cross"
      iconSide="right"
      iconOnClick={() => removeLabel(label)}
      iconOnClickAriaLabel={`Remove ${label}`}
      onClick={() => {}}
      onClickAriaLabel={label}
    >
      {label}
    </EuiBadge>
  ));

  return { appendEl, badgesEl };
};
