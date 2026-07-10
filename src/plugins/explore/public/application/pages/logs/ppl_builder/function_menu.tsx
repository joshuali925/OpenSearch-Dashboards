/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover, EuiText } from '@elastic/eui';
import { AggFn, ScalarCall } from './types';
import { AGG_FUNCTIONS, SCALAR_FN_CATEGORIES } from './operations';

interface FunctionMenuProps {
  /**
   * Set the row's aggregation (the outermost function). Optional: omit to hide
   * the "Aggregation" category.
   */
  onSetAggregation?: (fn: AggFn) => void;
  /** Called with a fresh ScalarCall when the user picks a scalar function. */
  onAddFunction: (fn: ScalarCall) => void;
  dataTestSubj?: string;
}

/**
 * "Function" affordance for an aggregation row: one categorized menu that is the
 * single place to add anything to a metric — the aggregation (outermost, one per
 * metric) and any scalar functions wrapping the field (Math / String / Date &
 * time). Mirrors the metric explorer's OpsMenu so both builders read the same.
 * Picking an aggregation replaces the row's aggregation; picking a scalar
 * function wraps the field in it.
 */
export const FunctionMenu: React.FC<FunctionMenuProps> = ({
  onSetAggregation,
  onAddFunction,
  dataTestSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const panels = useMemo(() => {
    // Category list: aggregation first (when settable) then the scalar groups.
    // Scalar-category panel ids start at 2 to leave id 1 for the aggregation
    // panel (kept stable whether or not the aggregation category is shown).
    const aggregationCategory = i18n.translate('explore.pplBuilder.functionCategory.aggregation', {
      defaultMessage: 'Aggregation',
    });
    const rootItems = [
      ...(onSetAggregation ? [{ name: aggregationCategory, panel: 1 }] : []),
      ...SCALAR_FN_CATEGORIES.map((cat, i) => ({ name: cat.name, panel: i + 2 })),
    ];

    return [
      {
        id: 0,
        title: i18n.translate('explore.pplBuilder.addFunctionTitle', {
          defaultMessage: 'Add function',
        }),
        items: rootItems,
      },
      ...(onSetAggregation
        ? [
            {
              id: 1,
              title: aggregationCategory,
              items: AGG_FUNCTIONS.map((agg) => ({
                name: <strong>{agg.label}</strong>,
                onClick: () => {
                  onSetAggregation(agg.id);
                  setIsOpen(false);
                },
              })),
            },
          ]
        : []),
      ...SCALAR_FN_CATEGORIES.map((cat, i) => ({
        id: i + 2,
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
    ];
  }, [onSetAggregation, onAddFunction]);

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
