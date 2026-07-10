/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@osd/i18n';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiToolTip,
} from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../types';
import { QueryPanelWidgets } from '../../../components/query_panel/query_panel_widgets';
import { QueryPanelEditor } from '../../../components/query_panel/query_panel_editor';
import { QueryPanelGeneratedQuery } from '../../../components/query_panel/query_panel_generated_query';
import { usePPLExecuteQueryAction } from '../../../components/query_panel/actions/ppl_execute_query_action';
import { useSetEditorTextWithQuery } from '../../../application/hooks';
import { useSetEditorText } from '../../../application/hooks/editor_hooks/use_set_editor_text/use_set_editor_text';
import {
  selectIsLoading,
  selectIsPromptEditorMode,
  selectPromptToQueryIsLoading,
  selectQueryString,
  selectSavedSearch,
} from '../../../application/utils/state_management/selectors';
import { setIsQueryEditorDirty } from '../../../application/utils/state_management/slices/query_editor/query_editor_slice';
import { setQueryState } from '../../../application/utils/state_management/slices';
import { PPLBuilder, PPLBuilderState, parsePPL } from './ppl_builder';
import { LogsBuilderMode, logsModeButtons } from './logs_query_panel_mode';
import '../../../components/query_panel/query_panel.scss';

/**
 * Logs query panel with a PPL visual builder / code toggle. Gated behind the
 * `explore:enableLogsQueryBuilder` UI setting; the plain `QueryPanel` is used
 * otherwise. The PPL string in Redux is the single source of truth — builder
 * state is derived via `parsePPL` and serialized back via the builder's
 * `buildPPL` (see plan decisions 1, 5, 6).
 */
