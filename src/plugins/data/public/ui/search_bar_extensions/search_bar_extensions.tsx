/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  SearchBarExtension,
  SearchBarExtensionConfig,
  SearchBarExtensionDependencies,
} from './search_bar_extension';

interface SearchBarExtensionsProps {
  configs?: SearchBarExtensionConfig[];
  dependencies: SearchBarExtensionDependencies;
}

export const SearchBarExtensions: React.FC<SearchBarExtensionsProps> = (props) => {
  if (!props.configs) return null;

  return (
    <>
      {props.configs.map((config) => (
        <SearchBarExtension key={config.id} config={config} dependencies={props.dependencies} />
      ))}
    </>
  );
};
