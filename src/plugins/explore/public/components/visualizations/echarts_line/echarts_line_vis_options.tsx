/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { isEmpty } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiRange,
  EuiSwitch,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { EchartsLineChartStyle, EchartsLineChartStyleOptions } from './echarts_line_vis_config';
import { StyleControlsProps } from '../utils/use_visualization_types';
import { LegendOptionsWrapper } from '../style_panel/legend/legend_options_wrapper';
import { TooltipOptionsPanel } from '../style_panel/tooltip/tooltip';
import { AxesSelectPanel } from '../style_panel/axes/axes_selector';
import { TitleOptionsPanel } from '../style_panel/title/title';
import { AxisRole, Threshold } from '../types';
import { StyleAccordion } from '../style_panel/style_accordion';
import { ThresholdCustomValues } from '../style_panel/threshold/threshold_custom_values';
import { getColors } from '../theme/default_colors';

export type EchartsLineVisStyleControlsProps = StyleControlsProps<EchartsLineChartStyle>;

const lineModeOptions = [
  {
    value: 'straight',
    text: i18n.translate('explore.echartsLine.lineMode.straight', { defaultMessage: 'Straight' }),
  },
  {
    value: 'smooth',
    text: i18n.translate('explore.echartsLine.lineMode.smooth', { defaultMessage: 'Smooth' }),
  },
  {
    value: 'stepped',
    text: i18n.translate('explore.echartsLine.lineMode.stepped', { defaultMessage: 'Stepped' }),
  },
];

