/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiSuperSelect, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@osd/i18n';
import { CalculationMethod } from '../../utils/calculation';

const VALUE_CALCULATION_OPTIONS: Array<{
  value: CalculationMethod;
  display: string;
  description: string;
}> = [
  {
    value: 'last*',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.lastNumDisplay', {
      defaultMessage: 'Last *',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.lastNumDescription',
      {
        defaultMessage: 'Last numerical value',
      }
    ),
  },
  {
    value: 'last',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.lastDisplay', {
      defaultMessage: 'Last',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.lastDescription',
      {
        defaultMessage: 'Last value',
      }
    ),
  },
  {
    value: 'first*',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.firstNumDisplay', {
      defaultMessage: 'First *',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.firstNumDescription',
      {
        defaultMessage: 'First numerical value',
      }
    ),
  },
  {
    value: 'first',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.firstDisplay', {
      defaultMessage: 'First',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.firstDescription',
      {
        defaultMessage: 'First value',
      }
    ),
  },
  {
    value: 'min',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.minDisplay', {
      defaultMessage: 'Min',
    }),
    description: i18n.translate('agenticObservability.stylePanel.valueCalculation.minDescription', {
      defaultMessage: 'Minimum value',
    }),
  },
  {
    value: 'max',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.maxDisplay', {
      defaultMessage: 'Max',
    }),
    description: i18n.translate('agenticObservability.stylePanel.valueCalculation.maxDescription', {
      defaultMessage: 'Maximum value',
    }),
  },
  {
    value: 'mean',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.meanDisplay', {
      defaultMessage: 'Mean',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.meanDescription',
      {
        defaultMessage: 'Average value',
      }
    ),
  },
  {
    value: 'median',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.medianDisplay', {
      defaultMessage: 'Median',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.medianDescription',
      {
        defaultMessage: 'Middle value',
      }
    ),
  },
  {
    value: 'variance',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.varianceDisplay', {
      defaultMessage: 'Variance',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.varianceDescription',
      {
        defaultMessage: 'Statistical variance',
      }
    ),
  },
  {
    value: 'count',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.countDisplay', {
      defaultMessage: 'Count',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.countDescription',
      {
        defaultMessage: 'Number of values',
      }
    ),
  },
  {
    value: 'distinct_count',
    display: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.distinctCountDisplay',
      {
        defaultMessage: 'Distinct count',
      }
    ),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.distinctCountDescription',
      {
        defaultMessage: 'Number of unique values',
      }
    ),
  },
  {
    value: 'total',
    display: i18n.translate('agenticObservability.stylePanel.valueCalculation.totalDisplay', {
      defaultMessage: 'Total',
    }),
    description: i18n.translate(
      'agenticObservability.stylePanel.valueCalculation.totalDescription',
      {
        defaultMessage: 'Sum of all values',
      }
    ),
  },
];

export interface ValueCalculationSelectorProps {
  selectedValue: CalculationMethod;
  onChange?: (value: CalculationMethod) => void;
}

export const ValueCalculationSelector = ({
  selectedValue,
  onChange = () => {},
}: ValueCalculationSelectorProps) => {
  const options = useMemo(
    () =>
      VALUE_CALCULATION_OPTIONS.map(({ value, display, description }) => ({
        value,
        inputDisplay: display,
        dropdownDisplay: (
          <>
            <strong>{display}</strong>
            <EuiText size="s" color="subdued">
              <p className="ouiTextColor--subdued">{description}</p>
            </EuiText>
          </>
        ),
      })),
    []
  );

  return (
    <EuiSuperSelect
      compressed
      options={options}
      valueOfSelected={selectedValue}
      onChange={onChange}
      hasDividers
    />
  );
};
