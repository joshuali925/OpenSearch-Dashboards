/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createEchartsGaugeSpec } from './to_spec';
import { defaultEchartsGaugeChartStyles, EchartsGaugeChartStyle } from './echarts_gauge_vis_config';
import { VisColumn, VisFieldType, AxisRole, GaugeThresholdMode } from '../types';

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
        defaultEchartsGaugeChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Check ECharts marker
      expect(spec.__echarts__).toBe(true);

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
        defaultEchartsGaugeChartStyles,
        {
          [AxisRole.Value]: mockNumericalColumn,
        }
      );

      // Default calculation is 'last', so should use the last value
      expect(spec.series[0].data[0].value).toBe(70);
    });

    test('applies min and max settings', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        min: 0,
        max: 100,
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.series[0].min).toBe(0);
      expect(spec.series[0].max).toBe(100);
    });

    test('applies gauge type: ring', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        gaugeType: 'ring',
        startAngle: 90,
        endAngle: -270,
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.series[0].startAngle).toBe(90);
      expect(spec.series[0].endAngle).toBe(-270);
      expect(spec.series[0].pointer.show).toBe(false);
      expect(spec.series[0].progress.roundCap).toBe(true);
    });

    test('applies pointer settings', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        showPointer: true,
        pointerWidth: 8,
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.series[0].pointer.show).toBe(true);
      expect(spec.series[0].pointer.width).toBe(8);
    });

    test('applies progress settings', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        showProgress: true,
        progressWidth: 20,
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.series[0].progress.show).toBe(true);
      expect(spec.series[0].progress.width).toBe(20);
    });

    test('applies title options', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        titleOptions: {
          show: true,
          titleName: 'Custom Gauge',
        },
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.title).toBeDefined();
      expect(spec.title.text).toBe('Custom Gauge');
    });

    test('applies absolute threshold mode', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        min: 0,
        max: 100,
        thresholdOptions: {
          mode: GaugeThresholdMode.Absolute,
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

    test('applies percentage threshold mode', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        min: 0,
        max: 100,
        thresholdOptions: {
          mode: GaugeThresholdMode.Percentage,
          thresholds: [
            { value: 50, color: '#FFFF00' }, // 50% of range
            { value: 80, color: '#FF0000' }, // 80% of range
          ],
          baseColor: '#00FF00',
        },
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      // Check that color stops are applied
      expect(spec.series[0].axisLine.lineStyle.color).toBeDefined();
    });

    test('applies unit formatter', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        unit: '%',
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.series[0].axisLabel.formatter).toBe('{value} %');
      expect(spec.series[0].detail.formatter).toBe('{value} %');
    });

    test('applies split number', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        splitNumber: 10,
      };

      const spec = createEchartsGaugeSpec(mockData, [mockNumericalColumn], [], [], styles, {
        [AxisRole.Value]: mockNumericalColumn,
      });

      expect(spec.series[0].splitNumber).toBe(10);
    });

    test('uses base color when no thresholds defined', () => {
      const styles: EchartsGaugeChartStyle = {
        ...defaultEchartsGaugeChartStyles,
        thresholdOptions: {
          mode: GaugeThresholdMode.Absolute,
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
  });
});
