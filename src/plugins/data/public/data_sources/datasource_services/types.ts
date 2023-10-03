/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataSourceFactory } from '../datasource';
import { DataSourceService } from './datasource_service';

export interface IDataSourceFilters {
  names: string[];
}

export interface IDataSourceRegistrationResult {
  success: boolean;
  info: string;
}

export class DataSourceRegistrationError extends Error {
  success: boolean;
  info: string;
  constructor(message: string) {
    super(message);
    this.success = false;
    this.info = message;
  }
}

export interface DataSourceType {
  key: string;
  label: string;
  // name used in backend that will not be displayed on UI
  backendName: string;
}

export interface DataSourceStart {
  dataSourceService: DataSourceService;
  dataSourceFactory: DataSourceFactory;
}
