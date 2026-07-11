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

  // The builder works with source-less queries: the `source = <index>` clause is
  // owned by the dataset selector, hidden from the builder UI, and re-added by
  // the execution layer (`addPPLSourceClause`) at run time. parsePPL drops the
  // clause and keeps the rest as the builder's search expression.
  const initialParse = useMemo(() => parsePPL(reduxQuery), []); // eslint-disable-line react-hooks/exhaustive-deps

  // A query loaded from a saved object opens in code. It can still be switched
  // to Builder afterward when it is representable.
  const loadedFromSaved = !!savedSearch;
  const [mode, setMode] = useState<LogsBuilderMode>(() =>
    !loadedFromSaved && initialParse.canBuild ? 'builder' : 'code'
  );

  const [builderState, setBuilderState] = useState<PPLBuilderState>(initialParse.state);
  // Bumped whenever we re-seed builder state from a parse, so PPLBuilder remounts
  // and picks up the new initialState in its useReducer.
  const [builderKey, setBuilderKey] = useState(0);

  // Live code-editor text, tracked so the Builder toggle can enable/disable
  // itself as the user types in Code mode.
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
      // Code -> Builder: parse the LIVE editor text, not the last-run query, so
      // in-progress edits carry into the builder.
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

  // The Builder toggle is disabled when the current code text can't round-trip
  // into the builder (so the user can't switch to a mode that would lose it).
  const builderDisabled = mode === 'code' && !canSwitchToBuilder;

  const modeToggleTooltip = builderDisabled
    ? i18n.translate('explore.logsQueryPanel.cannotSwitchToBuilder', {
        defaultMessage:
          'This query cannot be represented in Builder mode. Simplify it or use Code mode.',
      })
    : undefined;

  const modeButtonOptions = useMemo(
    () =>
      logsModeButtons.map((btn) =>
        btn.id === 'builder' ? { ...btn, isDisabled: builderDisabled } : btn
      ),
    [builderDisabled]
  );

  const showBuilder = mode === 'builder' && !isPromptMode;

  const editors = (
    <div className="exploreQueryPanel__editorsWrapper">
      <QueryPanelEditor />
      <QueryPanelGeneratedQuery />
    </div>
  );

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
      <EuiFlexGroup
        className="exploreQueryPanel__widgetsRow"
        gutterSize="none"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem>
          <QueryPanelWidgets />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isPromptMode ? (
        editors
      ) : (
        <EuiFlexGroup
          className="exploreQueryPanel__contentRow"
          gutterSize="s"
          alignItems="flexStart"
          responsive={false}
        >
          <EuiFlexItem>
            {showBuilder ? (
              <PPLBuilder
                key={builderKey}
                initialState={builderState}
                onQueryChange={onBuilderChange}
              />
            ) : (
              editors
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
