/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { TracesTable } from './traces_table';

/**
 * Traces tab component for displaying trace entries
 */
export const LogsTab = () => {
  return (
    <div className="agentTraces-logs-tab tab-container">
      <TracesTable />
    </div>
  );
};
