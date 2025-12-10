/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EchartsLineChartStyle } from './echarts_line_vis_config';
import { VisColumn, AxisColumnMappings, AxisRole } from '../types';

/**
 * Create an ECharts line chart spec
 */
export const createEchartsLineSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: EchartsLineChartStyle,
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

  // Group data by color field if present
  let seriesData: Array<{ name: string; data: Array<[any, number]> }> = [];

  if (colorField) {
    // Group by color field
    const groupedData: Record<string, Array<[any, number]>> = {};
    transformedData.forEach((row) => {
      const groupKey = String(row[colorField]);
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }
      const xValue = isXTemporal ? new Date(row[xField!]).getTime() : row[xField!];
      groupedData[groupKey].push([xValue, row[metricField!]]);
    });
    seriesData = Object.entries(groupedData).map(([name, data]) => ({
      name,
      data: data.sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    }));
  } else {
    // Single series
    const data = transformedData.map((row) => {
      const xValue = isXTemporal ? new Date(row[xField!]).getTime() : row[xField!];
      return [xValue, row[metricField!]] as [any, number];
    });
    seriesData = [{ name: metricName || 'Value', data: data.sort((a, b) => (a[0] < b[0] ? -1 : 1)) }];
  }

  // Map line mode to ECharts smooth property
  const getSmooth = () => {
    switch (styles.lineMode) {
      case 'smooth':
        return true;
      case 'stepped':
        return false;
      default:
        return false;
    }
  };

  // Map line mode to step property for stepped lines
  const getStep = () => {
    return styles.lineMode === 'stepped' ? 'middle' : false;
  };

  // Build markLine configuration for threshold lines
  const buildMarkLine = () => {
    const thresholds = styles.thresholds ?? [];
    if (thresholds.length === 0) {
      return undefined;
    }

    return {
      silent: true,
      symbol: 'none',
      data: thresholds.map((threshold) => ({
        yAxis: threshold.value,
        lineStyle: {
          color: threshold.color,
          width: 2,
          type: 'dashed',
        },
        label: {
          show: true,
          position: 'end',
          formatter: `${threshold.value}`,
          color: threshold.color,
        },
      })),
    };
  };

  const markLine = buildMarkLine();

  // Build series configuration
  const series = seriesData.map((s, index) => ({
    name: s.name,
    type: 'line',
    data: s.data,
    smooth: getSmooth(),
    step: getStep(),
    lineStyle: {
      width: styles.lineWidth,
    },
    showSymbol: styles.showSymbol,
    symbolSize: styles.symbolSize,
    ...(styles.areaStyle && {
      areaStyle: {
        opacity: styles.areaOpacity,
      },
    }),
    // Only add markLine to the first series to avoid duplicates
    ...(index === 0 && markLine && { markLine }),
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
        type: 'cross',
      },
    },
    legend: legendConfig,
    grid: {
      left: '3%',
      right: '4%',
      bottom: styles.addLegend && legendPosition === 'bottom' ? '15%' : '3%',
      top: styles.titleOptions?.show ? '15%' : '10%',
      containLabel: true,
    },
    xAxis: {
      type: isXTemporal ? 'time' : 'category',
      name: styles.xAxisTitle || xName,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        show: styles.showXAxisLabel,
        rotate: isXTemporal ? 0 : 45,
      },
    },
    yAxis: {
      type: 'value',
      name: styles.yAxisTitle || metricName,
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        show: styles.showYAxisLabel,
      },
    },
    series,
    // Store original data for reference
    dataset: {
      source: transformedData,
    },
  };

  return option;
};

/**
 * Create a multi-line ECharts chart spec
 */
export const createEchartsMultiLineSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: EchartsLineChartStyle,
  axisColumnMappings?: AxisColumnMappings,
  timeRange?: { from: string; to: string }
): any => {
  // Delegate to the main function which handles grouping
  return createEchartsLineSpec(
    transformedData,
    numericalColumns,
    categoricalColumns,
    dateColumns,
    styles,
    axisColumnMappings,
    timeRange
  );
};
