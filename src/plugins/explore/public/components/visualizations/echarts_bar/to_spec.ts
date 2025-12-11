/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarChartStyle } from '../bar/bar_vis_config';
import { VisColumn, AxisColumnMappings, AxisRole, Positions } from '../types';
import {
  buildLegendConfig,
  buildTitleConfig,
  buildGridConfig,
  buildTooltipConfig,
} from '../echarts_common';

// Default values for ECharts-specific bar options not present in BarChartStyle
const ECHARTS_BAR_DEFAULTS = {
  orientation: 'vertical' as const,
  stackMode: 'none' as const,
  showBarLabel: false,
  barLabelPosition: 'top' as const,
  barGap: '30%',
  showXAxisLabel: true,
  showYAxisLabel: true,
};

/**
 * Create an ECharts bar chart spec
 */
export const createEchartsBarSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: BarChartStyle,
  axisColumnMappings?: AxisColumnMappings,
  timeRange?: { from: string; to: string }
): any => {
  const yAxisColumn = axisColumnMappings?.[AxisRole.Y];
  const xAxisColumn = axisColumnMappings?.[AxisRole.X];
  const colorColumn = axisColumnMappings?.[AxisRole.COLOR];

  const metricField = yAxisColumn?.column;
  const xField = xAxisColumn?.column;
  const colorField = colorColumn?.column;

  const metricName = yAxisColumn?.name || metricField;
  const xName = xAxisColumn?.name || xField;

  // Determine if x-axis is temporal
  const isXTemporal = dateColumns.some((col) => col.column === xField);

  // Get unique x values for category axis
  const xValues = [...new Set(transformedData.map((row) => row[xField!]))];
  if (!isXTemporal) {
    xValues.sort();
  }

  // Group data by color field if present
  let seriesData: Array<{ name: string; data: number[] }> = [];

  if (colorField) {
    // Get unique color values
    const colorValues = [...new Set(transformedData.map((row) => row[colorField]))];

    // Group by color field
    seriesData = colorValues.map((colorVal) => {
      const data = xValues.map((xVal) => {
        const row = transformedData.find((r) => r[xField!] === xVal && r[colorField] === colorVal);
        return row ? row[metricField!] : 0;
      });
      return {
        name: String(colorVal),
        data,
      };
    });
  } else {
    // Single series
    const data = xValues.map((xVal) => {
      const row = transformedData.find((r) => r[xField!] === xVal);
      return row ? row[metricField!] : 0;
    });
    seriesData = [{ name: metricName || 'Value', data }];
  }

  // Use default values for ECharts-specific options
  const {
    orientation,
    stackMode,
    showBarLabel,
    barLabelPosition,
    barGap,
    showXAxisLabel,
    showYAxisLabel,
  } = ECHARTS_BAR_DEFAULTS;

  // Determine stack property based on stackMode (using default)
  const getStack = () => {
    if (stackMode === 'stacked' || stackMode === 'percent') {
      return 'total';
    }
    return undefined;
  };

  // Build series configuration
  // BarChartStyle has barWidth but it's a ratio (0-1), ECharts expects pixels
  // Convert barWidth ratio to percentage string if it's less than 1
  const echartsBarWidth =
    styles.barWidth && styles.barWidth <= 1 ? `${styles.barWidth * 100}%` : styles.barWidth;

  const series = seriesData.map((s) => ({
    name: s.name,
    type: 'bar',
    data: s.data,
    stack: getStack(),
    barWidth: echartsBarWidth,
    barGap,
    label: {
      show: showBarLabel,
      position: barLabelPosition,
      formatter: stackMode === 'percent' ? '{c}%' : '{c}',
    },
  }));

  // Build legend configuration
  const legendPosition = styles.legendPosition || Positions.BOTTOM;
  const legendConfig = buildLegendConfig(styles.addLegend, legendPosition);

  // Determine axis configuration based on orientation (using default - vertical)
  const isHorizontal = orientation === 'horizontal';

  // Get axis titles from standardAxes if available
  const xAxisTitle = styles.standardAxes?.find((a) => a.axisRole === AxisRole.X)?.title?.text;
  const yAxisTitle = styles.standardAxes?.find((a) => a.axisRole === AxisRole.Y)?.title?.text;

  const categoryAxisConfig = {
    type: 'category',
    data: xValues.map((v) => (isXTemporal ? new Date(v).toLocaleString() : String(v))),
    name: isHorizontal ? yAxisTitle || metricName : xAxisTitle || xName,
    nameLocation: 'middle',
    nameGap: 30,
    axisLabel: {
      show: isHorizontal ? showYAxisLabel : showXAxisLabel,
      rotate: isHorizontal ? 0 : 45,
    },
  };

  const valueAxisConfig = {
    type: 'value',
    name: isHorizontal ? xAxisTitle || xName : yAxisTitle || metricName,
    nameLocation: 'middle',
    nameGap: 50,
    axisLabel: {
      show: isHorizontal ? showXAxisLabel : showYAxisLabel,
      formatter: stackMode === 'percent' ? '{value}%' : '{value}',
    },
    ...(stackMode === 'percent' && { max: 100 }),
  };

  // Build the ECharts option
  const option: any = {
    // Store metadata for time range brush functionality
    __metadata__: {
      isXTemporal,
      xField,
      // Store original timestamp values for mapping brush selection back to time range
      xValues: isXTemporal ? xValues.map((v) => new Date(v).getTime()) : undefined,
    },
    title: buildTitleConfig(styles.titleOptions, `${metricName} Chart`),
    tooltip: {
      show: styles.tooltipOptions?.mode !== 'hidden',
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter:
        stackMode === 'percent'
          ? (params: any) => {
              const items = Array.isArray(params) ? params : [params];
              let result = items[0]?.axisValueLabel || '';
              items.forEach((item: any) => {
                result += `<br/>${item.marker} ${item.seriesName}: ${item.value}%`;
              });
              return result;
            }
          : undefined,
    },
    legend: legendConfig,
    grid: buildGridConfig({
      addLegend: styles.addLegend,
      legendPosition,
      showTitle: styles.titleOptions?.show,
    }),
    // Add dataZoom for brush selection on temporal x-axis (only for vertical bars)
    ...(isXTemporal &&
      !isHorizontal && {
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            zoomOnMouseWheel: false,
            moveOnMouseMove: false,
            moveOnMouseWheel: false,
          },
        ],
        brush: {
          toolbox: ['lineX'],
          brushType: 'lineX',
          xAxisIndex: 0,
          throttleType: 'debounce',
          throttleDelay: 300,
        },
      }),
    xAxis: isHorizontal ? valueAxisConfig : categoryAxisConfig,
    yAxis: isHorizontal ? categoryAxisConfig : valueAxisConfig,
    series,
    // Store original data for reference
    dataset: {
      source: transformedData,
    },
  };

  return option;
};
