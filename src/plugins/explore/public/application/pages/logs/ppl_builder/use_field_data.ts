/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../../types';
import { useDatasetContext } from '../../../context';

interface FieldInfo {
  name: string;
  type?: string;
  aggregatable?: boolean;
}

/**
 * Provides the current dataset's field list (for the search box and group-by
 * combobox) and lazy value suggestions for a field (for the search-box value
 * autocomplete).
 *
 * The resolved `DataView` comes from {@link useDatasetContext} (the same source
 * the histogram uses), NOT from `queryString.getQuery().dataset` — the latter is
 * a lightweight descriptor with no `fields`/`timeFieldName`, which is why field
 * and value suggestions were previously always empty. No new client — reuses
 * `data.autocomplete`.
 */
export const useFieldData = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { data } = services;
  const { dataset } = useDatasetContext();

  const fields = useMemo<FieldInfo[]>(() => {
    const all = (dataset as any)?.fields?.getAll?.() ?? [];
    return all
      .filter((f: any) => f?.name && !f.name.startsWith('_'))
      .map((f: any) => ({ name: f.name, type: f.type, aggregatable: f.aggregatable }));
  }, [dataset]);

  const fieldNames = useMemo<string[]>(() => fields.map((f) => f.name), [fields]);

  const fieldOptions = useMemo<EuiComboBoxOptionOption[]>(
    () => fields.map((f) => ({ label: f.name })),
    [fields]
  );

  // Any field usable as a `stats` argument (min/max/distinct_count/earliest/…).
  const numericAndAggregatableOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      fields.filter((f) => f.type === 'number' || f.aggregatable).map((f) => ({ label: f.name })),
    [fields]
  );

  // Numeric-only fields, for aggregations that require a number (avg/sum/…).
  // A text field such as `referer` is aggregatable (via its keyword sibling) but
  // averaging it is meaningless, so it is excluded here.
  const numericOptions = useMemo<EuiComboBoxOptionOption[]>(
    () => fields.filter((f) => f.type === 'number').map((f) => ({ label: f.name })),
    [fields]
  );

  const timeFieldName = useMemo(() => (dataset as any)?.timeFieldName || '@timestamp', [dataset]);

  /**
   * Fetch value suggestions for a field. Resolves to display strings (best
   * effort — an unknown field or a failed request yields an empty list). Tries
   * the `.keyword` sibling first since that is what carries aggregatable values.
   */
  const getValues = useCallback(
    async (fieldName: string): Promise<string[]> => {
      const indexPattern = dataset as any;
      if (!indexPattern || !data.autocomplete?.getValueSuggestions) return [];
      const field =
        indexPattern.fields?.getByName?.(`${fieldName}.keyword`) ||
        indexPattern.fields?.getByName?.(fieldName);
      if (!field) return [];
      try {
        const suggestions = await data.autocomplete.getValueSuggestions({
          indexPattern,
          field,
          query: '',
        });
        return (suggestions || [])
          .filter((s: unknown) => s !== null && s !== undefined)
          .map((s: unknown) => String(s));
      } catch {
        return [];
      }
    },
    [data, dataset]
  );

  return {
    fields,
    fieldNames,
    fieldOptions,
    numericAndAggregatableOptions,
    numericOptions,
    timeFieldName,
    getValues,
  };
};
