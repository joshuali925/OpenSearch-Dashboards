/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useSelector } from 'react-redux';
import { useOpenSearchDashboards } from '../../../../../../../opensearch_dashboards_react/public';
import { CanvasPanel } from '../../../../../components/panel/canvas_panel';
import { ExploreServices } from '../../../../../types';
import { useDatasetContext } from '../../../../context';
import { LoadingSpinner } from '../../../../legacy/discover/application/components/loading_spinner/loading_spinner';
import { DiscoverNoIndexPatterns } from '../../../../legacy/discover/application/components/no_index_patterns/no_index_patterns';
import { DiscoverNoResults } from '../../../../legacy/discover/application/components/no_results/no_results';
import { defaultPrepareQueryString } from '../../../../utils/state_management/actions/query_actions';
import { selectQueryStatusMapByKey } from '../../../../utils/state_management/selectors';
import { RootState } from '../../../../utils/state_management/store';
import { QueryExecutionStatus } from '../../../../utils/state_management/types';
import { ResizableVisControlAndTabs } from './resizable_vis_control_and_tabs';

export const BottomRightContainer = () => {
  const { dataset } = useDatasetContext();
  const { services } = useOpenSearchDashboards<ExploreServices>();

  const query = useSelector((state: RootState) => state.query);
  const status = useSelector((state: RootState) => {
    return state.queryEditor.overallQueryStatus.status || QueryExecutionStatus.UNINITIALIZED;
  });
  const dataTableStatus = useSelector((state: RootState) => {
    return selectQueryStatusMapByKey(state, defaultPrepareQueryString(query))?.status;
  });

  if (dataset == null) {
    return (
      <CanvasPanel>
        <>
          <EuiSpacer size="xxl" />
          <DiscoverNoIndexPatterns />
        </>
      </CanvasPanel>
    );
  }

  if (status === QueryExecutionStatus.NO_RESULTS) {
    return (
      <CanvasPanel>
        <DiscoverNoResults
          queryString={services?.data?.query?.queryString}
          query={services?.data?.query?.queryString?.getQuery()}
          savedQuery={services?.data?.query?.savedQueries}
          timeFieldName={dataset.timeFieldName}
        />
      </CanvasPanel>
    );
  }

  // In UNINITIALIZED state, always show tabs so the Explore tab can render its content.
  // The Explore tab is the default (order 5) and shows the metrics browser.
  // Other tabs will show the "Start searching" empty state inside the tab panel
  // (handled by ExploreTabs component checking query status).
  if (status === QueryExecutionStatus.UNINITIALIZED) {
    return (
      <CanvasPanel>
        <ResizableVisControlAndTabs />
      </CanvasPanel>
    );
  }

  if (status === QueryExecutionStatus.LOADING && dataTableStatus === QueryExecutionStatus.LOADING) {
    return (
      <CanvasPanel>
        <LoadingSpinner />
      </CanvasPanel>
    );
  }

  if (
    dataTableStatus === QueryExecutionStatus.READY ||
    dataTableStatus === QueryExecutionStatus.ERROR ||
    status === QueryExecutionStatus.READY ||
    status === QueryExecutionStatus.ERROR
  ) {
    return (
      <>
        <CanvasPanel>
          <ResizableVisControlAndTabs />
        </CanvasPanel>
      </>
    );
  }

  return null;
};
