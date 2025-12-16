/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { GaugeChartStyle } from '../gauge/gauge_vis_config';
import { VisColumn, AxisColumnMappings, AxisRole, Threshold, ThresholdMode } from '../types';
import { calculateValue } from '../utils/calculation';
import { getColors } from '../theme/default_colors';

// Default values for ECharts-specific gauge options not present in GaugeChartStyle
const ECHARTS_GAUGE_DEFAULTS = {
  splitNumber: 10,
  showPointer: true,
  pointerWidth: 6,
  showProgress: true,
  progressWidth: 10,
};

/**
 * Create an ECharts gauge chart spec
 */
export const createEchartsGaugeSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: GaugeChartStyle,
  axisColumnMappings?: AxisColumnMappings
): any => {
  const valueColumn = axisColumnMappings?.[AxisRole.Value];
  const valueField = valueColumn?.column;
  const valueName = valueColumn?.name || valueField;

  // Calculate the value based on the calculation method
  const values = transformedData.map((row) => row[valueField!]).filter((v) => v !== undefined);
  const calculatedValue = calculateValue(values, styles.valueCalculation);

  // Determine min and max
  const min = styles.min ?? 0;
  const max = styles.max ?? Math.max(100, calculatedValue * 1.2);

  // Get threshold options with defaults
  // GaugeChartStyle uses ThresholdOptions which has thresholdStyle instead of mode
  const thresholdOptions = styles.thresholdOptions ?? {
    thresholds: [],
    baseColor: getColors().statusGreen,
  };
  const thresholds = thresholdOptions.thresholds ?? [];
  const baseColor = thresholdOptions.baseColor ?? getColors().statusGreen;

  /**
   * Convert threshold value to absolute value
   * GaugeChartStyle thresholds are always absolute values
   */
  const getAbsoluteThresholdValue = (threshold: Threshold): number => {
    return threshold.value;
  };

  // Build color stops from thresholds
  const colorStops: Array<[number, string]> = [];
  if (thresholds.length > 0) {
    // Sort thresholds by their absolute value
    const sortedThresholds = [...thresholds]
      .map((t) => ({ ...t, absoluteValue: getAbsoluteThresholdValue(t) }))
      .sort((a, b) => a.absoluteValue - b.absoluteValue);

    // Add base color for values below the first threshold
    if (sortedThresholds[0].absoluteValue > min) {
      colorStops.push([sortedThresholds[0].absoluteValue / max, baseColor]);
    }

    // Add threshold colors
    sortedThresholds.forEach((threshold, index) => {
      const nextValue =
        index < sortedThresholds.length - 1 ? sortedThresholds[index + 1].absoluteValue : max;
      colorStops.push([nextValue / max, threshold.color]);
    });
  } else {
    // No thresholds, use base color
    colorStops.push([1, baseColor]);
  }

  // Use default values for ECharts-specific options
  const { splitNumber, showPointer, pointerWidth, showProgress, progressWidth } =
    ECHARTS_GAUGE_DEFAULTS;

  // Build the gauge series configuration
  const gaugeSeries: any = {
    type: 'gauge',
    min,
    max,
    splitNumber,
    progress: {
      show: showProgress,
      width: progressWidth,
    },
    pointer: {
      show: showPointer,
      width: pointerWidth,
    },
    axisLine: {
      lineStyle: {
        width: progressWidth,
        color: colorStops,
      },
    },
    axisTick: {
      show: true,
      distance: -progressWidth,
      length: 8,
      lineStyle: {
        color: '#999',
        width: 1,
      },
    },
    splitLine: {
      distance: -progressWidth,
      length: progressWidth,
      lineStyle: {
        color: '#999',
        width: 2,
      },
    },
    axisLabel: {
      distance: progressWidth + 10,
      color: '#999',
      fontSize: 12,
    },
    anchor: {
      show: showPointer,
      showAbove: true,
      size: 20,
      itemStyle: {
        borderWidth: 5,
      },
    },
    title: {
      show: styles.showTitle,
      offsetCenter: [0, '70%'],
      fontSize: 14,
    },
    detail: {
      valueAnimation: true,
      fontSize: 24,
      offsetCenter: [0, '50%'],
    },
    data: [
      {
        value: Math.round(calculatedValue * 100) / 100,
        name: valueName,
      },
    ],
  };

  // Build the ECharts option
  // GaugeChartStyle uses showTitle and title directly (not titleOptions)
  const option: any = {
    title: styles.showTitle
      ? {
          text: styles.title || `${valueName}`,
          left: 'center',
        }
      : undefined,
    series: [gaugeSeries],
    // Store original data for reference
    dataset: {
      source: transformedData,
    },
  };

  return option;
};
