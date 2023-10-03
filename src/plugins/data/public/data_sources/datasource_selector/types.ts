/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { DataSource } from '../..';

export interface DataSourceGroup {
  label: string;
  options: DataSourceOption[];
}

export interface DataSourceOption {
  label: string;
  value: string;
}

export type DataSourceOptionType = EuiComboBoxOptionOption<unknown>;

export interface DataSourceSelectableProps {
  dataSources: DataSource[];
  dataSourceOptionList: DataSourceGroup[];
  selectedSources: DataSourceOption[];
  onDataSourceSelect: (dataSourceOption: DataSourceOption[]) => void;
  setDataSourceOptionList: (dataSourceList: DataSourceGroup[]) => void;
  singleSelection?: boolean | { asPlainText: boolean };
  onFetchDataSetError: (error: Error) => void;
}
