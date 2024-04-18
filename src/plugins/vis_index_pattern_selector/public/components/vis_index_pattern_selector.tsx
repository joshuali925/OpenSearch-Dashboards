/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { I18nProvider } from '@osd/i18n/react';
import React, { useCallback, useEffect, useState } from 'react';
import { IndexPattern } from 'src/plugins/data/public';
import { IndexPatternManagmentContext } from 'src/plugins/index_pattern_management/public';
import { useOpenSearchDashboards } from '../../../opensearch_dashboards_react/public';
import { ChangeIndexPattern, IndexPatternItem } from './change_indexpattern';

export interface VisIndexPatternSelectorProps {
  selectedIndexPattern?: IndexPattern;
  onChange: (indexPattern?: IndexPattern) => void;
}

export function VisIndexPatternSelector({
  selectedIndexPattern,
  onChange,
}: VisIndexPatternSelectorProps) {
  const { id: selectedId, title: selectedTitle } = selectedIndexPattern || {};

  // List of IndexPatterns
  const {
    data: { indexPatterns },
  } = useOpenSearchDashboards<IndexPatternManagmentContext>().services;

  const [indexPatternItems, updateIndexPatternItems] = useState<IndexPatternItem[]>([]);

  useEffect(() => {
    indexPatterns.getIdsWithTitle().then((list) => updateIndexPatternItems(list));
  }, [indexPatterns]);

  // Handle IndexPattern change
  const onChangeCallback = useCallback(
    async (id?: string) => {
      if (id === undefined) {
        onChange(undefined);
        return;
      }
      onChange(await indexPatterns.get(id));
    },
    [onChange, indexPatterns]
  );

  return (
    <div className="visIndexPatternSelector__container">
      <I18nProvider>
        <ChangeIndexPattern
          trigger={{
            title: selectedTitle,
            'data-test-subj': 'indexPatternSelector-switch-link',
            className: 'visIndexPatternSelector__triggerButton',
          }}
          indexPatternId={selectedId}
          indexPatternItems={indexPatternItems}
          onChange={onChangeCallback}
        />
      </I18nProvider>
    </div>
  );
}
