/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExecutionContextSearch } from '../../../../expressions/common';
import { ExpressionRendererEvent, ExpressionsStart } from '../../../../expressions/public';
import { TimeRange } from '../../../../data/public';
import { EchartsRenderer } from './echarts_renderer';
import { toExpression } from './utils/to_expression';

/**
 * Renderer type based on chart type prefix
 */
export type RendererType = 'echarts' | 'vega';

/**
 * Determines the renderer type based on chart type name
 * Chart types starting with 'echarts_' use ECharts renderer, others use Vega
 */
export const getRendererType = (chartType: string | undefined): RendererType => {
  return chartType?.startsWith('echarts_') ? 'echarts' : 'vega';
};

interface ChartRendererProps {
  chartType: string | undefined;
  spec: any;
  searchContext?: ExecutionContextSearch;
  ExpressionRenderer?: ExpressionsStart['ReactExpressionRenderer'];
  onSelectTimeRange?: (timeRange?: TimeRange) => void;
  onExpressionEvent?: (e: ExpressionRendererEvent) => void;
}

/**
 * ChartRenderer component that routes to the appropriate renderer based on chart type.
 * - Chart types starting with 'echarts_' (e.g., 'echarts_line') use ECharts renderer
 * - Other chart types (e.g., 'line', 'bar') use Vega/Expression renderer
 */
export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chartType,
  spec,
  searchContext,
  ExpressionRenderer,
  onSelectTimeRange,
  onExpressionEvent,
}) => {
  const rendererType = getRendererType(chartType);

  if (rendererType === 'echarts') {
    return (
      <EchartsRenderer
        option={spec}
        height="100%"
        width="100%"
        onSelectTimeRange={onSelectTimeRange}
      />
    );
  }

  // Vega/Expression renderer
  if (!ExpressionRenderer) {
    return null;
  }

  const expression = toExpression(searchContext, spec);
  return (
    <ExpressionRenderer
      key={JSON.stringify(searchContext) + expression}
      expression={expression}
      searchContext={searchContext}
      onEvent={onExpressionEvent}
    />
  );
};
