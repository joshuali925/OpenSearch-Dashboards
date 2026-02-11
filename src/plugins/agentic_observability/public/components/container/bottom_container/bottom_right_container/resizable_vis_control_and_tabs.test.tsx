/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ResizableVisControlAndTabs } from './resizable_vis_control_and_tabs';

jest.mock('../../../tabs/tabs', () => ({
  AgenticObservabilityTabs: () => (
    <div data-test-subj="agenticObs-tabs">Agentic Observability Tabs</div>
  ),
}));

describe('<ResizableVisControlAndTabs />', () => {
  test('it should render AgenticObservabilityTabs', () => {
    render(<ResizableVisControlAndTabs />);
    expect(screen.getByTestId('agenticObs-tabs')).toBeInTheDocument();
  });
});
