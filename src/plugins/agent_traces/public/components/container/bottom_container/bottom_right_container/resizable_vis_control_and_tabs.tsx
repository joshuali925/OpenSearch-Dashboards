/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { AgentTracesTabs } from '../../../tabs/tabs';
import {
  useTraceMetrics,
  TraceMetricsContext,
} from '../../../../application/pages/traces/hooks/use_trace_metrics';
import { TraceMetricsBar } from '../../../../application/pages/traces/trace_metrics_bar';
import { TraceFlyoutProvider } from '../../../../application/pages/traces/flyout/trace_flyout_context';

export const ResizableVisControlAndTabs = () => {
  const metricsResult = useTraceMetrics(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Measure tabs height and set CSS variable for sticky offsets
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const tabs = wrapper.querySelector('.euiTabs');
    if (!tabs) return;

    const observer = new ResizeObserver(() => {
      const height = tabs.getBoundingClientRect().height;
      wrapper.style.setProperty('--tabs-height', `${height}px`);
    });
    observer.observe(tabs);
    return () => observer.disconnect();
  }, []);

  return (
    <TraceMetricsContext.Provider value={metricsResult}>
      <TraceFlyoutProvider>
        <div ref={wrapperRef}>
          <div className="agentTracesMetrics__barWrapper">
            <TraceMetricsBar metrics={metricsResult.metrics} loading={metricsResult.loading} />
          </div>
          <AgentTracesTabs />
        </div>
      </TraceFlyoutProvider>
    </TraceMetricsContext.Provider>
  );
};
