/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';

interface EchartsRendererProps {
  option: any;
  width?: string | number;
  height?: string | number;
  theme?: 'light' | 'dark';
  onChartReady?: (chart: echarts.ECharts) => void;
}

export const EchartsRenderer: React.FC<EchartsRendererProps> = ({
  option,
  width = '100%',
  height = '100%',
  theme,
  onChartReady,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const { services } = useOpenSearchDashboards<ExploreServices>();
  const isDarkMode = services?.uiSettings?.get('theme:darkMode', false);

  const effectiveTheme = useMemo(() => {
    if (theme) return theme;
    return isDarkMode ? 'dark' : 'light';
  }, [theme, isDarkMode]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart if not already done
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, effectiveTheme);
      if (onChartReady) {
        onChartReady(chartInstanceRef.current);
      }
    }

    // Update chart options
    if (chartInstanceRef.current && option) {
      // Remove the __echarts__ marker before setting options
      const cleanOption = { ...option };
      delete cleanOption.__echarts__;

      chartInstanceRef.current.setOption(cleanOption, true);
    }

    return () => {
      // Don't dispose on option change, only on unmount
    };
  }, [option, effectiveTheme, onChartReady]);

  // Handle theme changes
  useEffect(() => {
    if (!chartRef.current || !chartInstanceRef.current) return;

    // Dispose and recreate chart with new theme
    chartInstanceRef.current.dispose();
    chartInstanceRef.current = echarts.init(chartRef.current, effectiveTheme);

    if (option) {
      const cleanOption = { ...option };
      delete cleanOption.__echarts__;
      chartInstanceRef.current.setOption(cleanOption, true);
    }

    if (onChartReady) {
      onChartReady(chartInstanceRef.current);
    }
  }, [effectiveTheme]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Also use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={chartRef}
      style={{
        width,
        height,
        minHeight: '300px',
      }}
    />
  );
};

/**
 * Check if a spec is an ECharts spec
 */
export const isEchartsSpec = (spec: any): boolean => {
  return spec && spec.__echarts__ === true;
};
