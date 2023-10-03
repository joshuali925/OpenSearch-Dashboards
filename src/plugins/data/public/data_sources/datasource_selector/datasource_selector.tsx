/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import React from 'react';
import { DataSourceOptionType } from './types';

export const DataSourceSelector = ({
  dataSourceList,
  selectedOptions,
  onDataSourceChange,
  singleSelection = true,
}: {
  dataSourceList: DataSourceOptionType[];
  selectedOptions: DataSourceOptionType[];
  onDataSourceChange: (selectedDataSourceOptions: DataSourceOptionType[]) => void;
  singleSelection?: boolean;
}) => {
  const onDataSourceSelectionChange = (selectedDataSourceOptions: DataSourceOptionType[]) => {
    onDataSourceChange(selectedDataSourceOptions);
  };

  return (
    <EuiComboBox
      placeholder={i18n.translate('data.datasource.selectADatasource', {
        defaultMessage: 'Select a datasource',
      })}
      options={dataSourceList}
      selectedOptions={selectedOptions}
      onChange={onDataSourceSelectionChange}
      singleSelection={singleSelection}
      async
    />
  );
};
