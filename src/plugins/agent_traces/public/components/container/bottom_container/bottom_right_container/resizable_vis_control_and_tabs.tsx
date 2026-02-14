/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AgentTracesTabs } from '../../../tabs/tabs';
import { useTraceMetrics } from '../../../../application/pages/traces/use_trace_metrics';
import { TraceMetricsBar } from '../../../../application/pages/traces/trace_metrics_bar';

export const ResizableVisControlAndTabs = () => {
  const { metrics, loading: metricsLoading } = useTraceMetrics(true);

  return (
    <>
      <div style={{ padding: '0 16px' }}>
        <TraceMetricsBar metrics={metrics} loading={metricsLoading} />
      </div>
      <AgentTracesTabs />
    </>
  );
};
