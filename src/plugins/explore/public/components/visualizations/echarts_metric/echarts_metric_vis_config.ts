/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VisualizationType } from '../utils/use_visualization_types';
import { EchartsMetricVisStyleControls } from './echarts_metric_vis_options';
import { AxisRole, VisFieldType, PercentageColor, ThresholdOptions } from '../types';
import { CalculationMethod } from '../utils/calculation';
import { getColors } from '../theme/default_colors';

export interface EchartsMetricChartStyleOptions {
  showTitle?: boolean;
  title?: string;
  fontSize?: number;
  titleSize?: number;
  percentageSize?: number;
  showPercentage?: boolean;
  percentageColor?: PercentageColor;
  valueCalculation?: CalculationMethod;
  unitId?: string;
  thresholdOptions?: ThresholdOptions;
  min?: number;
  max?: number;
  useThresholdColor?: boolean;
}

export type EchartsMetricChartStyle = Required<
  Omit<
    EchartsMetricChartStyleOptions,
    'fontSize' | 'titleSize' | 'percentageSize' | 'unitId' | 'min' | 'max'
  >
> &
  Pick<
    EchartsMetricChartStyleOptions,
    'fontSize' | 'titleSize' | 'percentageSize' | 'unitId' | 'min' | 'max'
  >;

export const defaultEchartsMetricChartStyles: EchartsMetricChartStyle = {
  showTitle: true,
  title: '',
  showPercentage: false,
  percentageColor: 'standard',
  valueCalculation: 'last',
  thresholdOptions: {
    baseColor: getColors().statusGreen,
    thresholds: [],
  },
  useThresholdColor: false,
};

export const createEchartsMetricConfig = (): VisualizationType<'echarts_metric'> => ({
  name: 'echarts_metric',
  type: 'echarts_metric',
  ui: {
    style: {
      defaults: defaultEchartsMetricChartStyles,
      render: (props) => React.createElement(EchartsMetricVisStyleControls, props),
    },
    availableMappings: [
      {
        [AxisRole.Value]: { type: VisFieldType.Numerical, index: 0 },
      },
      {
        [AxisRole.Value]: { type: VisFieldType.Numerical, index: 0 },
        [AxisRole.Time]: { type: VisFieldType.Date, index: 0 },
      },
    ],
  },
});
