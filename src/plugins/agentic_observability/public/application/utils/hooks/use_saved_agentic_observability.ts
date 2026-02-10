/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgenticObservabilityServices } from '../../../types';
import { SavedAgenticObservability } from '../../../types/saved_agentic_observability_types';
/**
 * Hook for loading saved agentic observability objects
 */
export const useSavedAgenticObservability = (agenticObsIdFromUrl?: string) => {
  const { services } = useOpenSearchDashboards<AgenticObservabilityServices>();
  const [savedAgenticObservabilityState, setSavedAgenticObservabilityState] = useState<
    SavedAgenticObservability | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toastNotifications, getSavedAgenticObservabilityById } = services;

  const loadSavedAgenticObservability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load saved agentic observability object
      const savedAgenticObservabilityObject = await getSavedAgenticObservabilityById(
        agenticObsIdFromUrl
      );
      setSavedAgenticObservabilityState(savedAgenticObservabilityObject);
    } catch (loadError) {
      const errorMessage = `Failed to load saved agentic observability: ${
        (loadError as Error).message
      }`;
      setError(errorMessage);

      toastNotifications.addError(loadError as Error, {
        title: 'Error loading saved agentic observability',
        toastMessage: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [agenticObsIdFromUrl, getSavedAgenticObservabilityById, toastNotifications]);

  useEffect(() => {
    loadSavedAgenticObservability();
  }, [loadSavedAgenticObservability]);

  return {
    savedAgenticObservability: savedAgenticObservabilityState,
    isLoading,
    error,
    reload: loadSavedAgenticObservability,
  };
};
