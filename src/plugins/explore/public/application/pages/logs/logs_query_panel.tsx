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
import { useEditorRef, useEditorText, useSetEditorTextWithQuery } from '../../../application/hooks';
import { useSetEditorText } from '../../../application/hooks/editor_hooks/use_set_editor_text/use_set_editor_text';
import {
  selectIsLoading,
  selectIsPromptEditorMode,
  selectPromptToQueryIsLoading,
  selectQueryString,
  selectSavedSearch,
} from '../../../application/utils/state_management/selectors';
import { setIsQueryEditorDirty } from '../../../application/utils/state_management/slices/query_editor/query_editor_slice';
import { PPLBuilder, PPLBuilderState, parsePPL } from './ppl_builder';
import { LogsBuilderMode, logsModeButtons } from './logs_query_panel_mode';
import '../../../components/query_panel/query_panel.scss';

/**
 * Logs query panel with a PPL visual builder / code toggle. Gated behind the
 * `explore:enableLogsQueryBuilder` UI setting; the plain `QueryPanel` is used
 * otherwise.
 *
 * The QueryStringManager draft (NOT Redux) is the working source of truth while
 * editing — mirroring `MetricsQueryPanel`. Builder edits deliberately do NOT
 * dispatch `setQueryState`, because the Redux query string is the results
 * cacheKey (see `useTabResults`): mutating it per keystroke re-keys the results
 * and makes the table/histogram appear empty until the next run. Results should
 * only change when the user actually runs a query.
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

  const editorRef = useEditorRef();
  const getEditorText = useEditorText();
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

  // A query loaded from a saved object opens in code (plan decision 6). It can
  // still be switched to Builder when it is representable (issue #4).
  const loadedFromSaved = !!savedSearch;
  const [mode, setMode] = useState<LogsBuilderMode>(() =>
    !loadedFromSaved && initialParse.canBuild ? 'builder' : 'code'
  );

  const [builderState, setBuilderState] = useState<PPLBuilderState>(initialParse.state);
  // Bumped whenever we re-seed builder state from a parse, so PPLBuilder remounts
  // and picks up the new initialState in its useReducer.
  const [builderKey, setBuilderKey] = useState(0);

  // Live code-editor text, tracked so the Builder toggle can enable/disable
  // itself as the user types in Code mode (issue #4).
  const [liveCodeText, setLiveCodeText] = useState(reduxQuery);

  // The builder's most recent built query. Used to seed the code editor when
  // toggling Builder -> Code WITHOUT pushing to Redux (which would re-key
  // results). Also updated from external query changes.
  const builderQueryRef = useRef(reduxQuery);
  // Text to push into the code editor once it mounts after a Builder -> Code
  // toggle (the shared editor otherwise mounts with the last-run Redux query).
  const pendingCodeSeedRef = useRef<string | null>(null);

  const lastDispatchedRef = useRef(reduxQuery);
  // Mirror of `mode` for use inside the external-sync effect without adding
  // `mode` to its deps (a mode toggle must NOT re-run external-sync logic —
  // that would wrongly treat the in-progress builder draft as an external
  // change and reset it).
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Reflect external query changes (dataset switch, saved-query load, AI, or a
  // cleared/new search) into the builder. We never auto-flip Code -> Builder on
  // a normal run (that is the user's choice via the toggle); we only force Code
  // when a query in Builder mode becomes unrepresentable, and return to Builder
  // on a cleared/fresh query.
  useEffect(() => {
    if (reduxQuery === lastDispatchedRef.current) return;
    lastDispatchedRef.current = reduxQuery;
    builderQueryRef.current = reduxQuery;
    setLiveCodeText(reduxQuery);

    const parsed = parsePPL(reduxQuery);
    const isEmptyBuilder =
      parsed.canBuild &&
      parsed.state.searchExpression.trim() === '' &&
      parsed.state.aggregations.length === 0;

    if (isEmptyBuilder) {
      // A cleared / fresh query returns to Builder.
      setBuilderState(parsed.state);
      setBuilderKey((k) => k + 1);
      setMode('builder');
      return;
    }

    if (modeRef.current === 'builder') {
      if (parsed.canBuild) {
        setBuilderState(parsed.state);
        setBuilderKey((k) => k + 1);
      } else {
        setMode('code');
      }
    }
    // In Code mode we stay in Code; the toggle stays available when canBuild.
  }, [reduxQuery]);

  // Keep builder output in the QueryStringManager (NOT Redux) so TopNav's submit
  // reads it via queryString.getQuery().query — mirrors MetricsQueryPanel and
  // keeps the results cacheKey stable so results don't disappear while editing.
  const onBuilderChange = useCallback(
    (query: string, state: PPLBuilderState) => {
      setBuilderState(state);
      builderQueryRef.current = query;
      if (query === lastDispatchedRef.current) return;
      lastDispatchedRef.current = query;
      setEditorText(query);
      const currentQuery = queryString.getQuery();
      queryString.setQuery({ ...currentQuery, query });
      dispatch(setIsQueryEditorDirty(true));
    },
    [setEditorText, dispatch, queryString]
  );

  // Track the live code text (for the toggle) and seed the editor with the
  // builder draft on a Builder -> Code toggle. Uses rAF to wait for the shared
  // editor instance to mount (same approach as the metrics AI-clear path).
  useEffect(() => {
    if (mode !== 'code' || isPromptMode) return;
    let rafId = 0;
    let disposable: { dispose: () => void } | undefined;
    const attach = () => {
      const editor = editorRef.current;
      if (editor) {
        const seed = pendingCodeSeedRef.current;
        if (seed !== null) {
          pendingCodeSeedRef.current = null;
          if (editor.getValue() !== seed) setEditorText(seed);
          setLiveCodeText(seed);
        } else {
          setLiveCodeText(editor.getValue());
        }
        disposable = editor.onDidChangeModelContent(() => setLiveCodeText(editor.getValue()));
        return;
      }
      rafId = requestAnimationFrame(attach);
    };
    attach();
    return () => {
      cancelAnimationFrame(rafId);
      disposable?.dispose();
    };
  }, [mode, isPromptMode, editorRef, setEditorText]);

  // The Builder toggle is enabled whenever the live code text is representable.
  const canSwitchToBuilder = useMemo(() => parsePPL(liveCodeText).canBuild, [liveCodeText]);

  const handleModeChange = useCallback(
    (id: string) => {
      const newMode = id as LogsBuilderMode;
      if (newMode === mode) return;
      if (newMode === 'code') {
        // Carry the builder's current text into the code editor on mount.
        pendingCodeSeedRef.current = builderQueryRef.current;
        setMode('code');
        return;
      }
      // Code -> Builder: parse the LIVE editor text (issue #4).
      const text = getEditorText() || liveCodeText;
      const parsed = parsePPL(text);
      if (!parsed.canBuild) return;
      builderQueryRef.current = text;
      setBuilderState(parsed.state);
      setBuilderKey((k) => k + 1);
      setMode('builder');
    },
    [mode, getEditorText, liveCodeText]
  );

  const modeToggleTooltip =
    mode === 'code' && !canSwitchToBuilder
      ? i18n.translate('explore.logsQueryPanel.cannotSwitchToBuilder', {
          defaultMessage:
            'This query cannot be represented in Builder mode. Simplify it or use Code mode.',
        })
      : undefined;

  const modeButtonOptions = useMemo(
    () =>
      logsModeButtons.map((btn) =>
        btn.id === 'builder' ? { ...btn, isDisabled: mode === 'code' && !canSwitchToBuilder } : btn
      ),
    [mode, canSwitchToBuilder]
  );

  const showBuilder = mode === 'builder' && !isPromptMode;

  const modeToggle = !isPromptMode ? (
    <EuiToolTip content={modeToggleTooltip} position="top">
      <EuiButtonGroup
        legend={i18n.translate('explore.logsQueryPanel.queryModeLabel', {
          defaultMessage: 'Query builder mode',
        })}
        options={modeButtonOptions}
        idSelected={mode}
        onChange={handleModeChange}
        buttonSize="compressed"
        data-test-subj="logsQueryPanelModeToggle"
      />
    </EuiToolTip>
  ) : null;

  return (
    <EuiPanel paddingSize="s" borderRadius="none" className="exploreQueryPanel">
      <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <QueryPanelWidgets />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isPromptMode ? (
        <div className="exploreQueryPanel__editorsWrapper">
          <QueryPanelEditor />
          <QueryPanelGeneratedQuery />
        </div>
      ) : (
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
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
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{modeToggle}</EuiFlexItem>
        </EuiFlexGroup>
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
