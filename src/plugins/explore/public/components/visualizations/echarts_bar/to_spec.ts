/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EchartsBarChartStyle } from './echarts_bar_vis_config';
import { VisColumn, AxisColumnMappings, AxisRole } from '../types';

/**
 * Create an ECharts bar chart spec
 */
export const createEchartsBarSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: EchartsBarChartStyle,
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
        const row = transformedData.find(
          (r) => r[xField!] === xVal && r[colorField] === colorVal
        );
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

  // Determine stack property based on stackMode
  const getStack = () => {
    if (styles.stackMode === 'stacked' || styles.stackMode === 'percent') {
      return 'total';
    }
    return undefined;
  };

  // Build series configuration
  const series = seriesData.map((s) => ({
    name: s.name,
    type: 'bar',
    data: s.data,
    stack: getStack(),
    barWidth: styles.barWidth,
    barGap: styles.barGap,
    label: {
      show: styles.showBarLabel,
      position: styles.barLabelPosition,
      formatter: styles.stackMode === 'percent' ? '{c}%' : '{c}',
    },
  }));

  // Build legend configuration
  const legendPosition = styles.legendPosition || 'bottom';
  const legendConfig = styles.addLegend
    ? {
        show: true,
        type: 'scroll',
        ...(legendPosition === 'bottom' && { bottom: 0 }),
        ...(legendPosition === 'top' && { top: 0 }),
        ...(legendPosition === 'left' && { left: 0, orient: 'vertical' }),
        ...(legendPosition === 'right' && { right: 0, orient: 'vertical' }),
      }
    : { show: false };

  // Determine axis configuration based on orientation
  const isHorizontal = styles.orientation === 'horizontal';

  const categoryAxisConfig = {
    type: 'category',
    data: xValues.map((v) => (isXTemporal ? new Date(v).toLocaleString() : String(v))),
    name: isHorizontal ? (styles.yAxisTitle || metricName) : (styles.xAxisTitle || xName),
    nameLocation: 'middle',
    nameGap: 30,
    axisLabel: {
      show: isHorizontal ? styles.showYAxisLabel : styles.showXAxisLabel,
      rotate: isHorizontal ? 0 : 45,
    },
  };

  const valueAxisConfig = {
    type: 'value',
    name: isHorizontal ? (styles.xAxisTitle || xName) : (styles.yAxisTitle || metricName),
    nameLocation: 'middle',
    nameGap: 50,
    axisLabel: {
      show: isHorizontal ? styles.showXAxisLabel : styles.showYAxisLabel,
      formatter: styles.stackMode === 'percent' ? '{value}%' : '{value}',
    },
    ...(styles.stackMode === 'percent' && { max: 100 }),
  };

  // Build the ECharts option
  const option: any = {
    // Mark this as an ECharts spec
    __echarts__: true,
    title: styles.titleOptions?.show
      ? {
          text: styles.titleOptions?.titleName || `${metricName} Chart`,
          left: 'center',
        }
      : undefined,
    tooltip: {
      show: styles.tooltipOptions?.mode !== 'hidden',
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: styles.stackMode === 'percent'
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
    grid: {
      left: '3%',
      right: '4%',
      bottom: styles.addLegend && legendPosition === 'bottom' ? '15%' : '3%',
      top: styles.titleOptions?.show ? '15%' : '10%',
      containLabel: true,
    },
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

/**
 * Create a stacked bar ECharts chart spec
 */
export const createEchartsStackedBarSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: EchartsBarChartStyle,
  axisColumnMappings?: AxisColumnMappings,
  timeRange?: { from: string; to: string }
): any => {
  // Create bar spec with stacked mode
  return createEchartsBarSpec(
    transformedData,
    numericalColumns,
    categoricalColumns,
    dateColumns,
    { ...styles, stackMode: 'stacked' },
    axisColumnMappings,
    timeRange
  );
};
