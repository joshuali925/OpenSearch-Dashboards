/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { I18nProvider } from '@osd/i18n/react';
import React, { useEffect, useState } from 'react';
import { IndexPatternManagmentContext } from 'src/plugins/index_pattern_management/public';
import { useOpenSearchDashboards } from '../../../opensearch_dashboards_react/public';
import { ChangeIndexPattern, IndexPatternItem } from './change_index_pattern';

export interface IndexPatternSelectorProps {
  selectedId: string;
  onChange: (id: string) => void;
}

export function IndexPatternSelector({ selectedId, onChange }: IndexPatternSelectorProps) {
  const {
    data: { indexPatterns },
  } = useOpenSearchDashboards<IndexPatternManagmentContext>().services;

  const [indexPatternItems, updateIndexPatternItems] = useState<IndexPatternItem[]>([]);

  useEffect(() => {
    indexPatterns.getIdsWithTitle().then((list) => updateIndexPatternItems(list));
  }, [indexPatterns]);

  return (
    <div className="indexPatternSelector__container">
      <I18nProvider>
        <ChangeIndexPattern
          indexPatternItems={indexPatternItems}
          selectedId={selectedId}
          onChange={onChange}
        />
      </I18nProvider>
    </div>
  );
}
