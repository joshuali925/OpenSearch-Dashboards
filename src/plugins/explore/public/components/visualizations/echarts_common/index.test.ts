/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildLegendConfig,
  buildTitleConfig,
  buildTooltipConfig,
  buildGridConfig,
  createEchartsMetadata,
} from './index';
import { Positions, TitleOptions, TooltipOptions } from '../types';

describe('echarts_common utilities', () => {
  describe('buildLegendConfig', () => {
    test('returns show: false when addLegend is false', () => {
      const result = buildLegendConfig(false);
      expect(result).toEqual({ show: false });
    });

    test('returns bottom legend config by default', () => {
      const result = buildLegendConfig(true);
      expect(result).toEqual({
        show: true,
        type: 'scroll',
        bottom: 0,
      });
    });

    test('returns top legend config', () => {
      const result = buildLegendConfig(true, Positions.TOP);
      expect(result).toEqual({
        show: true,
        type: 'scroll',
        top: 0,
      });
    });

    test('returns left legend config with vertical orient', () => {
      const result = buildLegendConfig(true, Positions.LEFT);
      expect(result).toEqual({
        show: true,
        type: 'scroll',
        left: 0,
        orient: 'vertical',
      });
    });

    test('returns right legend config with vertical orient', () => {
      const result = buildLegendConfig(true, Positions.RIGHT);
      expect(result).toEqual({
        show: true,
        type: 'scroll',
        right: 0,
        orient: 'vertical',
      });
    });
  });

  describe('buildTitleConfig', () => {
    test('returns undefined when titleOptions.show is false', () => {
      const titleOptions: TitleOptions = { show: false, titleName: 'Test' };
      const result = buildTitleConfig(titleOptions);
      expect(result).toBeUndefined();
    });

    test('returns undefined when titleOptions is undefined', () => {
      const result = buildTitleConfig(undefined);
      expect(result).toBeUndefined();
    });

    test('returns title config with custom title name', () => {
      const titleOptions: TitleOptions = { show: true, titleName: 'Custom Title' };
      const result = buildTitleConfig(titleOptions);
      expect(result).toEqual({
        text: 'Custom Title',
        left: 'center',
      });
    });

    test('returns title config with default title when titleName is empty', () => {
      const titleOptions: TitleOptions = { show: true, titleName: '' };
      const result = buildTitleConfig(titleOptions, 'Default Title');
      expect(result).toEqual({
        text: 'Default Title',
        left: 'center',
      });
    });
  });

  describe('buildTooltipConfig', () => {
    test('returns tooltip config with default values', () => {
      const result = buildTooltipConfig();
      expect(result).toEqual({
        show: true,
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      });
    });

    test('returns hidden tooltip when mode is hidden', () => {
      const tooltipOptions: TooltipOptions = { mode: 'hidden' };
      const result = buildTooltipConfig(tooltipOptions);
      expect(result).toEqual({
        show: false,
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      });
    });

    test('returns tooltip with custom trigger and axisPointerType', () => {
      const tooltipOptions: TooltipOptions = { mode: 'all' };
      const result = buildTooltipConfig(tooltipOptions, 'item', 'cross');
      expect(result).toEqual({
        show: true,
        trigger: 'item',
        axisPointer: {
          type: 'cross',
        },
      });
    });
  });

  describe('buildGridConfig', () => {
    test('returns default grid config', () => {
      const result = buildGridConfig({});
      expect(result).toEqual({
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      });
    });

    test('returns grid with extra bottom space for bottom legend', () => {
      const result = buildGridConfig({
        addLegend: true,
        legendPosition: Positions.BOTTOM,
      });
      expect(result).toEqual({
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      });
    });

    test('returns grid with extra top space for title', () => {
      const result = buildGridConfig({
        showTitle: true,
      });
      expect(result).toEqual({
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      });
    });

    test('returns grid with no extra bottom space for non-bottom legend', () => {
      const result = buildGridConfig({
        addLegend: true,
        legendPosition: Positions.RIGHT,
      });
      expect(result).toEqual({
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      });
    });
  });

  describe('createEchartsMetadata', () => {
    test('returns metadata for non-temporal x-axis', () => {
      const result = createEchartsMetadata(false, 'category');
      expect(result).toEqual({
        __echarts__: true,
        __metadata__: {
          isXTemporal: false,
          xField: 'category',
        },
      });
    });

    test('returns metadata for temporal x-axis with xValues', () => {
      const xValues = [1609459200000, 1609545600000];
      const result = createEchartsMetadata(true, 'timestamp', xValues);
      expect(result).toEqual({
        __echarts__: true,
        __metadata__: {
          isXTemporal: true,
          xField: 'timestamp',
          xValues,
        },
      });
    });

    test('returns metadata for temporal x-axis without xValues', () => {
      const result = createEchartsMetadata(true, 'timestamp');
      expect(result).toEqual({
        __echarts__: true,
        __metadata__: {
          isXTemporal: true,
          xField: 'timestamp',
        },
      });
    });
  });
});
