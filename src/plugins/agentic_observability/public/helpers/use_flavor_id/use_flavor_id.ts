/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AgenticObservabilityFlavor } from '../../../common';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { AgenticObservabilityServices } from '../../types';
import { getFlavorFromAppId } from '../get_flavor_from_app_id';

export const useFlavorId = (): AgenticObservabilityFlavor | null => {
  // For agenticObservability plugin, default to Traces flavor
  // This ensures TracesTable renders on initial mount before subscription fires
  const [flavorId, setFlavorId] = useState<AgenticObservabilityFlavor | null>(
    AgenticObservabilityFlavor.Traces
  );
  const { services } = useOpenSearchDashboards<AgenticObservabilityServices>();

  useEffect(() => {
    const subscription = services.core.application.currentAppId$.subscribe((value) => {
      const flavorFromAppId = getFlavorFromAppId(value);
      setFlavorId(flavorFromAppId);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [services.core.application.currentAppId$]);

  return flavorId;
};
