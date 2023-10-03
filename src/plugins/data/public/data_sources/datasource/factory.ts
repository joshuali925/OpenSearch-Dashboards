/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataSource } from '.';
import { DataSourceType } from '../datasource_services/types';

/**
 * The DataSourceFactory is responsible for managing the registration and creation of data source classes.
 * It serves as a registry for different data source types and provides a way to instantiate them.
 */

export class DataSourceFactory {
  // Holds the singleton instance of the DataSourceFactory.
  private static factory: DataSourceFactory;

  // A dictionary holding the data source type as the key and its corresponding class constructor as the value.
  private dataSources: {
    [key: string]: {
      dataSourceClass: new (config: any) => DataSource;
      dataSourceType: DataSourceType;
    };
  } = {};

  /**
   * Private constructor to ensure only one instance of DataSourceFactory is created.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of the DataSourceFactory. If it doesn't exist, it creates one.
   *
   * @returns {DataSourceFactory} The single instance of DataSourceFactory.
   */
  static getInstance(): DataSourceFactory {
    if (!this.factory) {
      this.factory = new DataSourceFactory();
    }
    return this.factory;
  }

  /**
   * Registers a new data source type with its associated class.
   * If the type has already been registered, an error is thrown.
   *
   * @param {DataSourceType} type - The identifier for the data source type.
   * @param {new (config: any) => DataSource} dataSourceClass - The constructor of the data source class.
   * @throws {Error} Throws an error if the data source type has already been registered.
   */
  registerDataSourceType(
    dataSourceType: DataSourceType,
    dataSourceClass: new (config: any) => DataSource
  ): void {
    if (this.dataSources[dataSourceType.key]) {
      throw new Error('This data source type has already been registered');
    }
    this.dataSources[dataSourceType.key] = {
      dataSourceClass,
      dataSourceType,
    };
  }

  /**
   * Creates and returns an instance of the specified data source type with the given configuration.
   * If the type hasn't been registered, an error is thrown.
   *
   * @param {string} key - The identifier for the data source type.
   * @param {any} config - The configuration for the data source instance.
   * @returns {DataSource} An instance of the specified data source type.
   * @throws {Error} Throws an error if the data source type is not supported.
   */
  getDataSourceInstance(key: string, config: any): DataSource {
    const dataSource = this.dataSources[key];
    if (!dataSource) {
      throw new Error('Unsupported data source type');
    }
    return new dataSource.dataSourceClass(config);
  }
}
