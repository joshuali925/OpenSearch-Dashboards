/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsClientContract } from 'src/core/public';
import { CORRELATION_TYPE_PREFIXES } from '../../../data/common';
import { DetectionResult } from './auto_detect_trace_data';

export interface CreateDatasetsResult {
  traceDatasetId: string | null;
  logDatasetId: string | null;
  correlationId: string | null;
}

function buildDataSourceReferences(effectiveDataSourceId?: string) {
  return effectiveDataSourceId
    ? [
        {
          id: effectiveDataSourceId,
          type: 'data-source',
          name: 'dataSource',
        },
      ]
    : [];
}

async function findOrCreateIndexPattern(
  savedObjectsClient: SavedObjectsClientContract,
  pattern: string,
  attributes: Record<string, unknown>,
  effectiveDataSourceId?: string
): Promise<string | null> {
  const references = buildDataSourceReferences(effectiveDataSourceId);

  try {
    const existingPatterns = await savedObjectsClient.find({
      type: 'index-pattern',
      searchFields: ['title'],
      search: pattern,
      hasReference: effectiveDataSourceId
        ? { type: 'data-source', id: effectiveDataSourceId }
        : undefined,
    });

    if (existingPatterns.total > 0) {
      return existingPatterns.savedObjects[0].id;
    }

    const response = await savedObjectsClient.create('index-pattern', attributes, { references });
    return response.id;
  } catch (error) {
    // If find fails, try to create directly
    try {
      const response = await savedObjectsClient.create('index-pattern', attributes, { references });
      return response.id;
    } catch (createError) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create dataset:', createError);
      return null;
    }
  }
}

/**
 * Create auto-detected trace and log datasets with correlation
 */
export async function createAutoDetectedDatasets(
  savedObjectsClient: SavedObjectsClientContract,
  detection: DetectionResult,
  dataSourceId?: string
): Promise<CreateDatasetsResult> {
  const result: CreateDatasetsResult = {
    traceDatasetId: null,
    logDatasetId: null,
    correlationId: null,
  };

  // Use datasource title from detection if available, otherwise use provided dataSourceId
  const effectiveDataSourceId = detection.dataSourceId || dataSourceId;
  const dataSourceSuffix = detection.dataSourceTitle ? ` - ${detection.dataSourceTitle}` : '';

  // 1. Create trace dataset (check if it already exists first)
  if (detection.tracesDetected && detection.tracePattern && detection.traceTimeField) {
    result.traceDatasetId = await findOrCreateIndexPattern(
      savedObjectsClient,
      detection.tracePattern,
      {
        title: detection.tracePattern,
        displayName: `Trace Dataset${dataSourceSuffix}`,
        timeFieldName: detection.traceTimeField,
        signalType: 'traces',
      },
      effectiveDataSourceId
    );
  }

  // 2. Create log dataset with schema mappings for correlation (check if it already exists first)
  if (detection.logsDetected && detection.logPattern && detection.logTimeField) {
    result.logDatasetId = await findOrCreateIndexPattern(
      savedObjectsClient,
      detection.logPattern,
      {
        title: detection.logPattern,
        displayName: `Log Dataset${dataSourceSuffix}`,
        timeFieldName: detection.logTimeField,
        signalType: 'logs',
        schemaMappings: JSON.stringify({
          otelLogs: {
            timestamp: detection.logTimeField || 'time',
            traceId: 'traceId',
            spanId: 'spanId',
            serviceName: 'resource.attributes.service.name',
          },
        }),
      },
      effectiveDataSourceId
    );
  }

  // 3. Create correlation if both trace and log datasets were created
  if (result.traceDatasetId && result.logDatasetId) {
    try {
      const correlationResponse = await savedObjectsClient.create(
        'correlations',
        {
          title: `trace-to-logs_${detection.tracePattern}`,
          correlationType: `${CORRELATION_TYPE_PREFIXES.TRACE_TO_LOGS}${detection.tracePattern}`,
          version: '1.0.0',
          entities: [
            { tracesDataset: { id: 'references[0].id' } },
            { logsDataset: { id: 'references[1].id' } },
          ],
        },
        {
          references: [
            {
              name: 'entities[0].index',
              type: 'index-pattern',
              id: result.traceDatasetId,
            },
            {
              name: 'entities[1].index',
              type: 'index-pattern',
              id: result.logDatasetId,
            },
          ],
        }
      );
      result.correlationId = correlationResponse.id;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create correlation:', error);
    }
  }

  return result;
}
