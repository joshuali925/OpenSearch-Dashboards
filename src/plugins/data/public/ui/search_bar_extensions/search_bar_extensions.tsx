/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SearchBarExtension } from './search_bar_extension';
import { SearchBarExtensionConfig } from './search_bar_extensions_registry';

interface SearchBarExtensionsProps {
  configs: SearchBarExtensionConfig[];
  attachmentSibling: HTMLElement;
}

export const SearchBarExtensions: React.FC<SearchBarExtensionsProps> = (props) => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="center">
      {props.configs.map((config) => (
        <EuiFlexItem grow={false} key={config.id}>
          <SearchBarExtension config={config} attachmentSibling={props.attachmentSibling} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
