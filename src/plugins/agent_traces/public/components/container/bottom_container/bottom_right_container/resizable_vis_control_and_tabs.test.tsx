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

jest.mock('../../../../application/pages/traces/use_trace_metrics', () => ({
  useTraceMetrics: () => ({ metrics: null, loading: false, error: null, refresh: jest.fn() }),
}));

jest.mock('../../../../application/pages/traces/trace_metrics_bar', () => ({
  TraceMetricsBar: () => <div data-test-subj="traceMetricsBar">Metrics Bar</div>,
}));

describe('<ResizableVisControlAndTabs />', () => {
  test('it should render AgentTracesTabs', () => {
    render(<ResizableVisControlAndTabs />);
    expect(screen.getByTestId('agentTraces-tabs')).toBeInTheDocument();
  });
});
