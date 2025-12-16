/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createEchartsGaugeSpec } from './to_spec';
import { defaultGaugeChartStyles, GaugeChartStyle } from '../gauge/gauge_vis_config';
import { VisColumn, VisFieldType, AxisRole } from '../types';

describe('echarts_gauge to_spec', () => {
  const mockNumericalColumn: VisColumn = {
    id: 1,
    name: 'Value',
    column: 'value',
    schema: VisFieldType.Numerical,
    validValuesCount: 100,
    uniqueValuesCount: 50,
  };

  const mockData = [{ value: 50 }, { value: 60 }, { value: 70 }];

  describe('createEchartsGaugeSpec', () => {
    test('creates a basic gauge chart spec with echarts marker', () => {
      const spec = createEchartsGaugeSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultGaugeChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Check series structure
      expect(spec.series).toHaveLength(1);
      expect(spec.series[0].type).toBe('gauge');
      expect(spec.series[0].data).toBeDefined();
      expect(spec.series[0].data[0].name).toBe('Value');
    });

    test('calculates value based on calculation method (default: last)', () => {
      const spec = createEchartsGaugeSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultGaugeChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Default calculation is 'last', so should use the last value
      expect(spec.series[0].data[0].value).toBe(70);
    });

    test('applies min and max settings', () => {
      const styles: GaugeChartStyle = {
        ...defaultGaugeChartStyles,
        min: 0,
        max: 100,
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.series[0].min).toBe(0);
      expect(spec.series[0].max).toBe(100);
    });

    test('applies title from showTitle and title properties', () => {
      const styles: GaugeChartStyle = {
        ...defaultGaugeChartStyles,
        showTitle: true,
        title: 'Custom Gauge',
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.title).toBeDefined();
      expect(spec.title.text).toBe('Custom Gauge');
    });

    test('hides title when showTitle is false', () => {
      const styles: GaugeChartStyle = {
        ...defaultGaugeChartStyles,
        showTitle: false,
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.title).toBeUndefined();
    });

    test('applies threshold colors', () => {
      const styles: GaugeChartStyle = {
        ...defaultGaugeChartStyles,
        min: 0,
        max: 100,
        thresholdOptions: {
          thresholds: [
            { value: 50, color: '#FFFF00' },
            { value: 80, color: '#FF0000' },
          ],
          baseColor: '#00FF00',
        },
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Check that color stops are applied
      expect(spec.series[0].axisLine.lineStyle.color).toBeDefined();
      expect(spec.series[0].axisLine.lineStyle.color.length).toBeGreaterThan(0);
    });

    test('uses base color when no thresholds defined', () => {
      const styles: GaugeChartStyle = {
        ...defaultGaugeChartStyles,
        thresholdOptions: {
          thresholds: [],
          baseColor: '#00BD6B',
        },
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Should have only base color
      expect(spec.series[0].axisLine.lineStyle.color).toEqual([[1, '#00BD6B']]);
    });

    test('uses default ECharts-specific options', () => {
      const spec = createEchartsGaugeSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [],
        defaultGaugeChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // These come from ECHARTS_GAUGE_DEFAULTS
      expect(spec.series[0].splitNumber).toBe(10);
      expect(spec.series[0].pointer.show).toBe(true);
      expect(spec.series[0].pointer.width).toBe(6);
      expect(spec.series[0].progress.show).toBe(true);
      expect(spec.series[0].progress.width).toBe(10);
    });
  });
});
