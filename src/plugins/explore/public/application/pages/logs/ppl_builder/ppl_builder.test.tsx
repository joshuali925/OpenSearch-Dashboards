/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PPLBuilder } from './ppl_builder';
import { PPLBuilderState, emptyState } from './types';

jest.mock('../../../../../../opensearch_dashboards_react/public', () => ({
  useOpenSearchDashboards: jest.fn(() => ({
    services: {
      uiSettings: { get: jest.fn() },
      data: {
        query: {
          queryString: {
            getQuery: jest.fn(() => ({ dataset: undefined })),
          },
          timefilter: { timefilter: { getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })) } },
        },
        search: { aggs: { createAggConfigs: jest.fn() } },
      },
    },
  })),
}));

// createHistogramConfigs pulls in the whole data plugin; stub it so the auto
// span interval derivation resolves without that import chain.
jest.mock('../../../../components/chart/utils', () => ({
  createHistogramConfigs: jest.fn(() => ({
    aggs: [{}, { buckets: { getInterval: () => ({ expression: '30s' }) } }],
  })),
}));

// The field-data hook talks to services/autocomplete; stub it with static options.
jest.mock('./use_field_data', () => ({
  useFieldData: () => ({
    fields: [{ name: 'service' }, { name: 'bytes', type: 'number' }],
    fieldOptions: [{ label: 'service' }, { label: 'bytes' }],
    numericAndAggregatableOptions: [{ label: 'bytes' }],
    timeFieldName: '@timestamp',
    valueOptions: {},
    valueLoading: {},
    loadValues: jest.fn(),
  }),
}));

const renderBuilder = (initialState: PPLBuilderState = emptyState()) => {
  const onQueryChange = jest.fn();
  const utils = render(
    <PPLBuilder
      sourcePrefix="source = logs"
      initialState={initialState}
      onQueryChange={onQueryChange}
    />
  );
  return { ...utils, onQueryChange };
};

describe('PPLBuilder', () => {
  it('renders the search and group rows with a preview placeholder', () => {
    renderBuilder();
    expect(screen.getByText('Search for')).toBeInTheDocument();
    expect(screen.getByText('Group into')).toBeInTheDocument();
    expect(screen.getByTestId('pplBuilderQueryPreview')).toBeInTheDocument();
  });

  it('emits the source prefix immediately on mount for an empty state', () => {
    const { onQueryChange } = renderBuilder();
    expect(onQueryChange).toHaveBeenCalledWith('source = logs', expect.anything());
  });

  it('renders an existing field filter and emits its where clause', () => {
    const { onQueryChange } = renderBuilder({
      ...emptyState(),
      filters: [{ id: 'a', field: 'service', op: '=', value: 'web-store', isFullText: false }],
    });
    expect(onQueryChange).toHaveBeenCalledWith(
      "source = logs | where service = 'web-store'",
      expect.anything()
    );
    expect(screen.getByTestId('pplBuilderFilter-0')).toBeInTheDocument();
  });

  it('adds an aggregation when "Add metric" is clicked', () => {
    const { onQueryChange } = renderBuilder();
    fireEvent.click(screen.getByTestId('pplBuilderAddAggregation'));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      'source = logs | stats count()',
      expect.anything()
    );
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

  it('offers the add-filter menu with field and full-text options', () => {
    renderBuilder();
    fireEvent.click(screen.getByTestId('pplBuilderAddFilter'));
    expect(screen.getByTestId('pplBuilderAddFieldFilter')).toBeInTheDocument();
    expect(screen.getByTestId('pplBuilderAddFullTextFilter')).toBeInTheDocument();
  });
});