export const EchartsLineVisStyleControls: React.FC<EchartsLineVisStyleControlsProps> = ({
  styleOptions,
  onStyleChange,
  numericalColumns = [],
  categoricalColumns = [],
  dateColumns = [],
  axisColumnMappings,
  updateVisualization,
}) => {
  const updateStyleOption = <K extends keyof EchartsLineChartStyleOptions>(
    key: K,
    value: EchartsLineChartStyleOptions[K]
  ) => {
    onStyleChange({ [key]: value });
  };

  const hasColorMapping = !!axisColumnMappings?.[AxisRole.COLOR];
  const shouldShowLegend = hasColorMapping;
  const hasMappingSelected = !isEmpty(axisColumnMappings);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <AxesSelectPanel
          numericalColumns={numericalColumns}
          categoricalColumns={categoricalColumns}
          dateColumns={dateColumns}
          currentMapping={axisColumnMappings}
          updateVisualization={updateVisualization}
          chartType="echarts_line"
        />
      </EuiFlexItem>

      {hasMappingSelected && (
        <>
          <EuiFlexItem grow={false}>
            <EuiPanel hasBorder={false} hasShadow={false} color="subdued" paddingSize="s">
              <EuiTitle size="xxxs">
                <h4>
                  {i18n.translate('explore.echartsLine.lineOptions.title', {
                    defaultMessage: 'Line Options',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />

              <EuiFormRow
                label={i18n.translate('explore.echartsLine.lineMode.label', {
                  defaultMessage: 'Line mode',
                })}
                display="columnCompressed"
              >
                <EuiSelect
                  compressed
                  options={lineModeOptions}
                  value={styleOptions.lineMode}
                  onChange={(e) =>
                    updateStyleOption(
                      'lineMode',
                      e.target.value as EchartsLineChartStyleOptions['lineMode']
                    )
                  }
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('explore.echartsLine.lineWidth.label', {
                  defaultMessage: 'Line width',
                })}
                display="columnCompressed"
              >
                <EuiRange
                  compressed
                  min={1}
                  max={10}
                  value={styleOptions.lineWidth}
                  onChange={(e) => updateStyleOption('lineWidth', Number(e.currentTarget.value))}
                  showLabels
                />
              </EuiFormRow>

              <EuiFormRow display="columnCompressed">
                <EuiSwitch
                  label={i18n.translate('explore.echartsLine.showSymbol.label', {
                    defaultMessage: 'Show data points',
                  })}
                  checked={styleOptions.showSymbol}
                  onChange={(e) => updateStyleOption('showSymbol', e.target.checked)}
                  compressed
                />
              </EuiFormRow>

              {styleOptions.showSymbol && (
                <EuiFormRow
                  label={i18n.translate('explore.echartsLine.symbolSize.label', {
                    defaultMessage: 'Point size',
                  })}
                  display="columnCompressed"
                >
                  <EuiRange
                    compressed
                    min={2}
                    max={20}
                    value={styleOptions.symbolSize}
                    onChange={(e) => updateStyleOption('symbolSize', Number(e.currentTarget.value))}
                    showLabels
                  />
                </EuiFormRow>
              )}

              <EuiFormRow display="columnCompressed">
                <EuiSwitch
                  label={i18n.translate('explore.echartsLine.areaStyle.label', {
                    defaultMessage: 'Fill area under line',
                  })}
                  checked={styleOptions.areaStyle}
                  onChange={(e) => updateStyleOption('areaStyle', e.target.checked)}
                  compressed
                />
              </EuiFormRow>

              {styleOptions.areaStyle && (
                <EuiFormRow
                  label={i18n.translate('explore.echartsLine.areaOpacity.label', {
                    defaultMessage: 'Area opacity',
                  })}
                  display="columnCompressed"
                >
                  <EuiRange
                    compressed
                    min={0}
                    max={1}
                    step={0.1}
                    value={styleOptions.areaOpacity}
                    onChange={(e) =>
                      updateStyleOption('areaOpacity', Number(e.currentTarget.value))
                    }
                    showLabels
                  />
                </EuiFormRow>
              )}
            </EuiPanel>
          </EuiFlexItem>

          <LegendOptionsWrapper
            styleOptions={styleOptions}
            updateStyleOption={updateStyleOption}
            shouldShow={shouldShowLegend}
          />

          <EuiFlexItem grow={false}>
            <TitleOptionsPanel
              titleOptions={styleOptions.titleOptions}
              onShowTitleChange={(titleOptions) => {
                updateStyleOption('titleOptions', {
                  ...styleOptions.titleOptions,
                  ...titleOptions,
                });
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <TooltipOptionsPanel
              tooltipOptions={styleOptions.tooltipOptions}
              onTooltipOptionsChange={(tooltipOptions) =>
                updateStyleOption('tooltipOptions', {
                  ...styleOptions.tooltipOptions,
                  ...tooltipOptions,
                })
              }
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <StyleAccordion
              id="axisSection"
              accordionLabel={i18n.translate('explore.echartsLine.axis.title', {
                defaultMessage: 'Axis',
              })}
              initialIsOpen={false}
            >
              <EuiFormRow
                label={i18n.translate('explore.echartsLine.xAxisLabel.label', {
                  defaultMessage: 'X-axis label',
                })}
                display="columnCompressed"
              >
                <EuiFieldText
                  compressed
                  placeholder={axisColumnMappings?.[AxisRole.X]?.name ?? 'X Axis'}
                  value={styleOptions.xAxisTitle ?? ''}
                  onChange={(e) => updateStyleOption('xAxisTitle', e.target.value)}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('explore.echartsLine.yAxisLabel.label', {
                  defaultMessage: 'Y-axis label',
                })}
                display="columnCompressed"
              >
                <EuiFieldText
                  compressed
                  placeholder={axisColumnMappings?.[AxisRole.Y]?.name ?? 'Y Axis'}
                  value={styleOptions.yAxisTitle ?? ''}
                  onChange={(e) => updateStyleOption('yAxisTitle', e.target.value)}
                />
              </EuiFormRow>
            </StyleAccordion>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <StyleAccordion
              id="thresholdSection"
              accordionLabel={i18n.translate('explore.echartsLine.thresholds.title', {
                defaultMessage: 'Thresholds',
              })}
              initialIsOpen={false}
            >
              <ThresholdCustomValues
                thresholds={styleOptions.thresholds ?? []}
                onThresholdValuesChange={(thresholds: Threshold[]) => {
                  updateStyleOption('thresholds', thresholds);
                }}
                baseColor={styleOptions.baseColor ?? getColors().statusGreen}
                onBaseColorChange={(color: string) => {
                  updateStyleOption('baseColor', color);
                }}
              />
            </StyleAccordion>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
