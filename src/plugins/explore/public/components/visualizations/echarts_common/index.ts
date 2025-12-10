/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Positions, TitleOptions, TooltipOptions } from '../types';

/**
 * Builds legend configuration for ECharts visualizations
 */
export const buildLegendConfig = (
  addLegend: boolean,
  legendPosition: Positions = Positions.BOTTOM
) => {
  if (!addLegend) {
    return { show: false };
  }

  return {
    show: true,
    type: 'scroll',
    ...(legendPosition === Positions.BOTTOM && { bottom: 0 }),
    ...(legendPosition === Positions.TOP && { top: 0 }),
    ...(legendPosition === Positions.LEFT && { left: 0, orient: 'vertical' }),
    ...(legendPosition === Positions.RIGHT && { right: 0, orient: 'vertical' }),
  };
};

/**
 * Builds title configuration for ECharts visualizations
 */
export const buildTitleConfig = (titleOptions?: TitleOptions, defaultTitle?: string) => {
  if (!titleOptions?.show) {
    return undefined;
  }

  return {
    text: titleOptions.titleName || defaultTitle || '',
    left: 'center',
  };
};

/**
 * Builds tooltip configuration for ECharts visualizations
 */
export const buildTooltipConfig = (
  tooltipOptions?: TooltipOptions,
  trigger: 'axis' | 'item' = 'axis',
  axisPointerType: 'shadow' | 'cross' | 'line' = 'shadow'
) => {
  return {
    show: tooltipOptions?.mode !== 'hidden',
    trigger,
    axisPointer: {
      type: axisPointerType,
    },
  };
};

/**
 * Builds grid configuration for ECharts visualizations
 */
export const buildGridConfig = (options: {
  addLegend?: boolean;
  legendPosition?: Positions;
  showTitle?: boolean;
}) => {
  const { addLegend, legendPosition, showTitle } = options;

  return {
    left: '3%',
    right: '4%',
    bottom: addLegend && legendPosition === Positions.BOTTOM ? '15%' : '3%',
    top: showTitle ? '15%' : '10%',
    containLabel: true,
  };
};

/**
 * Creates the ECharts metadata object for time range brush functionality
 */
export const createEchartsMetadata = (isXTemporal: boolean, xField?: string, xValues?: number[]) => {
  return {
    __metadata__: {
      isXTemporal,
      xField,
      ...(isXTemporal && xValues && { xValues }),
    },
  };
};
