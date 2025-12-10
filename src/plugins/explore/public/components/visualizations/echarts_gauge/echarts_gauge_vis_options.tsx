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
  EuiFieldNumber,
  EuiFieldText,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { EchartsGaugeChartStyle, EchartsGaugeChartStyleOptions } from './echarts_gauge_vis_config';
import { StyleControlsProps } from '../utils/use_visualization_types';
import { AxesSelectPanel } from '../style_panel/axes/axes_selector';
import { TitleOptionsPanel } from '../style_panel/title/title';
import { ValueCalculationSelector } from '../style_panel/value/value_calculation_selector';
import { GaugeThresholdMode, GaugeThresholdOptions, Threshold } from '../types';
import { StyleAccordion } from '../style_panel/style_accordion';
import { ThresholdCustomValues } from '../style_panel/threshold/threshold_custom_values';
import { getColors } from '../theme/default_colors';

export type EchartsGaugeVisStyleControlsProps = StyleControlsProps<EchartsGaugeChartStyle>;

const gaugeTypeOptions = [
  {
    value: 'gauge',
    text: i18n.translate('explore.echartsGauge.gaugeType.gauge', { defaultMessage: 'Gauge' }),
  },
  {
    value: 'ring',
    text: i18n.translate('explore.echartsGauge.gaugeType.ring', { defaultMessage: 'Ring' }),
  },
];

const thresholdModeButtons = [
  {
    id: GaugeThresholdMode.Absolute,
    label: i18n.translate('explore.echartsGauge.thresholdMode.absolute', {
      defaultMessage: 'Absolute',
    }),
  },
  {
    id: GaugeThresholdMode.Percentage,
    label: i18n.translate('explore.echartsGauge.thresholdMode.percentage', {
      defaultMessage: 'Percentage',
    }),
  },
];

