/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ExpandableSpanTable } from './expandable_span_table';
import { useSpanData } from './use_span_data';

/**
 * Spans tab component for displaying individual span entries (flat, no nesting)
 */
export const SpansTab = () => {
  const spanData = useSpanData();

  return (
    <div className="agentTraces-spans-tab tab-container">
      <ExpandableSpanTable
        rows={spanData.rows}
        loading={spanData.loading}
        error={spanData.error}
        refresh={spanData.refresh}
        expandRow={spanData.expandRow}
        spansCache={spanData.spansCache}
        loadingState={spanData.loadingState}
        entityLabel="spans"
        emptyDescription="No AI agent spans were found in the otel-v1-apm-span index. Make sure your application is instrumented with OpenTelemetry and is sending spans."
      />
    </div>
  );
};
