/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ExpandableSpanTable } from './expandable_span_table';
import { useSpanData } from './use_span_data';

/**
 * Traces tab component for displaying trace entries
 */
export const TracesTab = () => {
  const spanData = useSpanData();

  return (
    <div className="agentTraces-traces-tab tab-container">
      <ExpandableSpanTable
        rows={spanData.rows}
        loading={spanData.loading}
        error={spanData.error}
        refresh={spanData.refresh}
        expandRow={spanData.expandRow}
        spansCache={spanData.spansCache}
        loadingState={spanData.loadingState}
        entityLabel="traces"
        emptyDescription="No AI agent spans were found in the otel-v1-apm-span index. Make sure your application is instrumented with OpenTelemetry and is sending spans with gen_ai.operation.name attribute."
        resolveChildrenFromFullTree
      />
    </div>
  );
};
