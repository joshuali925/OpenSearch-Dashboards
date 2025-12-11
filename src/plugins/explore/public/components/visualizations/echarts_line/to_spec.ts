/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LineChartStyle } from '../line/line_vis_config';
import { VisColumn, AxisColumnMappings, AxisRole, Positions, Threshold } from '../types';
import {
  buildLegendConfig,
  buildTitleConfig,
  buildGridConfig,
  buildTooltipConfig,
} from '../echarts_common';

// Default values for ECharts-specific line options not present in LineChartStyle
const ECHARTS_LINE_DEFAULTS = {
  showSymbol: true,
  symbolSize: 4,
  areaStyle: false,
  areaOpacity: 0.3,
  showXAxisLabel: true,
  showYAxisLabel: true,
};

/**
 * Create an ECharts line chart spec
 */
export const createEchartsLineSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: LineChartStyle,
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

  // Use default values for ECharts-specific options
  const { showSymbol, symbolSize, areaStyle, areaOpacity, showXAxisLabel, showYAxisLabel } =
    ECHARTS_LINE_DEFAULTS;

  // Build markLine configuration for threshold lines
  // LineChartStyle uses thresholdOptions.thresholds
  const buildMarkLine = () => {
    const thresholds: Threshold[] = styles.thresholdOptions?.thresholds ?? [];
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
    showSymbol,
    symbolSize,
    ...(areaStyle && {
      areaStyle: {
        opacity: areaOpacity,
      },
    }),
    // Only add markLine to the first series to avoid duplicates
    ...(index === 0 && markLine && { markLine }),
  }));

  // Build legend configuration
  const legendPosition = styles.legendPosition || Positions.BOTTOM;
  const legendConfig = buildLegendConfig(styles.addLegend, legendPosition);

  // Build the ECharts option
  const option: any = {
    // Store metadata for time range brush functionality
    __metadata__: {
      isXTemporal,
      xField,
    },
    title: buildTitleConfig(styles.titleOptions, `${metricName} Chart`),
    tooltip: buildTooltipConfig(styles.tooltipOptions, 'axis', 'cross'),
    legend: legendConfig,
    grid: buildGridConfig({
      addLegend: styles.addLegend,
      legendPosition,
      showTitle: styles.titleOptions?.show,
    }),
    // Add dataZoom for brush selection on temporal x-axis
    ...(isXTemporal && {
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
    xAxis: {
      type: isXTemporal ? 'time' : 'category',
      // LineChartStyle uses categoryAxes[0].title.text for x-axis title
      name: styles.categoryAxes?.[0]?.title?.text || xName,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        show: showXAxisLabel,
        rotate: isXTemporal ? 0 : 45,
      },
    },
    yAxis: {
      type: 'value',
      // LineChartStyle uses valueAxes[0].title.text for y-axis title
      name: styles.valueAxes?.[0]?.title?.text || metricName,
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        show: showYAxisLabel,
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

