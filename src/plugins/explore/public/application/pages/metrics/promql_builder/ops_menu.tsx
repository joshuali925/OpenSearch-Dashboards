/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiFlexItem } from '@elastic/eui';
import { BuilderAction } from './build_promql';
import { OPERATION_CATEGORIES } from './operation_categories';
import { CategoryFunctionMenu } from '../../../components/query_builder';

interface OpsMenuProps {
  hasRange: boolean;
  dispatch: React.Dispatch<BuilderAction>;
}

export const OpsMenu: React.FC<OpsMenuProps> = ({ hasRange, dispatch }) => (
  <EuiFlexItem grow={false}>
    <CategoryFunctionMenu
      categories={OPERATION_CATEGORIES}
      onSelect={(item) =>
        dispatch({
          type: 'ADD_OPERATION',
          operation: { id: item.id, name: item.name, params: [...item.params] },
        })
      }
      // A metric without a range can gain one from here, ahead of the operations.
      extraRootItems={
        hasRange
          ? undefined
          : [
              {
                name: i18n.translate('explore.promqlBuilder.addRange', {
                  defaultMessage: 'Add range',
                }),
                onClick: () => dispatch({ type: 'SET_RANGE', range: '5m' }),
              },
            ]
      }
      trigger={{
        kind: 'icon',
        iconType: 'boxesVertical',
        ariaLabel: i18n.translate('explore.promqlBuilder.addOperation', {
          defaultMessage: 'Add operation',
        }),
      }}
      anchorPosition="downRight"
      panelClassName="cfmMenuPanel"
    />
  </EuiFlexItem>
);
