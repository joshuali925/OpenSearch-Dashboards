/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactElement } from 'react';
import { shallow } from 'enzyme';
import { ChangeIndexPattern } from './change_indexpattern';
import { EuiPopover } from '@elastic/eui';

const indexPatternsIdsWithTitle = [
  { id: 'test1', title: 'Test 1' },
  { id: 'test2', title: 'Test 2' },
  { id: 'test3', title: 'Test 3' },
] as Array<{ id: string; title: string }>;

const defaultProps = {
  trigger: {
    label: indexPatternsIdsWithTitle[0].title,
  },
  indexPatternId: indexPatternsIdsWithTitle[0].id,
  indexPatternItems: indexPatternsIdsWithTitle,
  onChange: jest.fn(),
};

describe('ChangeIndexPattern', () => {
  it('fails without an exception on invalid props', async () => {
    const invalidProps = {
      trigger: null,
      indexPatternId: null,
      indexPatternItems: null,
      onChange: null,
    } as any;

    const wrapper = shallow(<ChangeIndexPattern {...invalidProps} />);
    expect(wrapper).toMatchSnapshot('""');
  });

  it('should render correctly when not open', async () => {
    const wrapper = shallow(<ChangeIndexPattern {...defaultProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly when open', async () => {
    const wrapper = shallow(<ChangeIndexPattern {...defaultProps} />);

    (wrapper.find(EuiPopover).prop('button') as ReactElement).props.onClick();

    expect(wrapper).toMatchSnapshot();
  });
});
