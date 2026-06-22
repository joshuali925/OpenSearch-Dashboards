/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EuiPage, EuiPageBody, EuiPageContentBody } from '@elastic/eui';
import { CoreStart } from '../../../../core/public';
import { useUiSetting$ } from '../../../opensearch_dashboards_react/public';
import { createOsUiConnection } from '../os_ui_client';
import { createOsdBridge } from '../host_bridge';
import { WidgetHost } from './widget_host';

interface AppProps {
  core: CoreStart;
}

/**
 * First-cut single-view app: mounts the `slo/list` widget end-to-end against
 * live data. Phase 7 generalizes this to a route per view.
 */
export const ObservabilityWidgetsApp: React.FC<AppProps> = ({ core }) => {
  // Reactively follow the OSD dark-mode toggle and apply the data-theme the
  // glass views read (replaces the iframe's applyDocumentTheme/detect-theme).
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const osUi = useMemo(() => createOsUiConnection(core.http), [core.http]);
  const bridge = useMemo(() => createOsdBridge({ application: core.application, osUi }), [
    core.application,
    osUi,
  ]);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContentBody>
          <div data-theme={darkMode ? 'dark' : 'light'}>
            <WidgetHost
              routeKey="slo/list"
              input={{
                narrative: '',
                suggestions: [],
              }}
              bridge={bridge}
              osUi={osUi}
            />
          </div>
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  );
};
