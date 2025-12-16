/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';
import { TimeRange } from '../../../../../data/public';

interface EchartsRendererProps {
  option: any;
  width?: string | number;
  height?: string | number;
  theme?: 'light' | 'dark';
  onChartReady?: (chart: echarts.ECharts) => void;
  onSelectTimeRange?: (timeRange?: TimeRange) => void;
}

/**
 * Creates a brush end handler for temporal x-axis charts
 */
const createBrushEndHandler = (
  chart: echarts.ECharts,
  xValues: number[] | undefined,
  onSelectTimeRangeRef: React.MutableRefObject<((timeRange?: TimeRange) => void) | undefined>
) => {
  return (params: any) => {
    const areas = params.areas;
    if (!areas || areas.length === 0) return;

    const area = areas[0];
    if (!area || !area.coordRange) return;

    const [startValue, endValue] = area.coordRange;

    if (onSelectTimeRangeRef.current) {
      let from: string;
      let to: string;

      // For category axis with temporal data, coordRange contains indices
      // Map indices to actual timestamps using xValues from metadata
      if (xValues && Array.isArray(xValues)) {
        const startIdx = Math.max(0, Math.floor(startValue));
        const endIdx = Math.min(xValues.length - 1, Math.floor(endValue));
        from = new Date(xValues[startIdx]).toISOString();
        to = new Date(xValues[endIdx]).toISOString();
      } else {
        // For time axis, coordRange contains timestamps directly
        from = new Date(startValue).toISOString();
        to = new Date(endValue).toISOString();
      }
      onSelectTimeRangeRef.current({ from, to });
    }

    // Clear brush selection after a short delay for visual feedback
    setTimeout(() => {
      chart.dispatchAction({
        type: 'brush',
        areas: [],
      });
    }, 200);
  };
};

/**
 * Sets up brush selection for temporal x-axis charts
 */
const setupBrushSelection = (
  chart: echarts.ECharts,
  xValues: number[] | undefined,
  onSelectTimeRangeRef: React.MutableRefObject<((timeRange?: TimeRange) => void) | undefined>,
  brushHandlerRef: React.MutableRefObject<((params: any) => void) | null>
) => {
  // Activate brush mode
  chart.dispatchAction({
    type: 'takeGlobalCursor',
    key: 'brush',
    brushOption: {
      brushType: 'lineX',
      brushMode: 'single',
    },
  });

  // Create and store brush end handler
  const onBrushEnd = createBrushEndHandler(chart, xValues, onSelectTimeRangeRef);
  brushHandlerRef.current = onBrushEnd;
  chart.on('brushEnd', onBrushEnd);
};

export const EchartsRenderer: React.FC<EchartsRendererProps> = ({
  option,
  width = '100%',
  height = '100%',
  theme,
  onChartReady,
  onSelectTimeRange,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const onSelectTimeRangeRef = useRef(onSelectTimeRange);

  // Keep the callback ref updated
  useEffect(() => {
    onSelectTimeRangeRef.current = onSelectTimeRange;
  }, [onSelectTimeRange]);

  const { services } = useOpenSearchDashboards<ExploreServices>();
  const isDarkMode = services?.uiSettings?.get('theme:darkMode', false);

  const effectiveTheme = useMemo(() => {
    if (theme) return theme;
    return isDarkMode ? 'dark' : 'light';
  }, [theme, isDarkMode]);

  // Check if the chart has temporal x-axis (supports brush selection)
  const isXTemporal = option?.__metadata__?.isXTemporal;
  // Get xValues for category axis charts (used to map brush indices to timestamps)
  const xValues = option?.__metadata__?.xValues;

  // Store brush event handler ref for cleanup
  const brushHandlerRef = useRef<((params: any) => void) | null>(null);

  // Track if initial mount has completed (to skip theme effect on first render)
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart if not already done
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, effectiveTheme);
      if (onChartReady) {
        onChartReady(chartInstanceRef.current);
      }
    }

    const chart = chartInstanceRef.current;

    // Update chart options
    if (chart && option) {
      // Remove old brush event handler if exists
      if (brushHandlerRef.current) {
        chart.off('brushEnd', brushHandlerRef.current);
        brushHandlerRef.current = null;
      }

      // Remove the metadata before setting options (used for brush selection)
      const cleanOption = { ...option };
      delete cleanOption.__metadata__;

      chart.setOption(cleanOption, true);

      // Set up brush for temporal x-axis charts
      if (isXTemporal) {
        setupBrushSelection(chart, xValues, onSelectTimeRangeRef, brushHandlerRef);
      }
    }

    // Mark initial mount as complete
    isInitialMountRef.current = false;

    return () => {
      // Clean up brush handler on effect cleanup
      if (chart && brushHandlerRef.current) {
        chart.off('brushEnd', brushHandlerRef.current);
      }
    };
  }, [option, effectiveTheme, onChartReady, isXTemporal, xValues]);

  // Handle theme changes (skip on initial mount - main effect handles it)
  useEffect(() => {
    // Skip on initial mount - main effect already set up the chart
    if (isInitialMountRef.current) return;
    if (!chartRef.current || !chartInstanceRef.current) return;

    // Remove old brush handler before disposing
    if (brushHandlerRef.current) {
      chartInstanceRef.current.off('brushEnd', brushHandlerRef.current);
      brushHandlerRef.current = null;
    }

    // Dispose and recreate chart with new theme
    chartInstanceRef.current.dispose();
    const chart = echarts.init(chartRef.current, effectiveTheme);
    chartInstanceRef.current = chart;

    if (option) {
      const cleanOption = { ...option };
      delete cleanOption.__metadata__;
      chart.setOption(cleanOption, true);

      // Re-setup brush for temporal x-axis charts
      if (isXTemporal) {
        setupBrushSelection(chart, xValues, onSelectTimeRangeRef, brushHandlerRef);
      }
    }

    if (onChartReady) {
      onChartReady(chart);
    }
  }, [effectiveTheme, option, isXTemporal, xValues]);

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

