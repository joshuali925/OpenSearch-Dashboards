/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useSelector, useDispatch } from 'react-redux';
import { isEqual } from 'lodash';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';
import { RootState } from '../../../application/utils/state_management/store';
import type { AppDispatch } from '../../../application/utils/state_management/store';
import { runQueryActionCreator } from '../../../application/utils/state_management/actions/query_editor/run_query/run_query';
import { setHasUserInitiatedQuery } from '../../../application/utils/state_management/slices/query_editor/query_editor_slice';
import { clearLastExecutedData } from '../../../application/utils/state_management/slices';
import { setActiveTab } from '../../../application/utils/state_management/slices/ui/ui_slice';
import { setMetricsExploreState } from '../../../application/utils/state_management/slices/tab/tab_slice';
import { useSetEditorText } from '../../../application/hooks/editor_hooks/use_set_editor_text/use_set_editor_text';
import { ExplorationLevel, ExplorationState } from './types';
import { PrometheusClient } from './prometheus_client';
import { MetricQueryGenerator } from './query_generator';
import { ExplorationContext, defaultState, explorationReducer } from './exploration_context';
import { ExploreBreadcrumbs } from './breadcrumbs';
import { MetricBrowser } from './metric_browser';
import { MetricDetail } from './metric_detail';
import { LabelBreakdown } from './label_breakdown';

export const MetricsExploreTab = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const reduxDispatch: AppDispatch = useDispatch();
  const queryState = useSelector((state: RootState) => state.query);
  const savedTabState = useSelector((state: RootState) => state.tab.metricsExplore);
  const hasUserInitiatedQuery = useSelector(
    (state: RootState) => state.queryEditor.hasUserInitiatedQuery
  );
  const dataConnectionId = queryState.dataset?.id || '';

  // Initialize from Redux (which was loaded from URL) or default
  const initialState = useMemo(
    () =>
      savedTabState ? ({ ...defaultState, ...savedTabState } as ExplorationState) : defaultState,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // only on mount
  );
  const [state, dispatch] = useReducer(explorationReducer, initialState);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const setEditorText = useSetEditorText();
  const queryGenRef = useRef(new MetricQueryGenerator());

  const client = useMemo(() => {
    return new PrometheusClient(services, dataConnectionId);
  }, [services, dataConnectionId]);

  // Sync local state → Redux (for URL persistence)
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (!isEqual(prevStateRef.current, state)) {
      prevStateRef.current = state;
      reduxDispatch(
        setMetricsExploreState({
          level: state.level,
          search: state.search,
          metric: state.metric,
          label: state.label,
          filters: state.filters,
          grouping: state.grouping,
        })
      );
    }
  }, [state, reduxDispatch]);

  // Restore from Redux on browser back/forward (URL → Redux → here)
  useEffect(() => {
    if (savedTabState && !isEqual(savedTabState, prevStateRef.current)) {
      dispatch({ type: 'RESTORE', state: savedTabState });
    }
  }, [savedTabState]);

  // Handle query bar refresh button
  const prevHasQueryRef = useRef(hasUserInitiatedQuery);
  useEffect(() => {
    if (hasUserInitiatedQuery && !prevHasQueryRef.current) {
      client.clearCache();
      setRefreshCounter((c) => c + 1);
    }
    prevHasQueryRef.current = hasUserInitiatedQuery;
  }, [hasUserInitiatedQuery, client]);

  // Cancel pending queries when navigation level changes
  const prevLevelRef = useRef(state.level);
  useEffect(() => {
    if (prevLevelRef.current !== state.level) {
      prevLevelRef.current = state.level;
      client.cancelPendingQueries();
    }
  }, [state.level, client]);

  // Abort client on unmount
  useEffect(() => {
    return () => client.abort();
  }, [client]);

  const executePromQL = useCallback(
    (promql: string) => {
      setEditorText(promql);
      reduxDispatch(setActiveTab('metrics'));
      reduxDispatch(setHasUserInitiatedQuery(true));
      reduxDispatch(clearLastExecutedData());
      reduxDispatch(runQueryActionCreator(services, promql));
    },
    [reduxDispatch, services, setEditorText]
  );

  function renderContent() {
    switch (state.level) {
      case ExplorationLevel.DETAIL:
        return <MetricDetail />;
      case ExplorationLevel.BREAKDOWN:
        return <LabelBreakdown />;
      default:
        return <MetricBrowser />;
    }
  }

  return (
    <ExplorationContext.Provider
      value={{
        state,
        dispatch,
        client,
        queryGen: queryGenRef.current,
        executePromQL,
        refreshCounter,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 0' }}>
        <ExploreBreadcrumbs />
        <EuiSpacer size="s" />
        {renderContent()}
      </div>
    </ExplorationContext.Provider>
  );
};
