/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EchartsBarVisStyleControls } from './echarts_bar_vis_options';
import { VisualizationType } from '../utils/use_visualization_types';
import { AxisRole, VisFieldType, Positions, TitleOptions, TooltipOptions } from '../types';

export type EchartsBarOrientation = 'vertical' | 'horizontal';
export type EchartsBarStackMode = 'none' | 'stacked' | 'percent';

export interface EchartsBarChartStyleOptions {
  addLegend?: boolean;
  legendPosition?: Positions;
  legendTitle?: string;
  orientation?: EchartsBarOrientation;
  stackMode?: EchartsBarStackMode;
  barWidth?: number;
  barGap?: string;
  showBarLabel?: boolean;
  barLabelPosition?: 'inside' | 'outside' | 'top';
  tooltipOptions?: TooltipOptions;
  titleOptions?: TitleOptions;
  showXAxisLabel?: boolean;
  showYAxisLabel?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
}

export type EchartsBarChartStyle = Required<
  Omit<EchartsBarChartStyleOptions, 'legendTitle' | 'xAxisTitle' | 'yAxisTitle'>
> &
  Pick<EchartsBarChartStyleOptions, 'legendTitle' | 'xAxisTitle' | 'yAxisTitle'>;

export const defaultEchartsBarChartStyles: EchartsBarChartStyle = {
  addLegend: true,
  legendTitle: '',
  legendPosition: Positions.BOTTOM,
  orientation: 'vertical',
  stackMode: 'none',
  barWidth: 20,
  barGap: '30%',
  showBarLabel: false,
  barLabelPosition: 'top',
  tooltipOptions: {
    mode: 'all',
  },
  titleOptions: {
    show: false,
    titleName: '',
  },
  showXAxisLabel: true,
  showYAxisLabel: true,
};

export const createEchartsBarConfig = (): VisualizationType<'echarts_bar'> => ({
  name: 'echarts_bar',
  type: 'echarts_bar',
  ui: {
    style: {
      defaults: defaultEchartsBarChartStyles,
      render: (props) => React.createElement(EchartsBarVisStyleControls, props),
    },
    availableMappings: [
      {
        [AxisRole.X]: { type: VisFieldType.Categorical, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
      },
      {
        [AxisRole.X]: { type: VisFieldType.Categorical, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
        [AxisRole.COLOR]: { type: VisFieldType.Categorical, index: 1 },
      },
      {
        [AxisRole.X]: { type: VisFieldType.Date, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
      },
      {
        [AxisRole.X]: { type: VisFieldType.Date, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
        [AxisRole.COLOR]: { type: VisFieldType.Categorical, index: 0 },
      },
    ],
  },
});
