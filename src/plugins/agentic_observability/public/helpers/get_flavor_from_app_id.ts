/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { take } from 'rxjs/operators';
import { ExploreFlavor, PLUGIN_ID } from '../../common';
import { ExploreServices } from '../types';

/**
 * Extracts the flavor ID from an app ID string
 * App ID format: "explore/{flavor}" -> returns the flavor part
 * For agenticObservability without a flavor suffix, defaults to Traces
 */
export const getFlavorFromAppId = (appId: string | undefined): ExploreFlavor | null => {
  // For agenticObservability plugin, default to Traces flavor
  if (appId === PLUGIN_ID) {
    return ExploreFlavor.Traces;
  }
  const flavorFromAppId = appId?.split('/')?.[1];
  return flavorFromAppId ? (flavorFromAppId as ExploreFlavor) : null;
};

/**
 * Gets the current app ID from the application service
 */
export const getCurrentAppId = async (services: ExploreServices): Promise<string | undefined> => {
  return services.core.application.currentAppId$.pipe(take(1)).toPromise();
};

/**
 * Gets the current flavor ID by reading the app ID and extracting the flavor part
 */
export const getCurrentFlavor = async (
  services: ExploreServices
): Promise<ExploreFlavor | null> => {
  const currentAppId = await getCurrentAppId(services);
  return getFlavorFromAppId(currentAppId);
};
