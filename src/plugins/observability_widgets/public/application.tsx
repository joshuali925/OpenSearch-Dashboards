/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRoot } from 'react-dom/client';
import { AppMountParameters, CoreStart } from '../../../core/public';
import { OpenSearchDashboardsContextProvider } from '../../opensearch_dashboards_react/public';
import { ObservabilityWidgetsServices } from './types';
import { ObservabilityWidgetsApp } from './components/app';

// Side-effect import: the vendored glass theme (scoped under .mcp-apps-root).
import '@osd/mcp-apps-ui';

export const renderApp = (
  core: CoreStart,
  services: ObservabilityWidgetsServices,
  { element }: AppMountParameters
) => {
  const root = createRoot(element);
  root.render(
    <OpenSearchDashboardsContextProvider services={services}>
      <core.i18n.Context>
        <ObservabilityWidgetsApp core={core} />
      </core.i18n.Context>
    </OpenSearchDashboardsContextProvider>
  );

  return () => root.unmount();
};
