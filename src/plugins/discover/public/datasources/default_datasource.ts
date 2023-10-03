/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObject } from '../../../../core/types';
import { IndexPatternSavedObjectAttrs } from '../../../data/common/index_patterns/index_patterns';
import {
  DataSource,
  IDataSetParams,
  IDataSourceMetaData,
  IDataSourceQueryParams,
  IDataSourceQueryResult,
  IndexPatternsContract,
} from '../../../data/public';

interface DataSourceConfig<DataSourceMetaData extends IDataSourceMetaData = IDataSourceMetaData> {
  name: string;
  type: string;
  metadata: DataSourceMetaData;
  indexPatterns: IndexPatternsContract;
}

export class DefaultDslDataSource extends DataSource<
  IDataSourceMetaData,
  IDataSetParams,
  Promise<Array<SavedObject<IndexPatternSavedObjectAttrs>> | null | undefined>,
  IDataSourceQueryParams,
  IDataSourceQueryResult
> {
  private readonly indexPatterns;

  constructor({ name, type, metadata, indexPatterns }: DataSourceConfig) {
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

  async runQuery(queryParams: unknown) {
    return null;
  }
}
