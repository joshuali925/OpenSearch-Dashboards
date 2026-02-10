/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ExploreDataTable } from '../data_table/explore_data_table';
import { ActionBar } from './action_bar/action_bar';
import { TracesTable } from './traces_table';
import { useFlavorId } from '../../helpers/use_flavor_id';
import { ExploreFlavor } from '../../../common';

/**
 * Logs tab component for displaying log entries or traces
 */
export const LogsTab = () => {
  const flavorId = useFlavorId();
  const isTracesFlavor = flavorId === ExploreFlavor.Traces;

  return (
    <div className="agenticObs-logs-tab tab-container">
      {!isTracesFlavor && <ActionBar />}
      {isTracesFlavor ? <TracesTable /> : <ExploreDataTable />}
    </div>
  );
};
