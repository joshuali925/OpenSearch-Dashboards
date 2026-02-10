/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { SavedObjectAttributes, SimpleSavedObject } from 'opensearch-dashboards/public';

import { UiActionsStart } from '../../../ui_actions/public';
// TODO: should not use getServices from legacy any more
import { getServices } from '../application/legacy/discover/opensearch_dashboards_services';
import {
  EmbeddableFactoryDefinition,
  Container,
  ErrorEmbeddable,
} from '../../../embeddable/public';
import {
  TimeRange,
  injectSearchSourceReferences,
  parseSearchSourceJSON,
} from '../../../data/public';
import { AgenticObservabilityInput, AgenticObservabilityOutput } from './types';
import { AGENTIC_OBSERVABILITY_EMBEDDABLE_TYPE } from './constants';
import { AgenticObservabilityEmbeddable } from './agentic_observability_embeddable';
import { VisualizationRegistryService } from '../services/visualization_registry_service';
import { AgenticObservabilityFlavor } from '../../common';
import { SavedAgenticObservability } from '../saved_agentic_observability';

interface StartServices {
  executeTriggerActions: UiActionsStart['executeTriggerActions'];
  isEditable: () => boolean;
}

export class AgenticObservabilityEmbeddableFactory
  implements
    EmbeddableFactoryDefinition<
      AgenticObservabilityInput,
      AgenticObservabilityOutput,
      AgenticObservabilityEmbeddable
    > {
  public readonly type = AGENTIC_OBSERVABILITY_EMBEDDABLE_TYPE;
  public readonly savedObjectMetaData = {
    name: i18n.translate('agenticObservability.savedAgenticObservability.savedObjectName', {
      defaultMessage: 'Saved agentic observability',
    }),
    type: 'agenticObservability',
    getIconForSavedObject: ({ attributes }: SimpleSavedObject<SavedObjectAttributes>) => {
      let iconType = '';
      try {
        const vis = JSON.parse(attributes.visualization as string);
        const chart = this.visualizationRegistryService
          .getRegistry()
          .getAvailableChartTypes()
          .find((t) => t.type === vis.chartType);
        if (chart) {
          iconType = chart.icon;
        }
      } catch (e) {
        iconType = '';
      }
      return iconType;
    },
    includeFields: ['kibanaSavedObjectMeta', 'visualization'],
  };

  constructor(
    private getStartServices: () => Promise<StartServices>,
    private readonly visualizationRegistryService: VisualizationRegistryService
  ) {}

  public canCreateNew() {
    return false;
  }

  public isEditable = async () => {
    return (await this.getStartServices()).isEditable();
  };

  public getDisplayName() {
    return i18n.translate('agenticObservability.embeddable.displayName', {
      defaultMessage: 'visualization in discover',
    });
  }

  public createFromSavedObject = async (
    savedObjectId: string,
    input: Partial<AgenticObservabilityInput> & { id: string; timeRange: TimeRange },
    parent?: Container
  ): Promise<AgenticObservabilityEmbeddable | ErrorEmbeddable> => {
    const services = getServices();
    const filterManager = services.filterManager;
    const url = await services.getSavedAgenticObservabilityUrlById(savedObjectId);

    try {
      const savedObject = await services.getSavedAgenticObservabilityById(savedObjectId);
      if (!savedObject) {
        throw new Error('Saved object not found');
      }
      const indexPattern = savedObject.searchSource.getField('index');
      const { executeTriggerActions } = await this.getStartServices();
      const { AgenticObservabilityEmbeddable: AgenticObservabilityEmbeddableClass } = await import(
        './agentic_observability_embeddable'
      );
      const flavor = savedObject.type ?? AgenticObservabilityFlavor.Logs;
      const editUrl = services.addBasePath(`/app/agenticObservability/${flavor}/${url}`);

      return new AgenticObservabilityEmbeddableClass(
        {
          savedAgenticObservability: savedObject,
          editUrl,
          editPath: url,
          filterManager,
          editable: services.capabilities.discover?.save as boolean,
          indexPatterns: indexPattern ? [indexPattern] : [],
          services,
          editApp: `agenticObservability/${flavor}`,
        },
        input,
        executeTriggerActions,
        parent
      );
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  };

  /**
   * Creates a by-value agentic observability embeddable from input without a stored saved object.
   */
  public async create(
    input: AgenticObservabilityInput,
    parent?: Container
  ): Promise<AgenticObservabilityEmbeddable | ErrorEmbeddable> {
    if (!input.attributes) {
      return new ErrorEmbeddable(
        'Attributes are required. Use createFromSavedObject to create from a saved object id',
        input,
        parent
      );
    }

    const services = getServices();
    const filterManager = services.filterManager;
    const attributes = input.attributes;
    const references = input.references || [];

    try {
      let searchSourceValues = parseSearchSourceJSON(
        attributes.kibanaSavedObjectMeta!.searchSourceJSON
      );
      searchSourceValues = injectSearchSourceReferences(searchSourceValues, references);
      const searchSource = await services.data.search.searchSource.create(searchSourceValues);
      const indexPattern = searchSource.getField('index');

      const savedAgenticObservability = {
        id: input.id,
        ...input.attributes,
        searchSource,
      } as SavedAgenticObservability;

      const { executeTriggerActions } = await this.getStartServices();
      const { AgenticObservabilityEmbeddable: AgenticObservabilityEmbeddableClass } = await import(
        './agentic_observability_embeddable'
      );
      const flavor = savedAgenticObservability.type;

      return new AgenticObservabilityEmbeddableClass(
        {
          savedAgenticObservability,
          editUrl: '', // by-value embeddables cannot be edited
          editPath: '',
          filterManager,
          editable: false,
          indexPatterns: indexPattern ? [indexPattern] : [],
          services,
          editApp: `agenticObservability/${flavor}`,
        },
        input,
        executeTriggerActions,
        parent
      );
    } catch (e) {
      return new ErrorEmbeddable(e, input, parent);
    }
  }
}
