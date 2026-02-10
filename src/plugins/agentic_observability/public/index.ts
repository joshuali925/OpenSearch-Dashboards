/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PluginInitializerContext } from 'opensearch-dashboards/public';
import './index.scss';

import { AgenticObservabilityPlugin } from './plugin';

export {
  SavedAgenticObservability,
  SavedAgenticObservabilityLoader,
  createSavedAgenticObservabilityLoader,
} from './saved_agentic_observability';

export function plugin(initializerContext: PluginInitializerContext) {
  return new AgenticObservabilityPlugin(initializerContext);
}

export { AgenticObservabilityPluginSetup, AgenticObservabilityPluginStart } from './types';

// Export trace auto-detection utilities for use by other plugins
export { detectTraceData, DetectionResult } from './utils/auto_detect_trace_data';
export { createAutoDetectedDatasets, CreateDatasetsResult } from './utils/create_auto_datasets';
