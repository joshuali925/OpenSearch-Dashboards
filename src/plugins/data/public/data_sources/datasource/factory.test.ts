/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndexPattern, IndexPatternsContract } from '../../index_patterns';
import { IDataSetParams, IDataSourceMetaData } from '.';
import { DataSourceType } from '../datasource_services/types';
import { DataSource } from './datasource';
import { DataSourceFactory } from './factory';

class MockDataSource extends DataSource {
  private readonly indexPatterns;

  constructor({
    name,
    type,
    metadata,
    indexPatterns,
  }: {
    name: string;
    type: string;
    metadata: IDataSourceMetaData;
    indexPatterns: IndexPatternsContract;
  }) {
    super(name, type, metadata);
    this.indexPatterns = indexPatterns;
  }

  async getDataSet(dataSetParams?: IDataSetParams) {
    await this.indexPatterns.ensureDefaultIndexPattern();
    return await this.indexPatterns.getCache();
  }

  async testConnection(): Promise<void> {
    throw new Error('This operation is not supported for this class.');
  }

  async runQuery(queryParams: any) {
    return null;
  }
}

const mockDataSourceType: DataSourceType = {
  key: 'mock',
  label: 'Mock Datasource',
  backendName: 'Mock',
};

describe('DataSourceFactory', () => {
  beforeEach(() => {
    // Reset the DataSourceFactory's singleton instance before each test for isolation
    (DataSourceFactory as any).factory = undefined;
  });

  it('returns a singleton instance', () => {
    const instance1 = DataSourceFactory.getInstance();
    const instance2 = DataSourceFactory.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('registers a new data source type correctly', () => {
    const factory = DataSourceFactory.getInstance();
    expect(() => {
      factory.registerDataSourceType(mockDataSourceType, MockDataSource);
    }).not.toThrow();
  });

  it('throws error when registering an already registered data source type', () => {
    const factory = DataSourceFactory.getInstance();
    factory.registerDataSourceType(mockDataSourceType, MockDataSource);
    expect(() => {
      factory.registerDataSourceType(mockDataSourceType, MockDataSource);
    }).toThrow('This data source type has already been registered');
  });

  it('creates and returns an instance of the registered data source type', () => {
    const factory = DataSourceFactory.getInstance();
    const mockIndexPattern = {} as IndexPattern;
    const config = {
      name: 'test_datasource',
      type: 'mock',
      metadata: null,
      indexPattern: mockIndexPattern,
    };
    factory.registerDataSourceType(mockDataSourceType, MockDataSource);

    const instance = factory.getDataSourceInstance('mock', config);
    expect(instance).toBeInstanceOf(MockDataSource);
    expect(instance.getName()).toEqual(config.name);
    expect(instance.getType()).toEqual(config.type);
    expect(instance.getMetadata()).toEqual(config.metadata);
  });

  it('throws error when trying to get an instance of an unregistered data source type', () => {
    const factory = DataSourceFactory.getInstance();
    expect(() => {
      factory.getDataSourceInstance('unregistered', {});
    }).toThrow('Unsupported data source type');
  });
});
