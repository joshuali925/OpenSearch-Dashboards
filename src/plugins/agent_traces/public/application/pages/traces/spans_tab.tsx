/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { SpansTable } from './spans_table';

/**
 * Spans tab component for displaying individual span entries (flat, no nesting)
 */
export const SpansTab = () => {
  return (
    <div className="agentTraces-spans-tab tab-container">
      <SpansTable />
    </div>
  );
};
