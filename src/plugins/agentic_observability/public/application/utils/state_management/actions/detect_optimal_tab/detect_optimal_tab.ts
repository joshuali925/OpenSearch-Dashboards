/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { setActiveTab } from '../../slices';
import { AgenticObservabilityServices } from '../../../../../types';
import { AGENTIC_OBSERVABILITY_LOGS_TAB_ID } from '../../../../../../common';

/**
 * Detect the optimal tab based on results and sets it as active.
 * Currently always sets the logs/traces tab as active.
 */
export const detectAndSetOptimalTab = createAsyncThunk<
  void,
  { services: AgenticObservabilityServices; savedTabId?: string },
  { state: RootState }
>('ui/detectAndSetOptimalTab', async (_args, { dispatch }) => {
  dispatch(setActiveTab(AGENTIC_OBSERVABILITY_LOGS_TAB_ID));
});