export const LogsQueryPanel: React.FC = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();
  const queryIsLoading = useSelector(selectIsLoading);
  const promptToQueryIsLoading = useSelector(selectPromptToQueryIsLoading);
  const isLoading = queryIsLoading || promptToQueryIsLoading;
  const isPromptMode = useSelector(selectIsPromptEditorMode);
  const reduxQuery = useSelector(selectQueryString);
  const savedSearch = useSelector(selectSavedSearch);

  const setEditorTextWithQuery = useSetEditorTextWithQuery();
  const setEditorText = useSetEditorText();
  usePPLExecuteQueryAction(setEditorTextWithQuery);

  const { queryString } = services.data.query;

  // Source prefix (e.g. `source = logs`) is owned by the dataset selector; the
  // builder only appends the trailing pipes. Prefer the parsed prefix from the
  // current query, falling back to the dataset's initial query.
  const initialParse = useMemo(() => parsePPL(reduxQuery), []); // eslint-disable-line react-hooks/exhaustive-deps

  const sourcePrefix = useMemo(() => {
    if (initialParse.sourcePrefix) return initialParse.sourcePrefix;
    const dataset = queryString.getQuery().dataset;
    if (dataset) {
      const initial = queryString.getInitialQueryByDataset(dataset);
      const parsedInitial = parsePPL(String(initial.query || ''));
      return parsedInitial.sourcePrefix || String(initial.query || '');
    }
    return '';
  }, [initialParse.sourcePrefix, queryString]);

  // A query loaded from a saved object opens in code and can't switch to builder
  // (plan decision 6). Otherwise default to builder when the query is parseable.
  const loadedFromSaved = !!savedSearch;
  const [mode, setMode] = useState<LogsBuilderMode>(() =>
    !loadedFromSaved && initialParse.canBuild ? 'builder' : 'code'
  );
  // Once a query has been edited in code this session, the builder is locked
  // for that query (plan decision 5: builder->code is one-way in-session).
  const [builderLocked, setBuilderLocked] = useState<boolean>(loadedFromSaved);

  const [builderState, setBuilderState] = useState<PPLBuilderState>(initialParse.state);
  // Bumped whenever we re-seed builder state from a parse, so PPLBuilder remounts
  // and picks up the new initialState in its useReducer.
  const [builderKey, setBuilderKey] = useState(0);

  const lastDispatchedRef = useRef(reduxQuery);

  // Reflect external query changes (dataset switch, saved-query load, AI, or a
  // cleared/new search) back into the builder when possible.
  useEffect(() => {
    if (reduxQuery === lastDispatchedRef.current) return;
    lastDispatchedRef.current = reduxQuery;
    if (loadedFromSaved) return; // saved queries always stay in code (decision 6)

    const parsed = parsePPL(reduxQuery);
    const isEmptyBuilder =
      parsed.canBuild &&
      parsed.state.searchExpression.trim() === '' &&
      parsed.state.aggregations.length === 0;

    if (isEmptyBuilder) {
      // A cleared / fresh query returns to Builder and releases the code lock
      // (fixes staying stuck in Code with a "cannot represent" tooltip after a
      // New search).
      setBuilderLocked(false);
      setBuilderState(parsed.state);
      setBuilderKey((k) => k + 1);
      setMode('builder');
    } else if (parsed.canBuild && !builderLocked) {
      setBuilderState(parsed.state);
      setBuilderKey((k) => k + 1);
      setMode('builder');
    } else if (!parsed.canBuild) {
      setMode('code');
    }
  }, [reduxQuery, builderLocked, loadedFromSaved]);

  // Sync builder output to the QueryStringManager (not Redux) so TopNav's submit
  // reads it via queryString.getQuery().query — mirrors MetricsQueryPanel.
  const onBuilderChange = useCallback(
    (query: string, state: PPLBuilderState) => {
      setBuilderState(state);
      if (query === lastDispatchedRef.current) return;
      lastDispatchedRef.current = query;
      setEditorText(query);
      const currentQuery = queryString.getQuery();
      queryString.setQuery({ ...currentQuery, query });
      // Also push into Redux so the (Redux-seeded) code editor mounts with this
      // text on toggle and the query persists to the URL for refresh survival.
      // setQueryState carries no history entry and doesn't trigger execution.
      dispatch(setQueryState({ ...currentQuery, query }));
      dispatch(setIsQueryEditorDirty(true));
    },
    [setEditorText, dispatch, queryString]
  );

  const parsedReduxQuery = useMemo(() => parsePPL(reduxQuery), [reduxQuery]);
  const canSwitchToBuilder = !builderLocked && parsedReduxQuery.canBuild;

  const handleModeChange = useCallback(
    (id: string) => {
      const newMode = id as LogsBuilderMode;
      if (newMode === 'code') {
        // Switching to code locks the builder for this query.
        setBuilderLocked(true);
        setMode('code');
      } else if (canSwitchToBuilder) {
        setBuilderState(parsedReduxQuery.state);
        setBuilderKey((k) => k + 1);
        setMode('builder');
      }
    },
    [canSwitchToBuilder, parsedReduxQuery]
  );

  // The toggle back to Builder is disabled for two distinct reasons: the query
  // isn't representable in Builder, or Builder was locked after editing in Code
  // (one-way for the session). Explain whichever applies.
  let modeToggleTooltip: string | undefined;
  if (!canSwitchToBuilder) {
    modeToggleTooltip =
      builderLocked && parsedReduxQuery.canBuild
        ? i18n.translate('explore.logsQueryPanel.builderLocked', {
            defaultMessage:
              'Builder mode is unavailable after editing the query in Code. Start a new search to use Builder.',
          })
        : i18n.translate('explore.logsQueryPanel.cannotSwitchToBuilder', {
            defaultMessage:
              'This query cannot be represented in Builder mode. Simplify it or use Code mode.',
          });
  }

  const showBuilder = mode === 'builder' && !isPromptMode;

  return (
    <EuiPanel paddingSize="s" borderRadius="none" className="exploreQueryPanel">
      <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <QueryPanelWidgets />
        </EuiFlexItem>
        {!isPromptMode && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={modeToggleTooltip} position="top">
              <EuiButtonGroup
                legend={i18n.translate('explore.logsQueryPanel.queryModeLabel', {
                  defaultMessage: 'Query builder mode',
                })}
                options={logsModeButtons}
                idSelected={mode}
                onChange={handleModeChange}
                buttonSize="compressed"
                data-test-subj="logsQueryPanelModeToggle"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {showBuilder ? (
        <PPLBuilder
          key={builderKey}
          sourcePrefix={sourcePrefix}
          initialState={builderState}
          onQueryChange={onBuilderChange}
        />
      ) : (
        <div className="exploreQueryPanel__editorsWrapper">
          <QueryPanelEditor />
          <QueryPanelGeneratedQuery />
        </div>
      )}

      {isLoading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          data-test-subj="exploreQueryPanelIsLoading"
        />
      )}
    </EuiPanel>
  );
};
