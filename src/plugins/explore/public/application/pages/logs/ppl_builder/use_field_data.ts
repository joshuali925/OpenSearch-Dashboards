/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
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
 * Provides the current dataset's field list (for the search/group comboboxes)
 * and lazy value suggestions for a field (for the search-box value autocomplete).
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

  const [valueOptions, setValueOptions] = useState<Record<string, EuiComboBoxOptionOption[]>>({});
  const [valueLoading, setValueLoading] = useState<Record<string, boolean>>({});

  const fields = useMemo<FieldInfo[]>(() => {
    const all = (dataset as any)?.fields?.getAll?.() ?? [];
    return all
      .filter((f: any) => f?.name && !f.name.startsWith('_'))
      .map((f: any) => ({ name: f.name, type: f.type, aggregatable: f.aggregatable }));
  }, [dataset]);

  const fieldOptions = useMemo<EuiComboBoxOptionOption[]>(
    () => fields.map((f) => ({ label: f.name })),
    [fields]
  );

  const numericAndAggregatableOptions = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      fields.filter((f) => f.type === 'number' || f.aggregatable).map((f) => ({ label: f.name })),
    [fields]
  );

  const timeFieldName = useMemo(() => (dataset as any)?.timeFieldName || '@timestamp', [dataset]);

  const loadValues = useCallback(
    async (fieldName: string, queryText = '') => {
      const indexPattern = dataset as any;
      const field = indexPattern?.fields?.getByName?.(fieldName);
      if (!indexPattern || !field || !data.autocomplete?.getValueSuggestions) return;

      setValueLoading((prev) => ({ ...prev, [fieldName]: true }));
      try {
        const suggestions = await data.autocomplete.getValueSuggestions({
          indexPattern,
          field,
          query: queryText,
        });
        setValueOptions((prev) => ({
          ...prev,
          [fieldName]: (suggestions || [])
            .filter((s: unknown) => s !== null && s !== undefined)
            .map((s: unknown) => ({ label: String(s) })),
        }));
      } catch {
        // Value suggestions are best-effort; a failure just yields no options.
        setValueOptions((prev) => ({ ...prev, [fieldName]: [] }));
      } finally {
        setValueLoading((prev) => ({ ...prev, [fieldName]: false }));
      }
    },
    [data, dataset]
  );

  return {
    fields,
    fieldOptions,
    numericAndAggregatableOptions,
    timeFieldName,
    valueOptions,
    valueLoading,
    loadValues,
  };
};
