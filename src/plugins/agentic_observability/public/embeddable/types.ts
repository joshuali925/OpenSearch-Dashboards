/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectReference } from 'opensearch-dashboards/public';
import { Embeddable, EmbeddableInput, EmbeddableOutput } from '../../../embeddable/public';
import { Filter, IIndexPattern, TimeRange } from '../../../data/public';
import { QueryState } from '../application/utils/state_management/slices';
import { SortOrder, SavedAgenticObservability } from '../types/saved_agentic_observability_types';

export interface AgenticObservabilityInput extends EmbeddableInput {
  timeRange: TimeRange;
  query?: QueryState;
  filters?: Filter[];
  hidePanelTitles?: boolean;
  columns?: string[];
  sort?: SortOrder[];
  // attributes and references are used to create embeddables without storing saved object
  attributes?: AgenticObservabilityByValueAttributes;
  references?: SavedObjectReference[];
}

export interface AgenticObservabilityOutput extends EmbeddableOutput {
  editUrl: string;
  indexPatterns?: IIndexPattern[];
  editable: boolean;
}

export interface AgenticObservabilityEmbeddable
  extends Embeddable<AgenticObservabilityInput, AgenticObservabilityOutput> {
  type: string;
}

type AgenticObservabilityByValueAttributes = Pick<
  SavedAgenticObservability,
  | 'title'
  | 'description'
  | 'columns'
  | 'sort'
  | 'type'
  | 'visualization'
  | 'uiState'
  | 'kibanaSavedObjectMeta'
>;
