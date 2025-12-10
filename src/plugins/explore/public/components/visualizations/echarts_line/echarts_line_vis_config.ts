/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EchartsLineVisStyleControls } from './echarts_line_vis_options';
import { VisualizationType } from '../utils/use_visualization_types';
import { AxisRole, VisFieldType, Positions, TitleOptions, TooltipOptions, Threshold } from '../types';
import { getColors } from '../theme/default_colors';

export type EchartsLineMode = 'straight' | 'smooth' | 'stepped';

export interface EchartsLineChartStyleOptions {
  addLegend?: boolean;
  legendPosition?: Positions;
  legendTitle?: string;
  lineMode?: EchartsLineMode;
  lineWidth?: number;
  showSymbol?: boolean;
  symbolSize?: number;
  areaStyle?: boolean;
  areaOpacity?: number;
  tooltipOptions?: TooltipOptions;
  titleOptions?: TitleOptions;
  showXAxisLabel?: boolean;
  showYAxisLabel?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
  thresholds?: Threshold[];
  baseColor?: string;
}

export type EchartsLineChartStyle = Required<
  Omit<EchartsLineChartStyleOptions, 'legendTitle' | 'xAxisTitle' | 'yAxisTitle' | 'thresholds' | 'baseColor'>
> &
  Pick<EchartsLineChartStyleOptions, 'legendTitle' | 'xAxisTitle' | 'yAxisTitle' | 'thresholds' | 'baseColor'>;

export const defaultEchartsLineChartStyles: EchartsLineChartStyle = {
  addLegend: true,
  legendTitle: '',
  legendPosition: Positions.BOTTOM,
  lineMode: 'straight',
  lineWidth: 2,
  showSymbol: true,
  symbolSize: 4,
  areaStyle: false,
  areaOpacity: 0.3,
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

export const createEchartsLineConfig = (): VisualizationType<'echarts_line'> => ({
  name: 'echarts_line',
  type: 'echarts_line',
  ui: {
    style: {
      defaults: defaultEchartsLineChartStyles,
      render: (props) => React.createElement(EchartsLineVisStyleControls, props),
    },
    availableMappings: [
      {
        [AxisRole.X]: { type: VisFieldType.Date, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
      },
      {
        [AxisRole.X]: { type: VisFieldType.Date, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
        [AxisRole.COLOR]: { type: VisFieldType.Categorical, index: 0 },
      },
      {
        [AxisRole.X]: { type: VisFieldType.Categorical, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
      },
      {
        [AxisRole.X]: { type: VisFieldType.Categorical, index: 0 },
        [AxisRole.Y]: { type: VisFieldType.Numerical, index: 0 },
        [AxisRole.COLOR]: { type: VisFieldType.Categorical, index: 1 },
      },
    ],
  },
});
