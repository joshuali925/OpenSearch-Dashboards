/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EchartsGaugeChartStyle } from './echarts_gauge_vis_config';
import { VisColumn, AxisColumnMappings, AxisRole, GaugeThresholdMode, Threshold } from '../types';
import { calculateValue } from '../utils/calculation';
import { getColors } from '../theme/default_colors';

/**
 * Create an ECharts gauge chart spec
 */
export const createEchartsGaugeSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: EchartsGaugeChartStyle,
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
  const thresholdOptions = styles.thresholdOptions ?? {
    mode: GaugeThresholdMode.Absolute,
    thresholds: [],
    baseColor: getColors().statusGreen,
  };
  const thresholdMode = thresholdOptions.mode;
  const thresholds = thresholdOptions.thresholds ?? [];
  const baseColor = thresholdOptions.baseColor ?? getColors().statusGreen;

  /**
   * Convert threshold value to absolute value based on mode
   * - Absolute mode: value is used as-is
   * - Percentage mode: value is a percentage of (max - min) range
   */
  const getAbsoluteThresholdValue = (threshold: Threshold): number => {
    if (thresholdMode === GaugeThresholdMode.Percentage) {
      // Convert percentage (0-100) to absolute value
      return min + (threshold.value / 100) * (max - min);
    }
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

  // Build the gauge series configuration
  const gaugeSeries: any = {
    type: 'gauge',
    min,
    max,
    splitNumber: styles.splitNumber,
    progress: {
      show: styles.showProgress,
      width: styles.progressWidth,
    },
    pointer: {
      show: styles.showPointer,
      width: styles.pointerWidth,
    },
    axisLine: {
      lineStyle: {
        width: styles.progressWidth,
        color: colorStops,
      },
    },
    axisTick: {
      show: true,
      distance: -styles.progressWidth,
      length: 8,
      lineStyle: {
        color: '#999',
        width: 1,
      },
    },
    splitLine: {
      distance: -styles.progressWidth,
      length: styles.progressWidth,
      lineStyle: {
        color: '#999',
        width: 2,
      },
    },
    axisLabel: {
      distance: styles.progressWidth + 10,
      color: '#999',
      fontSize: 12,
      formatter: styles.unit ? `{value} ${styles.unit}` : '{value}',
    },
    anchor: {
      show: styles.showPointer,
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
      formatter: styles.unit ? `{value} ${styles.unit}` : '{value}',
    },
    data: [
      {
        value: Math.round(calculatedValue * 100) / 100,
        name: valueName,
      },
    ],
  };

  // Adjust for ring type
  if (styles.gaugeType === 'ring') {
    gaugeSeries.startAngle = styles.startAngle ?? 90;
    gaugeSeries.endAngle = styles.endAngle ?? -270;
    gaugeSeries.pointer.show = false;
    gaugeSeries.axisTick.show = false;
    gaugeSeries.splitLine.show = false;
    gaugeSeries.axisLabel.show = false;
    gaugeSeries.progress.roundCap = true;
    gaugeSeries.itemStyle = {
      borderWidth: 0,
      borderColor: 'transparent',
    };
  }

  // Build the ECharts option
  const option: any = {
    // Mark this as an ECharts spec
    __echarts__: true,
    title: styles.titleOptions?.show
      ? {
          text: styles.titleOptions?.titleName || `${valueName}`,
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
