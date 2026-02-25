/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TraceFlowView } from './trace_flow_view';
import { TraceRow } from '../hooks/use_agent_traces';

jest.mock('@osd/i18n', () => ({
  i18n: {
    translate: (_key: string, opts: { defaultMessage: string }) => opts.defaultMessage,
  },
}));

jest.mock('@osd/i18n/react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => <>{defaultMessage}</>,
}));

jest.mock('@osd/apm-topology', () => ({
  CelestialMap: ({ children }: any) => <div data-test-subj="mock-celestial-map">{children}</div>,
  AgentCardNode: () => <div data-test-subj="mock-agent-card-node" />,
}));

jest.mock('../../../../services/span_categorization', () => ({
  categorizeSpanTree: jest.fn(() => []),
  getCategoryMeta: jest.fn(() => ({ color: '#ccc' })),
}));

jest.mock('../../../../services/flow_transform', () => ({
  spansToFlow: jest.fn(() => ({ nodes: [], edges: [] })),
}));

const mockTrace: TraceRow = {
  id: 'trace-1',
  spanId: 'span-1',
  traceId: 'trace-id-1',
  parentSpanId: null,
  status: 'success',
  kind: 'chat',
  name: 'Test',
  input: '',
  output: '',
  startTime: '',
  endTime: '',
  latency: '100ms',
  totalTokens: 10,
  totalCost: '—',
};

describe('TraceFlowView', () => {
  const defaultProps = {
    spanTree: [mockTrace],
    totalDuration: 1000,
    selectedSpan: null,
    onSelectSpan: jest.fn(),
  };

  it('renders loading state', () => {
    render(<TraceFlowView {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Loading trace graph...')).toBeInTheDocument();
  });

  it('renders empty state when no spans', () => {
    render(<TraceFlowView {...defaultProps} spanTree={[]} />);
    expect(screen.getByText('No spans to display')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<TraceFlowView {...defaultProps} loadError="Connection failed" />);
    expect(screen.getByText('Failed to load trace graph')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('renders CelestialMap when spans exist', () => {
    render(<TraceFlowView {...defaultProps} />);
    expect(screen.getByTestId('mock-celestial-map')).toBeInTheDocument();
  });
});
