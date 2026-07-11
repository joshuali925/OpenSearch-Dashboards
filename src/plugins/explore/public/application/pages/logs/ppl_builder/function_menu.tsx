/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { ScalarCall } from './types';
import { SCALAR_FN_CATEGORIES } from './operations';
import { CategoryFunctionMenu } from '../../../components/query_builder';

interface FunctionMenuProps {
  /** Called with a fresh ScalarCall when the user picks a scalar function. */
  onAddFunction: (fn: ScalarCall) => void;
  dataTestSubj?: string;
}

/**
 * Add-function affordance for an aggregation row: a compact overflow (⋮) icon
 * button that opens a category-grouped menu of scalar functions (Math / String
 * / Date & time) wrapping the row's field, mirroring the metric explorer's
 * OpsMenu. It sits at the row's trailing edge so the row reads
 * `Show <fn> <field> <fns…> ✕ ⋮`. The aggregation itself is chosen when the
 * metric is created (the "Add metric" menu) and edited via the row's "Show"
 * dropdown, so it is NOT offered here.
 */
export const FunctionMenu: React.FC<FunctionMenuProps> = ({ onAddFunction, dataTestSubj }) => (
  <CategoryFunctionMenu
    categories={SCALAR_FN_CATEGORIES}
    onSelect={(item) => onAddFunction({ id: item.id, name: item.name, params: [...item.params] })}
    trigger={{
      kind: 'icon',
      iconType: 'boxesVertical',
      color: 'text',
      ariaLabel: i18n.translate('explore.pplBuilder.addFunction', {
        defaultMessage: 'Add function',
      }),
    }}
    rootTitle={i18n.translate('explore.pplBuilder.addFunctionTitle', {
      defaultMessage: 'Add function',
    })}
    panelClassName="cfmMenuPanel"
    dataTestSubj={dataTestSubj}
  />
);
