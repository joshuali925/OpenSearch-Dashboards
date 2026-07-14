/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { i18n } from '@osd/i18n';
import { AggFn } from './types';
import { AGG_FUNCTIONS } from './operations';
import { CategoryFunctionMenu } from '../../../components/query_builder';

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
  // A flat list of aggregations (no categories): rendered as root items so the
  // menu opens straight onto the choices rather than a single category to drill.
  const rootItems = useMemo(
    () =>
      AGG_FUNCTIONS.map((agg) => ({
        name: agg.label,
        description: agg.description,
        onClick: () => onAdd(agg.id),
      })),
    [onAdd]
  );

  return (
    <CategoryFunctionMenu
      categories={[]}
      onSelect={() => {}}
      extraRootItems={rootItems}
      trigger={{
        kind: 'icon',
        iconType: 'plusInCircle',
        className: 'plqIconBtn',
        ariaLabel: i18n.translate('explore.pplBuilder.addMetric', {
          defaultMessage: 'Add metric',
        }),
      }}
      rootTitle={i18n.translate('explore.pplBuilder.addMetricTitle', {
        defaultMessage: 'Select aggregation',
      })}
      panelClassName="cfmMenuPanel"
      dataTestSubj={dataTestSubj}
    />
  );
};
