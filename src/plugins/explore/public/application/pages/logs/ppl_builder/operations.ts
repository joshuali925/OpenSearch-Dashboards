/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { AggFn } from './types';

export interface AggDef {
  id: AggFn;
  label: string;
  /** Whether the aggregation operates on a field (count does not). */
  needsField: boolean;
}

/**
 * Datadog-style function catalog, populated ONLY with PPL-expressible
 * aggregations (plan decision 9). Rate/Smoothing/Timeshift/Interpolation are
 * intentionally omitted until PPL/the backend supports them.
 */
export const AGG_FUNCTIONS: AggDef[] = [
  {
    id: 'count',
    label: i18n.translate('explore.pplBuilder.agg.count', { defaultMessage: 'Count' }),
    needsField: false,
  },
  {
    id: 'sum',
    label: i18n.translate('explore.pplBuilder.agg.sum', { defaultMessage: 'Sum' }),
    needsField: true,
  },
  {
    id: 'avg',
    label: i18n.translate('explore.pplBuilder.agg.avg', { defaultMessage: 'Average' }),
    needsField: true,
  },
  {
    id: 'min',
    label: i18n.translate('explore.pplBuilder.agg.min', { defaultMessage: 'Min' }),
    needsField: true,
  },
  {
    id: 'max',
    label: i18n.translate('explore.pplBuilder.agg.max', { defaultMessage: 'Max' }),
    needsField: true,
  },
  {
    id: 'percentile',
    label: i18n.translate('explore.pplBuilder.agg.percentile', {
      defaultMessage: 'Percentile',
    }),
    needsField: true,
  },
];

export const AGG_FN_MAP: Record<AggFn, AggDef> = AGG_FUNCTIONS.reduce((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {} as Record<AggFn, AggDef>);
