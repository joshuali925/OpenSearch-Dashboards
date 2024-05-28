/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MountPoint } from 'opensearch-dashboards/public';
import React from 'react';

export interface SearchBarExtensionConfig {
  id: string;
  order: number;
  createMount: (toggleUiAttachment: () => void) => MountPoint;
  uiAttachment?: React.ReactNode;
}

export class SearchBarExtensionsRegistry {
  private readonly configs: SearchBarExtensionConfig[];

  constructor() {
    this.configs = [];
  }

  /** @public **/
  public register(config: SearchBarExtensionConfig) {
    if (this.configs.some((c) => c.id === config.id)) {
      throw new Error(`Search bar extension with id "${config.id}" already registered`);
    }
    this.configs.push(config);
  }

  /** @internal **/
  public getAll() {
    return this.configs;
  }

  /** @internal **/
  public clear() {
    this.configs.length = 0;
  }
}

export type SearchBarExtensionsRegistrySetup = Pick<SearchBarExtensionsRegistry, 'register'>;
