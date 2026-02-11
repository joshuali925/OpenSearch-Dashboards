/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '../agentic_observability_page.scss';

import React from 'react';
import { EuiErrorBoundary, EuiPage, EuiPageBody } from '@elastic/eui';
import { AppMountParameters, HeaderVariant } from 'opensearch-dashboards/public';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgenticObservabilityServices } from '../../../types';
import { QueryPanel } from '../../../components/query_panel';
import { useInitialQueryExecution } from '../../utils/hooks/use_initial_query_execution';
import { useUrlStateSync } from '../../utils/hooks/use_url_state_sync';
import { useTimefilterSubscription } from '../../utils/hooks/use_timefilter_subscription';
import { useHeaderVariants } from '../../utils/hooks/use_header_variants';
import { BottomContainer } from '../../../components/container/bottom_container';
import { TopNav } from '../../../components/top_nav/top_nav';
import { useInitPage } from '../../../application/utils/hooks/use_page_initialization';
import { TraceFlyout } from './trace_flyout/trace_flyout';
import { TraceFlyoutProvider } from './trace_flyout/trace_flyout_context';

/**
 * Main application component for the Agentic Observability plugin
 * @experimental
 */
export const TracesPage: React.FC<Partial<Pick<AppMountParameters, 'setHeaderActionMenu'>>> = ({
  setHeaderActionMenu,
}) => {
  const { services } = useOpenSearchDashboards<AgenticObservabilityServices>();
  const { savedAgenticObservability } = useInitPage();

  useInitialQueryExecution(services);
  useUrlStateSync(services);
  useTimefilterSubscription(services);
  useHeaderVariants(services, HeaderVariant.APPLICATION);

  return (
    <EuiErrorBoundary>
      <TraceFlyoutProvider>
        <div className="mainPage">
          <EuiPage className="agenticObs-layout" paddingSize="none" grow={false}>
            <EuiPageBody className="agenticObs-layout__page-body">
              <TopNav
                setHeaderActionMenu={setHeaderActionMenu}
                savedAgenticObservability={savedAgenticObservability}
              />

              <div className="dscCanvas__queryPanel">
                <QueryPanel />
              </div>

              <BottomContainer />
            </EuiPageBody>
          </EuiPage>
        </div>
        <TraceFlyout />
      </TraceFlyoutProvider>
    </EuiErrorBoundary>
  );
};
