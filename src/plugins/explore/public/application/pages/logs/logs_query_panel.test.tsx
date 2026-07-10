/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { LogsQueryPanel } from './logs_query_panel';
import {
  queryReducer,
  queryEditorReducer,
  legacyReducer,
} from '../../utils/state_management/slices';

jest.mock('@osd/i18n', () => ({
  i18n: { translate: jest.fn((_key, opts) => opts.defaultMessage) },
}));

const mockSetQuery = jest.fn();
const mockGetQuery = jest.fn(() => ({ query: '', language: 'PPL', dataset: undefined }));

jest.mock('../../../../../opensearch_dashboards_react/public', () => ({
  useOpenSearchDashboards: jest.fn(),
}));

// The data plugin's UI barrel calls withOpenSearchDashboards at import time and
// isn't needed here; stub it (keeping harmless value exports) so the selectors'
// transitive import resolves without mounting the query bar.
jest.mock('../../../../../data/public', () => ({
  ResultStatus: {
    UNINITIALIZED: 'uninitialized',
    LOADING: 'loading',
    READY: 'ready',
    NO_RESULTS: 'none',
    ERROR: 'error',
  },
}));

// Keep the real parsePPL/types (mode decision depends on parsePPL) but stub the
// heavy PPLBuilder component, whose module pulls in the data plugin via
// createHistogramConfigs. Re-export from the leaf modules to avoid that chain.
jest.mock('./ppl_builder', () => ({
  ...jest.requireActual('./ppl_builder/parse_ppl'),
  ...jest.requireActual('./ppl_builder/types'),
  PPLBuilder: () => <div data-test-subj="ppl-builder-stub">Builder</div>,
}));

jest.mock('../../../components/query_panel/query_panel_widgets', () => ({
  QueryPanelWidgets: () => <div data-test-subj="query-panel-widgets">Widgets</div>,
}));
jest.mock('../../../components/query_panel/query_panel_editor', () => ({
  QueryPanelEditor: () => <div data-test-subj="code-editor-stub">Code Editor</div>,
}));
jest.mock('../../../components/query_panel/query_panel_generated_query', () => ({
  QueryPanelGeneratedQuery: () => <div />,
}));
jest.mock('../../../components/query_panel/actions/ppl_execute_query_action', () => ({
  usePPLExecuteQueryAction: jest.fn(),
}));
jest.mock('../../../application/hooks', () => ({
  useSetEditorTextWithQuery: () => jest.fn(),
}));
jest.mock(
  '../../../application/hooks/editor_hooks/use_set_editor_text/use_set_editor_text',
  () => ({
    useSetEditorText: () => jest.fn(),
  })
);

const makeStore = (query: string, savedSearch?: string) =>
  configureStore({
    reducer: { query: queryReducer, queryEditor: queryEditorReducer, legacy: legacyReducer },
    preloadedState: {
      query: { query, language: 'PPL', dataset: { id: '1', title: 'logs' } },
      legacy: { savedSearch },
    } as any,
  });

const setupServices = () => {
  (useOpenSearchDashboards as jest.Mock).mockReturnValue({
    services: {
      uiSettings: { get: jest.fn() },
      data: {
        query: {
          queryString: {
            getQuery: mockGetQuery,
            setQuery: mockSetQuery,
            getInitialQueryByDataset: jest.fn(() => ({ query: 'source = logs' })),
          },
        },
      },
    },
  });
};

const renderPanel = (query: string, savedSearch?: string) =>
  render(
    <Provider store={makeStore(query, savedSearch)}>
      <LogsQueryPanel />
    </Provider>
  );

describe('LogsQueryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupServices();
    mockGetQuery.mockReturnValue({ query: '', language: 'PPL', dataset: { id: '1' } as any });
  });

  it('defaults a fresh query to builder mode', () => {
    renderPanel('');
    expect(screen.getByTestId('ppl-builder-stub')).toBeInTheDocument();
    expect(screen.getByTestId('logsQueryPanelModeToggle')).toBeInTheDocument();
  });

  it('opens a parseable query in builder mode', () => {
    renderPanel('source = logs service="web-store"');
    expect(screen.getByTestId('ppl-builder-stub')).toBeInTheDocument();
  });

  it('opens an unparseable query in code mode', () => {
    renderPanel('source = logs | sort field');
    expect(screen.getByTestId('code-editor-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('ppl-builder-stub')).not.toBeInTheDocument();
  });

  it('opens a saved-loaded query in code mode even when parseable', () => {
    renderPanel('source = logs service="web-store"', 'saved-id');
    expect(screen.getByTestId('code-editor-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('ppl-builder-stub')).not.toBeInTheDocument();
  });

  it('locks Builder after switching a parseable query to Code (one-way in-session)', () => {
    renderPanel('source = logs service="web-store"');
    expect(screen.getByTestId('ppl-builder-stub')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('code'));
    expect(screen.getByTestId('code-editor-stub')).toBeInTheDocument();

    // Even though the query is parseable, Builder stays locked for the session.
    fireEvent.click(screen.getByTestId('builder'));
    expect(screen.getByTestId('code-editor-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('ppl-builder-stub')).not.toBeInTheDocument();
  });
});
