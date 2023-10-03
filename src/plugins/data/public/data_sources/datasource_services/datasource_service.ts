/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { forEach, isEmpty } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { DataSource } from '../datasource';
import {
  DataSourceRegistrationError,
  IDataSourceFilters,
  IDataSourceRegistrationResult,
} from './types';

export class DataSourceService {
  private static dataSourceService: DataSourceService;
  // A record to store all registered data sources, using the data source name as the key.
  private dataSources: Record<string, DataSource> = {};
  private _dataSourcesSubject: BehaviorSubject<Record<string, DataSource>>;

  private constructor() {
    this._dataSourcesSubject = new BehaviorSubject(this.dataSources);
  }

  static getInstance(): DataSourceService {
    if (!this.dataSourceService) {
      this.dataSourceService = new DataSourceService();
    }
    return this.dataSourceService;
  }

  /**
   * Register multiple data sources at once.
   *
   * @param datasources - An array of data sources to be registered.
   * @returns An array of registration results, one for each data source.
   */
  async registerMultipleDataSources(
    datasources: DataSource[]
  ): Promise<IDataSourceRegistrationResult[]> {
    return Promise.all(datasources.map((ds) => this.registerDataSource(ds)));
  }

  /**
   * Register a single data source.
   * Throws an error if a data source with the same name is already registered.
   *
   * @param ds - The data source to be registered.
   * @returns A registration result indicating success or failure.
   * @throws {DataSourceRegistrationError} Throws an error if a data source with the same name already exists.
   */
  async registerDataSource(ds: DataSource): Promise<IDataSourceRegistrationResult> {
    const dsName = ds.getName();
    if (dsName in this.dataSources) {
      throw new DataSourceRegistrationError(
        `Unable to register datasource ${dsName}, error: datasource name exists.`
      );
    } else {
      this.dataSources = {
        ...this.dataSources,
        [dsName]: ds,
      };
      this._dataSourcesSubject.next(this.dataSources);
      return { success: true, info: '' } as IDataSourceRegistrationResult;
    }
  }

  public get dataSources$() {
    return this._dataSourcesSubject.asObservable();
  }

  /**
   * Retrieve the registered data sources based on provided filters.
   * If no filters are provided, all registered data sources are returned.
   *
   * @param filters - An optional object with filter criteria (e.g., names of data sources).
   * @returns A record of filtered data sources.
   */
  getDataSources(filters?: IDataSourceFilters): Record<string, DataSource> {
    if (!filters || isEmpty(filters.names)) return this.dataSources;
    const filteredDataSources: Record<string, DataSource> = {};
    forEach(filters.names, (dsName) => {
      if (dsName in this.dataSources) {
        filteredDataSources[dsName] = this.dataSources[dsName];
      }
    });
    return filteredDataSources;
  }
}
