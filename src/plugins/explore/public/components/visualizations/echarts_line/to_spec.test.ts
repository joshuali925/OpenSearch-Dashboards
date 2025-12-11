/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createEchartsLineSpec } from './to_spec';
import { defaultLineChartStyles, LineChartStyle } from '../line/line_vis_config';
import { VisColumn, VisFieldType, AxisRole, Positions } from '../types';

describe('echarts_line to_spec', () => {
  const mockNumericalColumn: VisColumn = {
    id: 1,
    name: 'Count',
    column: 'count',
    schema: VisFieldType.Numerical,
    validValuesCount: 100,
    uniqueValuesCount: 50,
  };

  const mockCategoricalColumn: VisColumn = {
    id: 2,
    name: 'Category',
    column: 'category',
    schema: VisFieldType.Categorical,
    validValuesCount: 100,
    uniqueValuesCount: 10,
  };

  const mockColorColumn: VisColumn = {
    id: 3,
    name: 'Color',
    column: 'color',
    schema: VisFieldType.Categorical,
    validValuesCount: 100,
    uniqueValuesCount: 5,
  };

  const mockDateColumn: VisColumn = {
    id: 4,
    name: 'Date',
    column: 'date',
    schema: VisFieldType.Date,
    validValuesCount: 100,
    uniqueValuesCount: 50,
  };

  const mockData = [
    { count: 10, category: 'A', color: 'red', date: '2023-01-01T00:00:00Z' },
    { count: 20, category: 'B', color: 'blue', date: '2023-01-02T00:00:00Z' },
    { count: 30, category: 'C', color: 'red', date: '2023-01-03T00:00:00Z' },
  ];

  describe('createEchartsLineSpec', () => {
    test('creates a basic line chart spec with echarts markers', () => {
      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        defaultLineChartStyles,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      // Check metadata for brush functionality
      expect(spec.__metadata__).toBeDefined();
      expect(spec.__metadata__.isXTemporal).toBe(false);

      // Check series structure
      expect(spec.series).toHaveLength(1);
      expect(spec.series[0].type).toBe('line');
      // Line chart data format is [x, y] tuples
      expect(spec.series[0].data).toEqual([['A', 10], ['B', 20], ['C', 30]]);

      // Check axes (line chart uses category type but data is embedded in series)
      expect(spec.xAxis.type).toBe('category');
      expect(spec.yAxis.type).toBe('value');
    });

    test('handles color dimension for multi-line charts', () => {
      const dataWithColor = [
        { count: 10, category: 'A', color: 'red' },
        { count: 20, category: 'A', color: 'blue' },
        { count: 30, category: 'B', color: 'red' },
        { count: 40, category: 'B', color: 'blue' },
      ];

      const spec = createEchartsLineSpec(
        dataWithColor,
        [mockNumericalColumn],
        [mockCategoricalColumn, mockColorColumn],
        [],
        defaultLineChartStyles,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
          [AxisRole.COLOR]: mockColorColumn,
        }
      );

      // Should have two series (red and blue)
      expect(spec.series).toHaveLength(2);
      expect(spec.series[0].name).toBe('red');
      expect(spec.series[1].name).toBe('blue');
    });

    test('applies smooth line mode', () => {
      const styles: LineChartStyle = {
        ...defaultLineChartStyles,
        lineMode: 'smooth',
      };

      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        styles,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.series[0].smooth).toBe(true);
    });

    test('applies stepped line mode', () => {
      const styles: LineChartStyle = {
        ...defaultLineChartStyles,
        lineMode: 'stepped',
      };

      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        styles,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.series[0].step).toBe('middle');
    });

    test('handles temporal x-axis with brush configuration', () => {
      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [mockDateColumn],
        defaultLineChartStyles,
        {
          [AxisRole.X]: mockDateColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      // Check temporal metadata
      expect(spec.__metadata__.isXTemporal).toBe(true);

      // Check brush configuration
      expect(spec.brush).toBeDefined();
      expect(spec.brush.brushType).toBe('lineX');
      expect(spec.dataZoom).toBeDefined();
    });

    test('applies title options', () => {
      const stylesWithTitle: LineChartStyle = {
        ...defaultLineChartStyles,
        titleOptions: {
          show: true,
          titleName: 'Custom Line Chart',
        },
      };

      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesWithTitle,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.title).toBeDefined();
      expect(spec.title.text).toBe('Custom Line Chart');
    });

    test('applies tooltip with cross axis pointer', () => {
      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        defaultLineChartStyles,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.tooltip.axisPointer.type).toBe('cross');
    });

    test('applies legend options', () => {
      const stylesWithLegend: LineChartStyle = {
        ...defaultLineChartStyles,
        addLegend: true,
        legendPosition: Positions.RIGHT,
      };

      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesWithLegend,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.legend.show).toBe(true);
      expect(spec.legend.right).toBe(0);
      expect(spec.legend.orient).toBe('vertical');
    });

    test('applies line width', () => {
      const stylesWithLineWidth: LineChartStyle = {
        ...defaultLineChartStyles,
        lineWidth: 3,
      };

      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesWithLineWidth,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.series[0].lineStyle.width).toBe(3);
    });

    test('applies thresholds as markLine from thresholdOptions', () => {
      const stylesWithThresholds: LineChartStyle = {
        ...defaultLineChartStyles,
        thresholdOptions: {
          ...defaultLineChartStyles.thresholdOptions,
          thresholds: [
            { value: 15, color: '#FF0000' },
            { value: 25, color: '#00FF00' },
          ],
        },
      };

      const spec = createEchartsLineSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesWithThresholds,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      // First series should have markLine
      expect(spec.series[0].markLine).toBeDefined();
      expect(spec.series[0].markLine.data).toHaveLength(2);
      expect(spec.series[0].markLine.data[0].yAxis).toBe(15);
      expect(spec.series[0].markLine.data[1].yAxis).toBe(25);
    });
  });
});