export const EchartsGaugeVisStyleControls: React.FC<EchartsGaugeVisStyleControlsProps> = ({
  styleOptions,
  onStyleChange,
  numericalColumns = [],
  categoricalColumns = [],
  dateColumns = [],
  axisColumnMappings,
  updateVisualization,
}) => {
  const updateStyleOption = <K extends keyof EchartsGaugeChartStyleOptions>(
    key: K,
    value: EchartsGaugeChartStyleOptions[K]
  ) => {
    onStyleChange({ [key]: value });
  };

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
          chartType="echarts_gauge"
        />
      </EuiFlexItem>

      {hasMappingSelected && (
        <>
          <EuiFlexItem grow={false}>
            <EuiPanel hasBorder={false} hasShadow={false} color="subdued" paddingSize="s">
              <EuiTitle size="xxxs">
                <h4>
                  {i18n.translate('explore.echartsGauge.gaugeOptions.title', {
                    defaultMessage: 'Gauge Options',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />

              <EuiFormRow
                label={i18n.translate('explore.echartsGauge.gaugeType.label', {
                  defaultMessage: 'Gauge type',
                })}
                display="columnCompressed"
              >
                <EuiSelect
                  compressed
                  options={gaugeTypeOptions}
                  value={styleOptions.gaugeType}
                  onChange={(e) =>
                    updateStyleOption(
                      'gaugeType',
                      e.target.value as EchartsGaugeChartStyleOptions['gaugeType']
                    )
                  }
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('explore.echartsGauge.min.label', {
                  defaultMessage: 'Min value',
                })}
                display="columnCompressed"
              >
                <EuiFieldNumber
                  compressed
                  value={styleOptions.min ?? 0}
                  onChange={(e) => updateStyleOption('min', Number(e.target.value))}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('explore.echartsGauge.max.label', {
                  defaultMessage: 'Max value',
                })}
                display="columnCompressed"
              >
                <EuiFieldNumber
                  compressed
                  value={styleOptions.max ?? 100}
                  onChange={(e) => updateStyleOption('max', Number(e.target.value))}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('explore.echartsGauge.splitNumber.label', {
                  defaultMessage: 'Number of splits',
                })}
                display="columnCompressed"
              >
                <EuiRange
                  compressed
                  min={2}
                  max={20}
                  value={styleOptions.splitNumber}
                  onChange={(e) => updateStyleOption('splitNumber', Number(e.currentTarget.value))}
                  showLabels
                />
              </EuiFormRow>

              <EuiFormRow display="columnCompressed">
                <EuiSwitch
                  label={i18n.translate('explore.echartsGauge.showPointer.label', {
                    defaultMessage: 'Show pointer',
                  })}
                  checked={styleOptions.showPointer}
                  onChange={(e) => updateStyleOption('showPointer', e.target.checked)}
                  compressed
                />
              </EuiFormRow>

              {styleOptions.showPointer && (
                <EuiFormRow
                  label={i18n.translate('explore.echartsGauge.pointerWidth.label', {
                    defaultMessage: 'Pointer width',
                  })}
                  display="columnCompressed"
                >
                  <EuiRange
                    compressed
                    min={2}
                    max={20}
                    value={styleOptions.pointerWidth}
                    onChange={(e) =>
                      updateStyleOption('pointerWidth', Number(e.currentTarget.value))
                    }
                    showLabels
                  />
                </EuiFormRow>
              )}

              <EuiFormRow display="columnCompressed">
                <EuiSwitch
                  label={i18n.translate('explore.echartsGauge.showProgress.label', {
                    defaultMessage: 'Show progress bar',
                  })}
                  checked={styleOptions.showProgress}
                  onChange={(e) => updateStyleOption('showProgress', e.target.checked)}
                  compressed
                />
              </EuiFormRow>

              {styleOptions.showProgress && (
                <EuiFormRow
                  label={i18n.translate('explore.echartsGauge.progressWidth.label', {
                    defaultMessage: 'Progress bar width',
                  })}
                  display="columnCompressed"
                >
                  <EuiRange
                    compressed
                    min={2}
                    max={50}
                    value={styleOptions.progressWidth}
                    onChange={(e) =>
                      updateStyleOption('progressWidth', Number(e.currentTarget.value))
                    }
                    showLabels
                  />
                </EuiFormRow>
              )}

              <EuiFormRow
                label={i18n.translate('explore.echartsGauge.unit.label', {
                  defaultMessage: 'Unit',
                })}
                display="columnCompressed"
              >
                <EuiFieldText
                  compressed
                  placeholder={i18n.translate('explore.echartsGauge.unit.placeholder', {
                    defaultMessage: 'e.g., %, ms, GB',
                  })}
                  value={styleOptions.unit ?? ''}
                  onChange={(e) => updateStyleOption('unit', e.target.value)}
                />
              </EuiFormRow>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <ValueCalculationSelector
              selectedValue={styleOptions.valueCalculation}
              onChange={(method) => updateStyleOption('valueCalculation', method)}
            />
          </EuiFlexItem>

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
            <StyleAccordion
              id="thresholdSection"
              accordionLabel={i18n.translate('explore.echartsGauge.thresholds.title', {
                defaultMessage: 'Thresholds',
              })}
              initialIsOpen={false}
            >
              <EuiFormRow
                label={i18n.translate('explore.echartsGauge.thresholdMode.label', {
                  defaultMessage: 'Threshold mode',
                })}
                display="columnCompressed"
              >
                <EuiButtonGroup
                  legend="Threshold mode"
                  options={thresholdModeButtons}
                  idSelected={styleOptions.thresholdOptions?.mode ?? GaugeThresholdMode.Absolute}
                  onChange={(id) => {
                    const newMode = id as GaugeThresholdMode;
                    updateStyleOption('thresholdOptions', {
                      ...styleOptions.thresholdOptions,
                      mode: newMode,
                      thresholds: styleOptions.thresholdOptions?.thresholds ?? [],
                      baseColor: styleOptions.thresholdOptions?.baseColor ?? getColors().statusGreen,
                    });
                  }}
                  buttonSize="compressed"
                  isFullWidth
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <ThresholdCustomValues
                thresholds={styleOptions.thresholdOptions?.thresholds ?? []}
                onThresholdValuesChange={(thresholds: Threshold[]) => {
                  updateStyleOption('thresholdOptions', {
                    ...styleOptions.thresholdOptions,
                    mode: styleOptions.thresholdOptions?.mode ?? GaugeThresholdMode.Absolute,
                    thresholds,
                    baseColor: styleOptions.thresholdOptions?.baseColor ?? getColors().statusGreen,
                  });
                }}
                baseColor={styleOptions.thresholdOptions?.baseColor ?? getColors().statusGreen}
                onBaseColorChange={(color: string) => {
                  updateStyleOption('thresholdOptions', {
                    ...styleOptions.thresholdOptions,
                    mode: styleOptions.thresholdOptions?.mode ?? GaugeThresholdMode.Absolute,
                    thresholds: styleOptions.thresholdOptions?.thresholds ?? [],
                    baseColor: color,
                  });
                }}
              />
            </StyleAccordion>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
