/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiText } from '@elastic/eui';
import { ScalarCall } from './types';
import { SCALAR_FN_CATEGORIES } from './operations';

interface FunctionMenuProps {
  /** Called with a fresh ScalarCall when the user picks a scalar function. */
  onAddFunction: (fn: ScalarCall) => void;
  dataTestSubj?: string;
}

/**
 * Add-function affordance for an aggregation row: a compact Σ icon button that
 * opens a category-grouped menu of scalar functions (Math / String / Date &
 * time) wrapping the row's field, mirroring the metric explorer's OpsMenu. It
 * sits at the row's trailing edge so the row reads `Show <fn> <field> <fns…> ✕ Σ`.
 * The aggregation itself is chosen when the metric is created (the "Add metric"
 * menu) and edited via the row's "Show" dropdown, so it is NOT offered here.
 */
export const FunctionMenu: React.FC<FunctionMenuProps> = ({ onAddFunction, dataTestSubj }) => {
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
            onAddFunction({ id: item.id, name: item.name, params: [...item.params] });
            setIsOpen(false);
          },
        })),
      })),
    ],
    [onAddFunction]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="functionAdd"
          color="text"
          size="s"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={i18n.translate('explore.pplBuilder.addFunction', {
            defaultMessage: 'Add function',
          })}
          data-test-subj={dataTestSubj}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      panelClassName="plqMenuPanel"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
    </EuiPopover>
  );
};
