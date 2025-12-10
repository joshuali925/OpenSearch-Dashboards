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
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { EchartsBarChartStyle, EchartsBarChartStyleOptions } from './echarts_bar_vis_config';
import { StyleControlsProps } from '../utils/use_visualization_types';
import { LegendOptionsWrapper } from '../style_panel/legend/legend_options_wrapper';
import { TooltipOptionsPanel } from '../style_panel/tooltip/tooltip';
import { AxesSelectPanel } from '../style_panel/axes/axes_selector';
import { TitleOptionsPanel } from '../style_panel/title/title';
import { AxisRole } from '../types';

export type EchartsBarVisStyleControlsProps = StyleControlsProps<EchartsBarChartStyle>;

const orientationOptions = [
  {
    value: 'vertical',
    text: i18n.translate('explore.echartsBar.orientation.vertical', { defaultMessage: 'Vertical' }),
  },
  {
    value: 'horizontal',
    text: i18n.translate('explore.echartsBar.orientation.horizontal', {
      defaultMessage: 'Horizontal',
    }),
  },
];

const stackModeOptions = [
  {
    value: 'none',
    text: i18n.translate('explore.echartsBar.stackMode.none', { defaultMessage: 'None' }),
  },
  {
    value: 'stacked',
    text: i18n.translate('explore.echartsBar.stackMode.stacked', { defaultMessage: 'Stacked' }),
  },
  {
    value: 'percent',
    text: i18n.translate('explore.echartsBar.stackMode.percent', { defaultMessage: '100% Stacked' }),
  },
];

const labelPositionOptions = [
  {
    value: 'inside',
    text: i18n.translate('explore.echartsBar.labelPosition.inside', { defaultMessage: 'Inside' }),
  },
  {
    value: 'outside',
    text: i18n.translate('explore.echartsBar.labelPosition.outside', { defaultMessage: 'Outside' }),
  },
  {
    value: 'top',
    text: i18n.translate('explore.echartsBar.labelPosition.top', { defaultMessage: 'Top' }),
  },
];

export const EchartsBarVisStyleControls: React.FC<EchartsBarVisStyleControlsProps> = ({
  styleOptions,
  onStyleChange,
  numericalColumns = [],
  categoricalColumns = [],
  dateColumns = [],
  axisColumnMappings,
  updateVisualization,
}) => {
  const updateStyleOption = <K extends keyof EchartsBarChartStyleOptions>(
    key: K,
    value: EchartsBarChartStyleOptions[K]
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
          chartType="echarts_bar"
        />
      </EuiFlexItem>

      {hasMappingSelected && (
        <>
          <EuiFlexItem grow={false}>
            <EuiPanel hasBorder={false} hasShadow={false} color="subdued" paddingSize="s">
              <EuiTitle size="xxxs">
                <h4>
                  {i18n.translate('explore.echartsBar.barOptions.title', {
                    defaultMessage: 'Bar Options',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />

              <EuiFormRow
                label={i18n.translate('explore.echartsBar.orientation.label', {
                  defaultMessage: 'Orientation',
                })}
                display="columnCompressed"
              >
                <EuiSelect
                  compressed
                  options={orientationOptions}
                  value={styleOptions.orientation}
                  onChange={(e) =>
                    updateStyleOption(
                      'orientation',
                      e.target.value as EchartsBarChartStyleOptions['orientation']
                    )
                  }
                />
              </EuiFormRow>

              {hasColorMapping && (
                <EuiFormRow
                  label={i18n.translate('explore.echartsBar.stackMode.label', {
                    defaultMessage: 'Stack mode',
                  })}
                  display="columnCompressed"
                >
                  <EuiSelect
                    compressed
                    options={stackModeOptions}
                    value={styleOptions.stackMode}
                    onChange={(e) =>
                      updateStyleOption(
                        'stackMode',
                        e.target.value as EchartsBarChartStyleOptions['stackMode']
                      )
                    }
                  />
                </EuiFormRow>
              )}

              <EuiFormRow
                label={i18n.translate('explore.echartsBar.barWidth.label', {
                  defaultMessage: 'Bar width',
                })}
                display="columnCompressed"
              >
                <EuiRange
                  compressed
                  min={5}
                  max={100}
                  value={styleOptions.barWidth}
                  onChange={(e) => updateStyleOption('barWidth', Number(e.currentTarget.value))}
                  showLabels
                />
              </EuiFormRow>

              <EuiFormRow display="columnCompressed">
                <EuiSwitch
                  label={i18n.translate('explore.echartsBar.showBarLabel.label', {
                    defaultMessage: 'Show bar labels',
                  })}
                  checked={styleOptions.showBarLabel}
                  onChange={(e) => updateStyleOption('showBarLabel', e.target.checked)}
                  compressed
                />
              </EuiFormRow>

              {styleOptions.showBarLabel && (
                <EuiFormRow
                  label={i18n.translate('explore.echartsBar.barLabelPosition.label', {
                    defaultMessage: 'Label position',
                  })}
                  display="columnCompressed"
                >
                  <EuiSelect
                    compressed
                    options={labelPositionOptions}
                    value={styleOptions.barLabelPosition}
                    onChange={(e) =>
                      updateStyleOption(
                        'barLabelPosition',
                        e.target.value as EchartsBarChartStyleOptions['barLabelPosition']
                      )
                    }
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
        </>
      )}
    </EuiFlexGroup>
  );
};
