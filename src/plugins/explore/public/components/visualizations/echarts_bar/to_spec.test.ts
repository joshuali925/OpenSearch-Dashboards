/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createEchartsBarSpec } from './to_spec';
import { defaultBarChartStyles, BarChartStyle } from '../bar/bar_vis_config';
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
        defaultBarChartStyles,
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
        defaultBarChartStyles,
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

    test('handles temporal x-axis with brush configuration', () => {
      const spec = createEchartsBarSpec(
        mockData,
        [mockNumericalColumn],
        [],
        [mockDateColumn],
        defaultBarChartStyles,
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
      const stylesWithTitle: BarChartStyle = {
        ...defaultBarChartStyles,
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
      const stylesNoTitle: BarChartStyle = {
        ...defaultBarChartStyles,
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
      const stylesWithTooltip: BarChartStyle = {
        ...defaultBarChartStyles,
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
      const stylesWithLegend: BarChartStyle = {
        ...defaultBarChartStyles,
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

    test('applies bar width from BarChartStyle', () => {
      const stylesWithBarWidth: BarChartStyle = {
        ...defaultBarChartStyles,
        barWidth: 0.5, // BarChartStyle uses ratio 0-1
      };

      const spec = createEchartsBarSpec(
        mockData,
        [mockNumericalColumn],
        [mockCategoricalColumn],
        [],
        stylesWithBarWidth,
        {
          [AxisRole.X]: mockCategoricalColumn,
          [AxisRole.Y]: mockNumericalColumn,
        }
      );

      // Should be converted to percentage string
      expect(spec.series[0].barWidth).toBe('50%');
    });
  });
});
