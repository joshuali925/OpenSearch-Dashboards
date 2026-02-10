/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './resizable_vis_control_and_tabs.scss';

import React, { useRef } from 'react';
import { useObservable } from 'react-use';
import { useSelector } from 'react-redux';
import { i18n } from '@osd/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiTitle,
} from '@elastic/eui';
import { PanelDirection } from '@elastic/eui/src/components/resizable_container/types';

import { getVisualizationBuilder } from '../../../visualizations/visualization_builder';
import { AgenticObservabilityTabs } from '../../../tabs/tabs';
import { selectActiveTab } from '../../../../application/utils/state_management/selectors';
import { useOpenSearchDashboards } from '../../../../../../opensearch_dashboards_react/public';
import { useTabError } from '../../../../application/utils/hooks/use_tab_error';
import { AgenticObservabilityServices } from '../../../../types';
import { AGENTIC_OBSERVABILITY_VISUALIZATION_TAB_ID } from '../../../../../common';

export const ResizableVisControlAndTabs = () => {
  const { services } = useOpenSearchDashboards<AgenticObservabilityServices>();
  const visualizationTab = services.tabRegistry.getTab(AGENTIC_OBSERVABILITY_VISUALIZATION_TAB_ID);
  const visualizationTabError = useTabError(visualizationTab);
  const visualizationBuilder = getVisualizationBuilder();
  const data = useObservable(visualizationBuilder.data$);
  const activeTabId = useSelector(selectActiveTab);
  const collapseFn = useRef((id: string, direction: PanelDirection) => {});

  const onChange = (panelId: string) => {
    collapseFn.current(panelId, 'right');
  };

  if (activeTabId !== AGENTIC_OBSERVABILITY_VISUALIZATION_TAB_ID) {
    return <AgenticObservabilityTabs />;
  }

  // Do not display style panel if there are errors
  if (activeTabId === AGENTIC_OBSERVABILITY_VISUALIZATION_TAB_ID && !!visualizationTabError) {
    return <AgenticObservabilityTabs />;
  }

  return (
    <EuiResizableContainer style={{ height: '100%' }}>
      {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
        collapseFn.current = (id, direction: PanelDirection = 'left') =>
          togglePanel?.(id, { direction });
        return (
          <>
            <EuiResizablePanel
              id="agentic_observability_tabs"
              className="tabsPanel"
              initialSize={77.5}
              paddingSize="none"
            >
              <AgenticObservabilityTabs />
            </EuiResizablePanel>

            <EuiResizableButton />

            <EuiResizablePanel
              mode={['custom', { position: 'top' }]}
              id="vis_style_panel"
              className="visStylePanelOuter"
              initialSize={22.5}
              minSize="280px"
              paddingSize="none"
            >
              {Boolean(data) && (
                <div className="visStylePanelInner">
                  <EuiFlexGroup
                    className="visStylePanelTitle"
                    gutterSize="none"
                    justifyContent="spaceBetween"
                    alignItems="center"
                  >
                    <EuiFlexItem>
                      <EuiTitle size="xxs">
                        <p>
                          {i18n.translate('agenticObservability.visualization.stylePanel.title', {
                            defaultMessage: 'Settings',
                          })}
                        </p>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="text"
                        aria-label={'Toggle visualization style panel'}
                        iconType="menuRight"
                        onClick={() => onChange('vis_style_panel')}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {visualizationBuilder.renderStylePanel({ className: 'visStylePanelBody' })}
                </div>
              )}
            </EuiResizablePanel>
          </>
        );
      }}
    </EuiResizableContainer>
  );
};
