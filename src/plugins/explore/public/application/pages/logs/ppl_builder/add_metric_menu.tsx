/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { AggFn } from './types';
import { AGG_FUNCTIONS } from './operations';

interface AddMetricMenuProps {
  /** Called with the chosen aggregation when the user adds a metric. */
  onAdd: (fn: AggFn) => void;
  dataTestSubj?: string;
}

/**
 * "Add metric" affordance: opens a menu of aggregations and appends a new metric
 * row using the chosen one. This is the single place a metric is *created* (and
 * its aggregation picked); the aggregation stays editable afterward via the
 * row's "Show" dropdown, and scalar functions are added via the row's "Function"
 * menu. Keeping aggregation selection here (not in "Function") avoids two
 * competing entry points for the same choice.
 */
export const AddMetricMenu: React.FC<AddMetricMenuProps> = ({ onAdd, dataTestSubj }) => {
  const [isOpen, setIsOpen] = useState(false);

  const panels = useMemo(
    () => [
      {
        id: 0,
        title: i18n.translate('explore.pplBuilder.addMetricTitle', {
          defaultMessage: 'Select aggregation',
        }),
        items: AGG_FUNCTIONS.map((agg) => ({
          name: agg.label,
          onClick: () => {
            onAdd(agg.id);
            setIsOpen(false);
          },
        })),
      },
    ],
    [onAdd]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="plusInCircle"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj={dataTestSubj}
        >
          {i18n.translate('explore.pplBuilder.addMetric', { defaultMessage: 'Add metric' })}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
    </EuiPopover>
  );
};
