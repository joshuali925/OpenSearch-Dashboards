/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AgentTracesTabs } from '../../../tabs/tabs';
import {
  useTraceMetrics,
  TraceMetricsContext,
} from '../../../../application/pages/traces/hooks/use_trace_metrics';
import { TraceMetricsBar } from '../../../../application/pages/traces/trace_metrics_bar';
import { TraceFlyoutProvider } from '../../../../application/pages/traces/flyout/trace_flyout_context';

export const ResizableVisControlAndTabs = () => {
  const metricsResult = useTraceMetrics(true);

  return (
    <TraceMetricsContext.Provider value={metricsResult}>
      <TraceFlyoutProvider>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}>
          <div className="agentTracesMetrics__barWrapper">
            <TraceMetricsBar metrics={metricsResult.metrics} loading={metricsResult.loading} />
          </div>
          <AgentTracesTabs />
        </div>
      </TraceFlyoutProvider>
    </TraceMetricsContext.Provider>
  );
};
