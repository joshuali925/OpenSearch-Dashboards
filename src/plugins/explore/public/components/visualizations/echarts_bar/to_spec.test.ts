/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createEchartsBarSpec } from './to_spec';
import { defaultEchartsBarChartStyles, EchartsBarChartStyle } from './echarts_bar_vis_config';
import { VisColumn, VisFieldType, AxisRole, Positions } from '../types';

describe('echarts_bar to_spec', () => {
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

  describe('createEchartsBarSpec', () => {
    test('creates a basic bar chart spec with echarts markers', () => {
      const spec = createEchartsBarSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        defaultEchartsBarChartStyles,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      // Check ECharts marker
      expect(spec.__echarts__).toBe(true);
      expect(spec.__metadata__).toBeDefined();
      expect(spec.__metadata__.isXTemporal).toBe(false);

      // Check series structure
      expect(spec.series).toHaveLength(1);
      expect(spec.series[0].type).toBe('bar');
      expect(spec.series[0].data).toEqual([10, 20, 30]);

      // Check axes
      expect(spec.xAxis.type).toBe('category');
      expect(spec.xAxis.data).toEqual(['A', 'B', 'C']);
      expect(spec.yAxis.type).toBe('value');
    });

    test('handles color dimension for grouped bars', () => {
      const dataWithColor = [
        { count: 10, category: 'A', color: 'red' },
        { count: 20, category: 'A', color: 'blue' },
        { count: 30, category: 'B', color: 'red' },
        { count: 40, category: 'B', color: 'blue' },
      ];

      const spec = createEchartsBarSpec(
        dataWithColor,
        [mockNumericalColumn],
        [mockCategoricalColumn, mockColorColumn],
        [],
        defaultEchartsBarChartStyles,
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

    test('applies horizontal orientation', () => {
      const styles: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        orientation: 'horizontal',
      };

      const spec = createEchartsBarSpec(
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

      // In horizontal mode, xAxis should be value and yAxis should be category
      expect(spec.xAxis.type).toBe('value');
      expect(spec.yAxis.type).toBe('category');
    });

    test('applies stacked mode', () => {
      const styles: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        stackMode: 'stacked',
      };

      const dataWithColor = [
        { count: 10, category: 'A', color: 'red' },
        { count: 20, category: 'A', color: 'blue' },
      ];

      const spec = createEchartsBarSpec(
        dataWithColor,
        [mockNumericalColumn],
        [mockCategoricalColumn, mockColorColumn],
        [],
        styles,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
          [AxisRole.COLOR]: mockColorColumn,
        }
      );

      // All series should have stack property
      expect(spec.series[0].stack).toBe('total');
      expect(spec.series[1].stack).toBe('total');
    });

    test('applies percent stacked mode', () => {
      const styles: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        stackMode: 'percent',
      };

      const spec = createEchartsBarSpec(
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

      // Y-axis should have max: 100 for percent mode
      expect(spec.yAxis.max).toBe(100);
      expect(spec.series[0].label.formatter).toBe('{c}%');
    });

    test('handles temporal x-axis with brush configuration', () => {
      const spec = createEchartsBarSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [mockDateColumn],
        defaultEchartsBarChartStyles,
        {
          [AxisRole.X]: mockDateColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      // Check temporal metadata
      expect(spec.__metadata__.isXTemporal).toBe(true);
      expect(spec.__metadata__.xValues).toBeDefined();
      expect(spec.__metadata__.xValues).toHaveLength(3);

      // Check brush configuration
      expect(spec.brush).toBeDefined();
      expect(spec.brush.brushType).toBe('lineX');
      expect(spec.dataZoom).toBeDefined();
    });

    test('applies title options', () => {
      const stylesWithTitle: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        titleOptions: {
          show: true,
          titleName: 'Custom Bar Chart',
        },
      };

      const spec = createEchartsBarSpec(
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
      expect(spec.title.text).toBe('Custom Bar Chart');
    });

    test('hides title when show is false', () => {
      const stylesNoTitle: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        titleOptions: {
          show: false,
          titleName: '',
        },
      };

      const spec = createEchartsBarSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesNoTitle,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.title).toBeUndefined();
    });

    test('applies tooltip options', () => {
      const stylesWithTooltip: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        tooltipOptions: {
          mode: 'hidden',
        },
      };

      const spec = createEchartsBarSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesWithTooltip,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.tooltip.show).toBe(false);
    });

    test('applies legend options', () => {
      const stylesWithLegend: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        addLegend: true,
        legendPosition: Positions.TOP,
      };

      const spec = createEchartsBarSpec(
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
      expect(spec.legend.top).toBe(0);
    });

    test('applies bar styling options', () => {
      const stylesWithBarOptions: EchartsBarChartStyle = {
        ...defaultEchartsBarChartStyles,
        barWidth: 50,
        showBarLabel: true,
        barLabelPosition: 'top',
      };

      const spec = createEchartsBarSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesWithBarOptions,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      expect(spec.series[0].barWidth).toBe(50);
      expect(spec.series[0].label.show).toBe(true);
      expect(spec.series[0].label.position).toBe('top');
    });
  });
});
