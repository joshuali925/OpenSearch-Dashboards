/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createEchartsMetricSpec } from './to_spec';
import { defaultMetricChartStyles, MetricChartStyle } from '../metric/metric_vis_config';
import { VisColumn, VisFieldType, AxisRole } from '../types';

describe('echarts_metric to_spec', () => {
  const mockNumericalColumn: VisColumn = {
    id: 1,
    name: 'Value',
    column: 'value',
    schema: VisFieldType.Numerical,
    validValuesCount: 100,
    uniqueValuesCount: 50,
  };

  const mockDateColumn: VisColumn = {
    id: 2,
    name: 'Date',
    column: 'date',
    schema: VisFieldType.Date,
    validValuesCount: 100,
    uniqueValuesCount: 50,
  };

  const mockData = [
    { value: 50, date: '2023-01-01T00:00:00Z' },
    { value: 60, date: '2023-01-02T00:00:00Z' },
    { value: 70, date: '2023-01-03T00:00:00Z' },
  ];

  describe('createEchartsMetricSpec', () => {
    test('creates a basic metric chart spec with echarts marker', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Check graphic elements
      expect(spec.graphic).toBeDefined();
      expect(spec.graphic.elements).toBeDefined();

      // Should have at least the main value element
      expect(spec.graphic.elements.length).toBeGreaterThan(0);
    });

    test('displays value using default calculation (last)', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Find the main value text element (bold text)
      const valueElement = spec.graphic.elements.find(
        (el: any) => el.style?.fontWeight === 'bold'
      );
      expect(valueElement).toBeDefined();
      // Default calculation is 'last', so should use the last value: 70
      // Note: the display value may have trailing space due to unit formatting
      expect(valueElement.style.text.trim()).toBe('70');
    });

    test('applies title options', () => {
      const styles: MetricChartStyle = {
        ...defaultMetricChartStyles,
        showTitle: true,
        title: 'Custom Metric',
      };

      const spec = createEchartsMetricSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Find the title text element
      const titleElement = spec.graphic.elements.find(
        (el: any) => el.style?.text === 'Custom Metric'
      );
      expect(titleElement).toBeDefined();
    });

    test('hides title when showTitle is false', () => {
      const styles: MetricChartStyle = {
        ...defaultMetricChartStyles,
        showTitle: false,
        title: 'Should Not Show',
      };

      const spec = createEchartsMetricSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Title element should not exist
      const titleElement = spec.graphic.elements.find(
        (el: any) => el.style?.text === 'Should Not Show'
      );
      expect(titleElement).toBeUndefined();
    });

    test('shows percentage when enabled', () => {
      const styles: MetricChartStyle = {
        ...defaultMetricChartStyles,
        showPercentage: true,
      };

      const spec = createEchartsMetricSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Should have percentage element
      const percentageElement = spec.graphic.elements.find((el: any) =>
        el.style?.text?.includes('%')
      );
      expect(percentageElement).toBeDefined();
    });

    test('hides percentage when disabled', () => {
      const styles: MetricChartStyle = {
        ...defaultMetricChartStyles,
        showPercentage: false,
      };

      const spec = createEchartsMetricSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Should not have percentage element
      const percentageElement = spec.graphic.elements.find((el: any) =>
        el.style?.text?.includes('%')
      );
      expect(percentageElement).toBeUndefined();
    });

    test('adds sparkline when date column is mapped', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [mockDateColumn],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
          [AxisRole.Time]: mockDateColumn,
        }
      );

      // Should have a line series for sparkline
      expect(spec.series).toHaveLength(1);
      expect(spec.series[0].type).toBe('line');
      expect(spec.series[0].areaStyle).toBeDefined();
    });

    test('adds tooltip when sparkline is present', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [mockDateColumn],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
          [AxisRole.Time]: mockDateColumn,
        }
      );

      // Should have tooltip configuration
      expect(spec.tooltip).toBeDefined();
      expect(spec.tooltip.show).toBe(true);
      expect(spec.tooltip.trigger).toBe('axis');
      expect(spec.tooltip.formatter).toBeInstanceOf(Function);
    });

    test('tooltip formatter displays date and value correctly', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [mockDateColumn],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
          [AxisRole.Time]: mockDateColumn,
        }
      );

      // Test the formatter function
      const mockParams = {
        value: [new Date('2023-01-02T00:00:00Z').getTime(), 60],
      };
      const result = spec.tooltip.formatter(mockParams);

      // Should contain both date and value
      expect(result).toContain('Date');
      expect(result).toContain('Value');
      expect(result).toContain('60');
    });

    test('no tooltip when no sparkline', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Should not have tooltip configuration
      expect(spec.tooltip).toBeUndefined();
    });

    test('no sparkline when no date column', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Should have no series
      expect(spec.series).toHaveLength(0);
    });

    test('applies custom font sizes', () => {
      const styles: MetricChartStyle = {
        ...defaultMetricChartStyles,
        fontSize: 80,
        titleSize: 30,
      };

      const spec = createEchartsMetricSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Find the main value text element (bold text)
      const valueElement = spec.graphic.elements.find(
        (el: any) => el.style?.fontWeight === 'bold'
      );
      expect(valueElement.style.fontSize).toBe(80);
    });

    test('applies threshold color to value', () => {
      const styles: MetricChartStyle = {
        ...defaultMetricChartStyles,
        useThresholdColor: true,
        thresholdOptions: {
          thresholds: [{ value: 60, color: '#FF0000' }],
          baseColor: '#00FF00',
        },
      };

      const spec = createEchartsMetricSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Find the main value text element (bold text)
      const valueElement = spec.graphic.elements.find(
        (el: any) => el.style?.fontWeight === 'bold'
      );
      // Value is 70, which is above threshold 60, so should use threshold color
      expect(valueElement.style.fill).toBe('#FF0000');
    });

    test('stores original data in dataset', () => {
      const spec = createEchartsMetricSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultMetricChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      expect(spec.dataset).toBeDefined();
      expect(spec.dataset.source).toBe(mockData);
    });
  });
});
