/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { monaco } from '@osd/monaco';
import { getSuggestions } from './code_completion';
import { IndexPattern } from '../../index_patterns';
import { IDataPluginServices } from '../../types';
import { QuerySuggestion } from '../../autocomplete';

describe('promql code_completion', () => {
  describe('getSuggestions', () => {
    const mockIndexPattern = {
      id: 'test-datasource-id',
      title: 'test-index',
      fields: [
        { name: 'field1', type: 'string' },
        { name: 'field2', type: 'number' },
        { name: 'field2', type: 'boolean' },
      ],
    } as IndexPattern;

    const mockPrometheusClient = {
      getMetricMetadata: jest.fn().mockResolvedValue({
        prometheus_http_requests_total: [
          {
            type: 'counter',
            help: 'Total number of HTTP requests',
          },
        ],
      }),
      getLabels: jest.fn().mockResolvedValue([]),
      getLabelValues: jest.fn().mockResolvedValue([]),
    };

    const mockServices = ({
      appName: 'test-app',
      data: {
        resourceClientFactory: {
          get: jest.fn().mockReturnValue(mockPrometheusClient),
        },
      },
    } as unknown) as IDataPluginServices;

    const mockPosition = {
      lineNumber: 1,
      column: 1,
    } as monaco.Position;

    const getSimpleSuggestions = async (
      query: string,
      position: monaco.Position = new monaco.Position(1, query.length + 1)
    ) => {
      return getSuggestions({
        query,
        indexPattern: mockIndexPattern,
        position,
        language: 'PROMQL',
        selectionStart: 0,
        selectionEnd: 0,
        services: mockServices,
      });
    };

    const checkSuggestionsContain = (
      result: QuerySuggestion[],
      expected: Partial<QuerySuggestion>
    ) => {
      expect(
        result.some(
          (suggestion) => suggestion.text === expected.text && suggestion.type === expected.type
        )
      ).toBeTruthy();
    };

    it('should return empty array when required parameters are missing', async () => {
      const result = await getSuggestions({
        query: '',
        indexPattern: (null as unknown) as IndexPattern,
        position: mockPosition,
        language: 'SQL',
        selectionStart: 0,
        selectionEnd: 0,
        services: (null as unknown) as IDataPluginServices,
      });

      expect(result).toEqual([]);
    });

    it('should suggest functions', async () => {
      const result = await getSimpleSuggestions('');

      checkSuggestionsContain(result, {
        text: 'rate',
        type: monaco.languages.CompletionItemKind.Function,
      });
    });

    it('should suggest metrics when suggestMetrics is true', async () => {
      const result = await getSimpleSuggestions('');

      checkSuggestionsContain(result, {
        text: 'prometheus_http_requests_total',
        type: monaco.languages.CompletionItemKind.Field,
      });
    });

    it('should set detail field on suggestions', async () => {
      const result = await getSimpleSuggestions('');

      const functionSuggestion = result.find((s) => s.text === 'rate');
      expect(functionSuggestion).toBeDefined();
      expect(functionSuggestion?.detail).toBeDefined();
      expect(typeof functionSuggestion?.detail).toBe('string');
    });

    it('should set documentation field on all suggestions', async () => {
      const result = await getSimpleSuggestions('');

      expect(result.length).toBeGreaterThan(0);
      result.forEach((suggestion) => {
        expect(suggestion.documentation).toBeDefined();
        expect(typeof suggestion.documentation).toBe('string');
      });
    });

    it('should call prometheus client with indexPattern.id', async () => {
      await getSimpleSuggestions('');

      expect(mockPrometheusClient.getMetricMetadata).toHaveBeenCalledWith(mockIndexPattern.id);
    });
  });
});
