/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
    fields: [{ name: 'service' }, { name: 'bytes', type: 'number' }],
    fieldNames: ['service', 'bytes'],
    fieldOptions: [{ label: 'service' }, { label: 'bytes' }],
    numericAndAggregatableOptions: [{ label: 'bytes' }],
    numericOptions: [{ label: 'bytes' }],
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
    // "Add metric" opens an aggregation picker; choosing Count appends the row.
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
});
