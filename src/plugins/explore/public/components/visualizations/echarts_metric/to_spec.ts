/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricChartStyle } from '../metric/metric_vis_config';
import { VisColumn, AxisColumnMappings, AxisRole, Threshold } from '../types';
import { calculateValue, calculatePercentage } from '../utils/calculation';
import { getColors } from '../theme/default_colors';
import { getUnitById, showDisplayValue } from '../style_panel/unit/collection';
import {
  mergeThresholdsWithBase,
  getMaxAndMinBase,
} from '../style_panel/threshold/threshold_utils';
import { DEFAULT_OPACITY } from '../constants';
import { timeUnitToFormat, inferTimeUnitFromTimestamps } from '../utils/utils';

/**
 * Create an ECharts metric chart spec
 */
export const createEchartsMetricSpec = (
  transformedData: Array<Record<string, any>>,
  numericalColumns: VisColumn[],
  categoricalColumns: VisColumn[],
  dateColumns: VisColumn[],
  styles: MetricChartStyle,
  axisColumnMappings?: AxisColumnMappings
): any => {
  const colorPalette = getColors();

  // Get value column from mappings
  const valueColumn = axisColumnMappings?.[AxisRole.Value];
  const numericField = valueColumn?.column;
  const numericFieldName = valueColumn?.name;

  // Get date column from mappings (for sparkline)
  const dateColumn = axisColumnMappings?.[AxisRole.Time];
  const dateField = dateColumn?.column;

  // Extract numerical values
  let numericalValues: number[] = [];
  let maxNumber: number = 0;
  let minNumber: number = 0;
  if (numericField) {
    numericalValues = transformedData.map((d) => d[numericField]).filter((v) => v !== undefined);
    maxNumber = Math.max(...numericalValues);
    minNumber = Math.min(...numericalValues);
  }

  // Calculate the metric value
  const calculatedValue = calculateValue(numericalValues, styles.valueCalculation);
  const isValidNumber =
    calculatedValue !== undefined && typeof calculatedValue === 'number' && !isNaN(calculatedValue);

  // Get unit and format display value
  const selectedUnit = getUnitById(styles?.unitId);
  const displayValue = showDisplayValue(isValidNumber, selectedUnit, calculatedValue);

  // Calculate min/max for threshold calculations
  const { minBase, maxBase } = getMaxAndMinBase(
    minNumber,
    maxNumber,
    styles?.min,
    styles?.max,
    calculatedValue
  );

  // Determine fill color based on thresholds
  function getValueColor(
    useThresholdColor: boolean,
    threshold?: Threshold[],
    baseColor?: string
  ): string {
    const newThreshold = threshold ?? [];
    const newBaseColor = baseColor ?? colorPalette.statusGreen;

    const { textColor } = mergeThresholdsWithBase(
      minBase,
      maxBase,
      newBaseColor,
      newThreshold,
      calculatedValue
    );

    return useThresholdColor ? textColor : colorPalette.text;
  }

  const valueColor = getValueColor(
    styles?.useThresholdColor ?? false,
    styles?.thresholdOptions?.thresholds,
    styles?.thresholdOptions?.baseColor
  );

  // Calculate percentage if enabled
  let percentage: number | undefined;
  let percentageColor = colorPalette.text;
  if (styles.showPercentage) {
    percentage = calculatePercentage(numericalValues);
    if (percentage !== undefined && percentage > 0) {
      if (styles.percentageColor === 'standard') {
        percentageColor = colorPalette.statusGreen;
      } else if (styles.percentageColor === 'inverted') {
        percentageColor = colorPalette.statusRed;
      }
    }
    if (percentage !== undefined && percentage < 0) {
      if (styles.percentageColor === 'standard') {
        percentageColor = colorPalette.statusRed;
      } else if (styles.percentageColor === 'inverted') {
        percentageColor = colorPalette.statusGreen;
      }
    }
  }

  // Format percentage string
  const percentageStr =
    percentage !== undefined
      ? `${percentage >= 0 ? '+' : ''}${(percentage * 100).toFixed(2)}%`
      : '-';

  // Get date field name for tooltip
  const dateFieldName = dateColumn?.name;

  // Infer time unit for tooltip formatting
  const timeUnit = dateField ? inferTimeUnitFromTimestamps(transformedData, dateField) : null;
  const dateFormat = timeUnit ? timeUnitToFormat[timeUnit] : '%b %d, %Y %H:%M:%S';

  // Build the ECharts option
  const option: any = {
    grid: {
      left: '3%',
      right: '3%',
      bottom: dateField ? '30%' : '3%',
      top: '3%',
      containLabel: false,
    },
    graphic: {
      elements: [] as any[],
    },
    // Add tooltip for sparkline
    ...(dateField && {
      tooltip: {
        show: true,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params: any) => {
          const data = Array.isArray(params) ? params[0] : params;
          if (!data || data.value === undefined) return '';

          const [timestamp, value] = data.value;
          const date = new Date(timestamp);

          // Format date based on inferred time unit
          const formatDate = (d: Date, format: string): string => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            return format
              .replace('%Y', d.getFullYear().toString())
              .replace('%b', months[d.getMonth()])
              .replace('%d', pad(d.getDate()))
              .replace('%H', pad(d.getHours()))
              .replace('%M', pad(d.getMinutes()))
              .replace('%S', pad(d.getSeconds()))
              .replace('%L', d.getMilliseconds().toString().padStart(3, '0'));
          };

          const formattedDate = formatDate(date, dateFormat);
          const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

          return `<strong>${dateFieldName || 'Time'}</strong>: ${formattedDate}<br/><strong>${numericFieldName || 'Value'}</strong>: ${formattedValue}`;
        },
      },
    }),
    xAxis: dateField
      ? {
          type: 'time',
          show: false,
          data: transformedData.map((d) => d[dateField]),
        }
      : { show: false },
    yAxis: dateField
      ? {
          type: 'value',
          show: false,
        }
      : { show: false },
    series: [] as any[],
  };

  // Add sparkline if date field is available
  if (dateField && numericField) {
    option.series.push({
      type: 'line',
      showSymbol: false,
      smooth: true,
      areaStyle: {
        opacity: DEFAULT_OPACITY,
        color: colorPalette.categories[0],
      },
      lineStyle: {
        color: colorPalette.categories[0],
        width: 2,
      },
      data: transformedData.map((d) => [d[dateField], d[numericField]]),
      // Position the sparkline in the bottom portion
      z: 1,
    });

    // Adjust grid for sparkline
    option.grid.bottom = '5%';
    option.grid.top = '60%';
  }

  // Calculate font sizes
  // Vega uses dynamic sizing: textSize = min(width, height) / 20, then value = 5 * textSize
  // This means for a 600px height container, value = 600/20*5 = 150px
  // For a 400px height container, value = 400/20*5 = 100px
  // Since ECharts doesn't support dynamic expressions, we use a large fixed size
  // that looks good at typical dashboard panel sizes (~400-600px height)
  const baseFontSize = 120;
  const valueFontSize = styles.fontSize ?? baseFontSize;
  // Title is 1.5/5 = 0.3 of value size in Vega
  const titleFontSize = styles.titleSize ?? Math.round(valueFontSize * 0.3);
  // Percentage is 2/5 = 0.4 of value size in Vega
  const percentageFontSize = styles.percentageSize ?? Math.round(valueFontSize * 0.4);

  // Font scale from unit
  const fontScale = selectedUnit?.fontScale ?? 1;
  const scaledValueFontSize = Math.round(valueFontSize * fontScale);

  // Calculate vertical positions
  const centerY = dateField ? '35%' : '50%';

  // Add title text element
  if (styles.showTitle) {
    option.graphic.elements.push({
      type: 'text',
      left: 'center',
      top: dateField ? '10%' : '25%',
      style: {
        text: styles.title || numericFieldName || '',
        fontSize: titleFontSize,
        fill: colorPalette.text,
        textAlign: 'center',
        textVerticalAlign: 'middle',
      },
      z: 100,
    });
  }

  // Add main value text element
  option.graphic.elements.push({
    type: 'text',
    left: 'center',
    top: centerY,
    style: {
      text: displayValue ?? '-',
      fontSize: scaledValueFontSize,
      fontWeight: 'bold',
      fill: valueColor,
      textAlign: 'center',
      textVerticalAlign: 'middle',
    },
    z: 100,
  });

  // Add percentage text element if enabled
  if (styles.showPercentage) {
    option.graphic.elements.push({
      type: 'text',
      left: 'center',
      top: dateField ? '50%' : '68%',
      style: {
        text: percentageStr,
        fontSize: percentageFontSize,
        fill: percentageColor,
        textAlign: 'center',
        textVerticalAlign: 'middle',
      },
      z: 100,
    });
  }

  // Store original data for reference
  option.dataset = {
    source: transformedData,
  };

  return option;
};
