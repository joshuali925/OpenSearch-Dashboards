/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover, EuiText } from '@elastic/eui';
import { ScalarCall } from './types';
import { SCALAR_FN_CATEGORIES } from './operations';

interface ScalarFnMenuProps {
  /** Called with a fresh ScalarCall when the user picks a function. */
  onAdd: (fn: ScalarCall) => void;
  dataTestSubj?: string;
}

/**
 * "Add function" affordance for an aggregation row: a small button that opens a
 * category-grouped context menu of scalar functions (Math / String / Date &
 * time), mirroring the metric explorer's OpsMenu. Picking one wraps the row's
 * field in that function.
 */
export const ScalarFnMenu: React.FC<ScalarFnMenuProps> = ({ onAdd, dataTestSubj }) => {
  const [isOpen, setIsOpen] = useState(false);

  const panels = useMemo(
    () => [
      {
        id: 0,
        title: i18n.translate('explore.pplBuilder.addFunctionTitle', {
          defaultMessage: 'Add function',
        }),
        items: SCALAR_FN_CATEGORIES.map((cat, i) => ({ name: cat.name, panel: i + 1 })),
      },
      ...SCALAR_FN_CATEGORIES.map((cat, i) => ({
        id: i + 1,
        title: cat.name,
        items: cat.items.map((item) => ({
          name: (
            <div>
              <strong>{item.name}</strong>
              <EuiText size="xs" color="subdued" className="plqFnMenuDescription">
                {item.description}
              </EuiText>
            </div>
          ),
          onClick: () => {
            onAdd({ id: item.id, name: item.name, params: [...item.params] });
            setIsOpen(false);
          },
        })),
      })),
    ],
    [onAdd]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="functionAdd"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj={dataTestSubj}
        >
          {i18n.translate('explore.pplBuilder.addFunction', { defaultMessage: 'Function' })}
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
