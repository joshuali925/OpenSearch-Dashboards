/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiComboBox } from '@elastic/eui';
import { LabelFilter } from './types';
import { useExploration } from './exploration_context';

export const LabelFilterPicker: React.FC = () => {
  const { dispatch, client } = useExploration();
  const [labelNames, setLabelNames] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [labelValues, setLabelValues] = useState<Array<{ label: string }>>([]);

  useEffect(() => {
    client
      .getLabelNames()
      .then(setLabelNames)
      .catch(() => setLabelNames(['job', 'instance']));
  }, [client]);

  useEffect(() => {
    if (!selectedLabel) return;
    client.getLabelValues(selectedLabel).then((vals) => {
      const sorted = vals.every((v) => v !== '' && !isNaN(Number(v)))
        ? vals.sort((a, b) => Number(a) - Number(b))
        : vals.sort();
      setLabelValues(sorted.map((v) => ({ label: v })));
    });
  }, [selectedLabel, client]);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} style={{ minWidth: 150 }}>
        <EuiComboBox
          placeholder="Add label filter..."
          singleSelection={{ asPlainText: true }}
          options={labelNames.map((n) => ({ label: n }))}
          selectedOptions={selectedLabel ? [{ label: selectedLabel }] : []}
          onChange={(opts) => setSelectedLabel(opts[0]?.label || '')}
          isClearable
          compressed
        />
      </EuiFlexItem>
      {selectedLabel && (
        <EuiFlexItem grow={false} style={{ minWidth: 150 }}>
          <EuiComboBox
            placeholder={`${selectedLabel}=...`}
            singleSelection={{ asPlainText: true }}
            options={labelValues}
            onChange={(opts) => {
              if (opts[0]) {
                dispatch({
                  type: 'ADD_FILTER',
                  filter: { name: selectedLabel, value: opts[0].label },
                });
                setSelectedLabel('');
                setLabelValues([]);
              }
            }}
            compressed
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const LabelFilterBadges: React.FC = () => {
  const { state, dispatch } = useExploration();
  if (!state.filters.length) return null;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
      {state.filters.map((f: LabelFilter, i: number) => (
        <EuiFlexItem key={i} grow={false}>
          <EuiBadge
            color="hollow"
            iconType="cross"
            iconSide="right"
            iconOnClick={() => dispatch({ type: 'REMOVE_FILTER', index: i })}
            iconOnClickAriaLabel={`Remove filter ${f.name}=${f.value}`}
          >
            {f.name}={f.value}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
