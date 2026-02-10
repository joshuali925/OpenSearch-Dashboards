/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SavedObjectLoader,
  SavedObjectOpenSearchDashboardsServices,
} from '../../../saved_objects/public';
import { createSavedAgenticObservabilityClass } from './_saved_agentic_observability';

export function createSavedAgenticObservabilityLoader(
  services: SavedObjectOpenSearchDashboardsServices
) {
  const SavedAgenticObservabilityClass = createSavedAgenticObservabilityClass(services);
  const savedAgenticObservabilityLoader = new SavedObjectLoader(
    SavedAgenticObservabilityClass,
    services.savedObjectsClient
  );

  savedAgenticObservabilityLoader.urlFor = (id: string) =>
    id ? `#/view/${encodeURIComponent(id)}` : '#/';

  return savedAgenticObservabilityLoader;
}
