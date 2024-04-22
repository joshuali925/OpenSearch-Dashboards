/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { wrapWithIntl } from 'test_utils/enzyme_helpers';

// @ts-ignore
import { mount, ReactWrapper, ShallowWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { ChangeIndexPattern } from './change_indexpattern';
import { VisIndexPatternSelector } from './vindex_pattern_selector';
import { EuiPopover } from '@elastic/eui';
import { IndexPattern } from 'src/plugins/data/public';
import { mockManagementPlugin } from '../../../index_pattern_management/public/mocks';
import { OpenSearchDashboardsContextProvider } from '../../../opensearch_dashboards_react/public';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const indexPatternsIdsWithTitle = [
  { id: 'test1', title: 'Test 1' },
  { id: 'test2', title: 'Test 2' },
  { id: 'test3', title: 'Test 3' },
] as Array<{ id: string; title: string }>;

const defaultProps = {
  selectedIndexPattern: indexPatternsIdsWithTitle[0],
  onChange: jest.fn(async () => {}),
} as any;

describe('VisIndexPatternSelector', () => {
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();
  mockedContext.data.indexPatterns.getIdsWithTitle = jest
    .fn()
    .mockReturnValue(Promise.resolve(indexPatternsIdsWithTitle));
  mockedContext.data.indexPatterns.get = jest.fn((id) =>
    Promise.resolve(indexPatternsIdsWithTitle.filter((item) => item.id === id)[0] as IndexPattern)
  );

  it('fails without an exception on invalid props', async () => {
    // Use an empty indexPatterns list
    const emptyContext = mockManagementPlugin.createIndexPatternManagmentContext();
    emptyContext.data.indexPatterns.getIdsWithTitle = jest
      .fn()
      .mockReturnValue(Promise.resolve({}));

    const invalidProps = {
      selectedIndexPattern: null,
      onChange: jest.fn(),
    } as any;

    const component = mount(wrapWithIntl(<VisIndexPatternSelector {...invalidProps} />), {
      wrappingComponent: OpenSearchDashboardsContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    await act(async () => {
      await flushPromises();
    });

    expect(component).toMatchSnapshot('""');
  });

  it('should display the selected index pattern', async () => {
    const component = mount(wrapWithIntl(<VisIndexPatternSelector {...defaultProps} />), {
      wrappingComponent: OpenSearchDashboardsContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    await act(async () => {
      await flushPromises();
    });

    component.update();

    expect(component.find(EuiPopover).text()).toBe(defaultProps.selectedIndexPattern.title);
    expect(component).toMatchSnapshot();
  });

  it('should list all index patterns', async () => {
    const component = mount(wrapWithIntl(<VisIndexPatternSelector {...defaultProps} />), {
      wrappingComponent: OpenSearchDashboardsContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    await act(async () => {
      await flushPromises();
    });

    component.update();

    expect(component.find(ChangeIndexPattern).prop('indexPatternItems')).toEqual(
      indexPatternsIdsWithTitle
    );
  });

  it('should update selected index pattern to target index pattern', async () => {
    const component = mount(wrapWithIntl(<VisIndexPatternSelector {...defaultProps} />), {
      wrappingComponent: OpenSearchDashboardsContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    await act(async () => {
      await flushPromises();
    });

    component.update();

    const onChange = component.find(ChangeIndexPattern).prop('onChange');
    await onChange(indexPatternsIdsWithTitle[1].id);

    expect(defaultProps.onChange).toHaveBeenCalledWith(indexPatternsIdsWithTitle[1]);
  });
});
