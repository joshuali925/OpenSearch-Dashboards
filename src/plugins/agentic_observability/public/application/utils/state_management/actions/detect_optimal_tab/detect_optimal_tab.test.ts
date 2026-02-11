/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectAndSetOptimalTab } from './detect_optimal_tab';
import { setActiveTab } from '../../slices';
import { AgenticObservabilityServices } from '../../../../../types';
import { AGENTIC_OBSERVABILITY_LOGS_TAB_ID } from '../../../../../../common';

jest.mock('../../slices');

const mockSetActiveTab = setActiveTab as jest.MockedFunction<typeof setActiveTab>;

describe('detect_optimal_tab', () => {
  let mockServices: AgenticObservabilityServices;
  let mockDispatch: jest.Mock;
  let mockGetState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDispatch = jest.fn();
    mockGetState = jest.fn();

    mockServices = {
      tabRegistry: {
        getTab: jest.fn(),
        getAllTabs: jest
          .fn()
          .mockReturnValue([{ id: AGENTIC_OBSERVABILITY_LOGS_TAB_ID, label: 'Traces' }]),
      },
    } as any;

    mockGetState.mockReturnValue({
      query: { query: 'source = otel-v1-apm-span' },
      results: {},
      queryEditor: { queryStatusMap: {} },
    });
  });

  describe('detectAndSetOptimalTab', () => {
    it('should always set logs/traces tab as active', async () => {
      const mockAction = {
        type: 'setActiveTab',
        payload: AGENTIC_OBSERVABILITY_LOGS_TAB_ID,
      };
      mockSetActiveTab.mockReturnValue(mockAction);

      const thunk = detectAndSetOptimalTab({
        services: mockServices,
      });

      await thunk(mockDispatch, mockGetState, undefined);

      expect(mockSetActiveTab).toHaveBeenCalledWith(AGENTIC_OBSERVABILITY_LOGS_TAB_ID);
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
    });
  });
});
