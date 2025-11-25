/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '../explore_page.scss';

import React, { useEffect } from 'react';
import { EuiErrorBoundary, EuiPage, EuiPageBody } from '@elastic/eui';
import { AppMountParameters, HeaderVariant } from 'opensearch-dashboards/public';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@osd/i18n';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';
import { QueryPanel } from '../../../components/query_panel';
import { useInitialQueryExecution } from '../../utils/hooks/use_initial_query_execution';
import { useUrlStateSync } from '../../utils/hooks/use_url_state_sync';
import { useTimefilterSubscription } from '../../utils/hooks/use_timefilter_subscription';
import { useHeaderVariants } from '../../utils/hooks/use_header_variants';
import { NewExperienceBanner } from '../../../components/experience_banners/new_experience_banner';
import { TopNav } from '../../../components/top_nav/top_nav';
import { useInitPage } from '../../../application/utils/hooks/use_page_initialization';
import {
  EXPLORE_LOGS_TAB_ID,
  EXPLORE_PATTERNS_TAB_ID,
  EXPLORE_VISUALIZATION_TAB_ID,
} from '../../../../common';
import { setActiveTab, setQueryWithHistory } from '../../utils/state_management/slices';
import { selectQuery } from '../../utils/state_management/selectors';
import { DataStructure } from '../../../../../data/common';
import { BottomRightContainer } from './metrics_bottom_container/bottom_right_container';

/**
 * Main application component for the Explore plugin
 */
export const MetricsPage: React.FC<Partial<Pick<AppMountParameters, 'setHeaderActionMenu'>>> = ({
  setHeaderActionMenu,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { savedExplore } = useInitPage();
  const { keyboardShortcut } = services;
  const dispatch = useDispatch();
  const currentQuery = useSelector(selectQuery);

  // Auto-select first Prometheus connection on page load
  useEffect(() => {
    const initializePrometheusDataset = async () => {
      // If loading a saved explore, don't auto-select
      if (savedExplore) {
        return;
      }

      // If current dataset is already Prometheus, don't change it
      if (currentQuery.dataset && currentQuery.dataset.type === 'PROMETHEUS') {
        return;
      }

      try {
        const datasetService = services.data.query.queryString.getDatasetService();
        const prometheusTypeConfig = datasetService.getType('PROMETHEUS');

        if (!prometheusTypeConfig) {
          return;
        }

        // Fetch Prometheus connections
        const prometheusRoot: DataStructure = {
          id: 'PROMETHEUS',
          title: 'Prometheus',
          type: 'PROMETHEUS',
        };
        const result = await prometheusTypeConfig.fetch(services as any, [prometheusRoot]);

        if (result.children && result.children.length > 0) {
          // Get the first Prometheus connection
          const firstConnection = result.children[0];
          const dataset = prometheusTypeConfig.toDataset([prometheusRoot, firstConnection]);

          // Cache the dataset first to ensure DataView is available
          await datasetService.cacheDataset(
            dataset,
            {
              uiSettings: services.uiSettings,
              savedObjects: services.savedObjects,
              notifications: services.notifications,
              http: services.http,
              data: services.data,
            },
            false
          );

          // Set it as the selected dataset with PromQL language
          const initialQuery = services.data.query.queryString.getInitialQueryByDataset(dataset);
          dispatch(setQueryWithHistory(initialQuery));
        }
      } catch (error) {
        // Silently fail - user can manually select a dataset
      }
    };

    initializePrometheusDataset();
  }, [currentQuery.dataset, savedExplore, services, dispatch]);

  keyboardShortcut?.useKeyboardShortcut({
    id: 'switchToLogsTabLogs',
    pluginId: 'explore',
    name: i18n.translate('explore.logsPage.switchToLogsTabShortcut', {
      defaultMessage: 'Switch to logs tab',
    }),
    category: i18n.translate('explore.logsPage.navigationCategory', {
      defaultMessage: 'Navigation',
    }),
    keys: 'shift+l',
    execute: () => dispatch(setActiveTab(EXPLORE_LOGS_TAB_ID)),
  });

  keyboardShortcut?.useKeyboardShortcut({
    id: 'switchToPatternsTabLogs',
    pluginId: 'explore',
    name: i18n.translate('explore.logsPage.switchToPatternsTabShortcut', {
      defaultMessage: 'Switch to patterns tab',
    }),
    category: i18n.translate('explore.logsPage.navigationCategory', {
      defaultMessage: 'Navigation',
    }),
    keys: 'shift+p',
    execute: () => dispatch(setActiveTab(EXPLORE_PATTERNS_TAB_ID)),
  });

  keyboardShortcut?.useKeyboardShortcut({
    id: 'switchToVisualizationTabLogs',
    pluginId: 'explore',
    name: i18n.translate('explore.logsPage.switchToVisualizationTabShortcut', {
      defaultMessage: 'Switch to visualization tab',
    }),
    category: i18n.translate('explore.logsPage.navigationCategory', {
      defaultMessage: 'Navigation',
    }),
    keys: 'shift+v',
    execute: () => dispatch(setActiveTab(EXPLORE_VISUALIZATION_TAB_ID)),
  });

  useInitialQueryExecution(services);
  useUrlStateSync(services);
  useTimefilterSubscription(services);
  useHeaderVariants(services, HeaderVariant.APPLICATION);

  return (
    <EuiErrorBoundary>
      <div className="mainPage">
        <EuiPage className="explore-layout" paddingSize="none" grow={false}>
          <EuiPageBody className="explore-layout__page-body">
            <TopNav setHeaderActionMenu={setHeaderActionMenu} savedExplore={savedExplore} />
            <NewExperienceBanner />

            <div className="dscCanvas__queryPanel">
              <QueryPanel />
            </div>

            {/* Main content area with resizable panels under QueryPanel */}
            <EuiPageBody className="explore-layout__canvas">
              <BottomRightContainer />
            </EuiPageBody>
          </EuiPageBody>
        </EuiPage>
      </div>
    </EuiErrorBoundary>
  );
};
