/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiPortalProps } from '@opensearch-project/oui/src/eui_components/portal/portal';
import { SearchBarExtension } from './search_bar_extension';
import { SearchBarExtensionConfig } from './search_bar_extensions_registry';

interface SearchBarExtensionsProps {
  configs: SearchBarExtensionConfig[];
  attachmentInsert: EuiPortalProps['insert'];
}

export const SearchBarExtensions: React.FC<SearchBarExtensionsProps> = (props) => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="center">
      {props.configs.map((config) => (
        <EuiFlexItem grow={false} key={config.id}>
          <SearchBarExtension config={config} attachmentInsert={props.attachmentInsert} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
