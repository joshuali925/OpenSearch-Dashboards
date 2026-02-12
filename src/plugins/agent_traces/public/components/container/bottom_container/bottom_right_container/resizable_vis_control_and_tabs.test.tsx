/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ResizableVisControlAndTabs } from './resizable_vis_control_and_tabs';

jest.mock('../../../tabs/tabs', () => ({
  AgentTracesTabs: () => <div data-test-subj="agentTraces-tabs">Agent Traces Tabs</div>,
}));

describe('<ResizableVisControlAndTabs />', () => {
  test('it should render AgentTracesTabs', () => {
    render(<ResizableVisControlAndTabs />);
    expect(screen.getByTestId('agentTraces-tabs')).toBeInTheDocument();
  });
});
