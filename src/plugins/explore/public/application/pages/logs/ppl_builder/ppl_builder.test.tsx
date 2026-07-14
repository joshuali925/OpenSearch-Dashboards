/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { PPLBuilder } from './ppl_builder';
import { PPLBuilderState, emptyState } from './types';

// Mock the shared react kibana module: CodeEditor (used by SearchBox) is
// rendered as a simple textbox so we can drive onChange, and
// useOpenSearchDashboards returns the minimal services the builder reads.
jest.mock('../../../../../../opensearch_dashboards_react/public', () => ({
  CodeEditor: ({ value, onChange }: any) => (
    <input
      data-test-subj="pplBuilderSearchBoxInput"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  useOpenSearchDashboards: jest.fn(() => ({
    services: {
      uiSettings: { get: jest.fn() },
      data: {
        query: {
          queryString: { getQuery: jest.fn(() => ({ dataset: undefined })) },
          timefilter: { timefilter: { getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })) } },
        },
        search: { aggs: { createAggConfigs: jest.fn() } },
      },
    },
  })),
}));

// @osd/monaco is globally mocked; SearchBox only needs monaco.languages.register.

// createHistogramConfigs pulls in the whole data plugin; stub it so the auto
// span interval derivation resolves without that import chain.
jest.mock('../../../../components/chart/utils', () => ({
  createHistogramConfigs: jest.fn(() => ({
    aggs: [{}, { buckets: { getInterval: () => ({ expression: '30s' }) } }],
  })),
}));

// The dataset context supplies the resolved DataView; the builder reads
// dataset.timeFieldName for span derivation.
jest.mock('../../../context', () => ({
  useDatasetContext: () => ({ dataset: { timeFieldName: '@timestamp' } }),
}));

// The field-data hook talks to services/autocomplete; stub it with static data.
jest.mock('./use_field_data', () => ({
  useFieldData: () => ({
    fields: [{ name: 'service' }, { name: 'bytes', type: 'number' }, { name: 'service.keyword' }],
    fieldNames: ['service', 'bytes', 'service.keyword'],
    // `.keyword` sub-fields are excluded — the PPL engine rejects them as a
    // sort target.
    sortableFieldNames: ['service', 'bytes'],
    fieldOptions: [{ label: 'service' }, { label: 'bytes' }],
    numericAndAggregatableOptions: [{ label: 'bytes' }],
    numericOptions: [{ label: 'bytes' }],
    dateFieldNames: ['@timestamp'],
    timeFieldName: '@timestamp',
    getValues: jest.fn(async () => []),
  }),
}));

const renderBuilder = (initialState: PPLBuilderState = emptyState()) => {
  const onQueryChange = jest.fn();
  const utils = render(<PPLBuilder initialState={initialState} onQueryChange={onQueryChange} />);
  return { ...utils, onQueryChange };
};

describe('PPLBuilder', () => {
  it('renders the search box and group rows', () => {
    renderBuilder();
    expect(screen.getByText('Search for')).toBeInTheDocument();
    expect(screen.getByText('Group into')).toBeInTheDocument();
    expect(screen.getByTestId('pplBuilderSearchBox')).toBeInTheDocument();
  });

  it('emits a source-less (empty) query on mount for an empty state', () => {
    const { onQueryChange } = renderBuilder();
    expect(onQueryChange).toHaveBeenCalledWith('', expect.anything());
  });

  it('seeds the search box from the existing search expression and emits it source-less', () => {
    const { onQueryChange } = renderBuilder({
      ...emptyState(),
      searchExpression: 'service="web-store"',
    });
    expect(onQueryChange).toHaveBeenCalledWith('service="web-store"', expect.anything());
    expect(screen.getByTestId('pplBuilderSearchBoxInput')).toHaveValue('service="web-store"');
  });

  it('emits typed search text without a source clause', () => {
    const { onQueryChange } = renderBuilder();
    fireEvent.change(screen.getByTestId('pplBuilderSearchBoxInput'), {
      target: { value: 'status>=500 AND error' },
    });
    expect(onQueryChange).toHaveBeenLastCalledWith('status>=500 AND error', expect.anything());
  });

  it('emits a leading pipe for a stats-only query so source prepends cleanly', () => {
    const { onQueryChange } = renderBuilder();
    // "Add metric" opens an aggregation picker; choosing Count appends the metric.
    fireEvent.click(screen.getByTestId('pplBuilderAddAggregation'));
    fireEvent.click(screen.getByText('Count'));
    expect(onQueryChange).toHaveBeenLastCalledWith('| stats count()', expect.anything());
  });

  it('renders a span chip and interval for an aggregated state', () => {
    renderBuilder({
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: [], span: { field: '@timestamp', interval: '5m', auto: false } },
    });
    expect(screen.getByTestId('pplBuilderSpanChip')).toBeInTheDocument();
    expect(screen.getByTestId('pplBuilderSpanInterval')).toHaveValue('5m');
  });

  it('offers an "Add sort" affordance as its own operation, even without aggregation', () => {
    renderBuilder();
    // Sort is an independent pipe stage: available up front, not gated on stats.
    expect(screen.getByTestId('pplBuilderAddSort')).toBeInTheDocument();
  });

  it('sorts raw rows by a dataset field when the query does not aggregate', () => {
    const { onQueryChange } = renderBuilder();
    fireEvent.click(screen.getByTestId('pplBuilderAddSort'));
    // Defaults to the first sortable dataset field (service), descending.
    expect(onQueryChange).toHaveBeenLastCalledWith('| sort -service', expect.anything());
  });

  it('omits `.keyword` sub-fields from the sort column suggestions', () => {
    renderBuilder({ ...emptyState(), sort: { column: 'service', desc: true } });
    // Open the sort column field popover to reveal its option list.
    fireEvent.click(screen.getByTestId('pplBuilderSortColumn'));
    // The plain fields are offered; the unsortable `.keyword` sub-field is not.
    expect(screen.getByTestId('pplBuilderFieldOption-service')).toBeInTheDocument();
    expect(screen.getByTestId('pplBuilderFieldOption-bytes')).toBeInTheDocument();
    expect(screen.queryByTestId('pplBuilderFieldOption-service.keyword')).not.toBeInTheDocument();
  });

  it('adds a descending sort on the first output column of an aggregated query', () => {
    const { onQueryChange } = renderBuilder({
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: ['service'] },
    });
    fireEvent.click(screen.getByTestId('pplBuilderAddSort'));
    // Defaults to the first sortable column (the count() metric), descending.
    expect(onQueryChange).toHaveBeenLastCalledWith(
      '| stats count() by service | sort -`count()`',
      expect.anything()
    );
  });

  it('renders a sort chip and removes the sort', () => {
    const { onQueryChange } = renderBuilder({
      ...emptyState(),
      aggregations: [{ id: 'a', fn: 'count' }],
      groupBy: { fields: ['service'] },
      sort: { column: 'service', desc: false },
    });
    expect(screen.getByTestId('pplBuilderSortChip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pplBuilderRemoveSort'));
    expect(onQueryChange).toHaveBeenLastCalledWith('| stats count() by service', expect.anything());
  });
});
