/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EchartsGaugeVisStyleControls } from './echarts_gauge_vis_options';
import { VisualizationType } from '../utils/use_visualization_types';
import { AxisRole, VisFieldType, TitleOptions, GaugeThresholdMode, GaugeThresholdOptions } from '../types';
import { CalculationMethod } from '../utils/calculation';
import { getColors } from '../theme/default_colors';

export type EchartsGaugeType = 'gauge' | 'ring';

export interface EchartsGaugeChartStyleOptions {
  gaugeType?: EchartsGaugeType;
  showTitle?: boolean;
  title?: string;
  min?: number;
  max?: number;
  startAngle?: number;
  endAngle?: number;
  splitNumber?: number;
  showPointer?: boolean;
  pointerWidth?: number;
  showProgress?: boolean;
  progressWidth?: number;
  thresholdOptions?: GaugeThresholdOptions;
  valueCalculation?: CalculationMethod;
  unitId?: string;
  unit?: string;
  titleOptions?: TitleOptions;
}

export type EchartsGaugeChartStyle = Required<
  Omit<
    EchartsGaugeChartStyleOptions,
    'min' | 'max' | 'unitId' | 'unit' | 'startAngle' | 'endAngle' | 'title' | 'thresholdOptions'
  >
> &
  Pick<EchartsGaugeChartStyleOptions, 'min' | 'max' | 'unitId' | 'unit' | 'startAngle' | 'endAngle' | 'title' | 'thresholdOptions'>;

export const defaultEchartsGaugeChartStyles: EchartsGaugeChartStyle = {
  gaugeType: 'gauge',
  showTitle: true,
  valueCalculation: 'last',
  showPointer: true,
  pointerWidth: 6,
  showProgress: true,
  progressWidth: 10,
  splitNumber: 10,
  titleOptions: {
    show: false,
    titleName: '',
  },
  thresholdOptions: {
    mode: GaugeThresholdMode.Absolute,
    thresholds: [],
    baseColor: getColors().statusGreen,
  },
};

export const createEchartsGaugeConfig = (): VisualizationType<'echarts_gauge'> => ({
  name: 'echarts_gauge',
  type: 'echarts_gauge',
  ui: {
    style: {
      defaults: defaultEchartsGaugeChartStyles,
      render: (props) => React.createElement(EchartsGaugeVisStyleControls, props),
    },
    availableMappings: [
      {
        [AxisRole.Value]: { type: VisFieldType.Numerical, index: 0 },
      },
    ],
  },
});
