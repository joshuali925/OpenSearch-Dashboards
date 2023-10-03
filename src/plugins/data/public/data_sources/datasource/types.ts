/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataSource } from '.';
import { IndexPattern } from '../../index_patterns';

export interface IDataSourceMetaData {
  name: string;
}

export interface IDataSourceGroup {
  name: string;
}

export interface ISourceDataSet {
  ds: DataSource;
  data_sets: string[] | IndexPattern;
}

// to-dos: add common interfaces for datasource
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDataSetParams {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDataSourceQueryParams {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDataSourceQueryResult {}

export interface ConnectionStatus {
  success: boolean;
  info: string;
}
