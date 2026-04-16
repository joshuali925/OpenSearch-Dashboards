/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './metrics_query_panel.scss';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiToolTip,
  DragDropContextProps,
} from '@elastic/eui';
import classNames from 'classnames';
import { monaco } from '@osd/monaco';
import {
  useOpenSearchDashboards,
  CodeEditor,
} from '../../../../../opensearch_dashboards_react/public';
import { DEFAULT_DATA } from '../../../../../data/common';
import { ExploreServices } from '../../../types';
import { QueryPanelWidgets } from '../../../components/query_panel/query_panel_widgets';
import { usePPLExecuteQueryAction } from '../../../components/query_panel/actions/ppl_execute_query_action';
import { useSetEditorTextWithQuery } from '../../../application/hooks';
import { useSetEditorText } from '../../../application/hooks/editor_hooks/use_set_editor_text/use_set_editor_text';
import {
  selectIsLoading,
  selectPromptToQueryIsLoading,
  selectQueryString,
} from '../../../application/utils/state_management/selectors';
import { setIsQueryEditorDirty } from '../../../application/utils/state_management/slices/query_editor/query_editor_slice';
import { PrometheusClient } from './explore/services/prometheus_client';
import { RootState } from '../../../application/utils/state_management/store';
import { splitMultiQueries } from '../../../application/utils/multi_query_utils';
import { getQueryLabel } from '../../../../../data/common';
import { PromQLBuilder, buildPromQL, parsePromQL } from './promql_builder';
import type { BuilderState } from './promql_builder';
import { queryEditorOptions } from '../../../components/query_panel/query_panel_editor/use_query_panel_editor/editor_options';
import '../../../components/query_panel/query_panel.scss';
import '../../../components/query_panel/query_panel_editor/query_panel_editor.scss';

type RowMode = 'builder' | 'code';

interface QueryRow {
  id: string;
  mode: RowMode;
  query: string;
  builderState: BuilderState | null;
}

const modeButtons = [
  { id: 'builder', label: 'Builder' },
  { id: 'code', label: 'Code' },
];

function initRows(queryString: string, nextId: () => string): QueryRow[] {
  const parsed = splitMultiQueries(queryString);
  if (parsed.length === 0) {
    const result = parsePromQL('');
    return [{ id: nextId(), mode: 'builder', query: '', builderState: result.state }];
  }
  return parsed.map((pq) => {
    const result = parsePromQL(pq.query);
    return {
      id: nextId(),
      mode: result.canBuild ? 'builder' : 'code',
      query: pq.query,
      builderState: result.canBuild ? result.state : null,
    };
  });
}

function joinRows(rows: QueryRow[]): string {
  const queries = rows.map((r) => r.query).filter((q) => q.trim());
  if (queries.length <= 1) return queries[0] || '';
  return queries.map((q) => `${q};`).join('\n');
}

export const MetricsQueryPanel: React.FC = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();
  const queryIsLoading = useSelector(selectIsLoading);
  const promptToQueryIsLoading = useSelector(selectPromptToQueryIsLoading);
  const isLoading = queryIsLoading || promptToQueryIsLoading;
  const dataConnectionId = useSelector((state: RootState) => state.query.dataset?.id || '');
  const reduxQuery = useSelector(selectQueryString);

  const setEditorText = useSetEditorText();
  const setEditorTextWithQuery = useSetEditorTextWithQuery();
  usePPLExecuteQueryAction(setEditorTextWithQuery);

  const client = useMemo(() => new PrometheusClient(services, dataConnectionId), [
    services,
    dataConnectionId,
  ]);

  const rowIdCounter = useRef(0);
  const nextRowId = useCallback(() => `row-${++rowIdCounter.current}`, []);

  const [rows, setRows] = useState<QueryRow[]>(() => initRows(reduxQuery, nextRowId));
  const lastDispatchedRef = useRef(reduxQuery);

  useEffect(() => {
    if (reduxQuery !== lastDispatchedRef.current) {
      lastDispatchedRef.current = reduxQuery;
      setRows(initRows(reduxQuery, nextRowId));
    }
  }, [reduxQuery, nextRowId]);

  // Sync draft text to the QueryStringManager (NOT Redux) on every keystroke so
  // that handleQuerySubmit in TopNav can read it via queryString.getQuery().query.
  // We intentionally avoid dispatching to Redux here — changing state.query.query
  // would shift the results cache key and make existing results disappear.
  // Redux is only updated at execution time (via runQueryActionCreator).
  const { queryString } = services.data.query;
  const syncEditorText = useCallback(
    (updatedRows: QueryRow[]) => {
      const combined = joinRows(updatedRows);
      lastDispatchedRef.current = combined;
      setEditorText(combined);
      const currentQuery = queryString.getQuery();
      queryString.setQuery({ ...currentQuery, query: combined });
      dispatch(setIsQueryEditorDirty(true));
    },
    [setEditorText, dispatch, queryString]
  );

  const updateRow = useCallback(
    (rowId: string, updates: Partial<QueryRow>) => {
      setRows((prev) => {
        const next = prev.map((r) => (r.id === rowId ? { ...r, ...updates } : r));
        syncEditorText(next);
        return next;
      });
    },
    [syncEditorText]
  );

  const onBuilderChange = useCallback(
    (rowId: string, query: string, builderState: BuilderState) => {
      updateRow(rowId, { query, builderState });
    },
    [updateRow]
  );

  const onCodeChange = useCallback(
    (rowId: string, query: string) => {
      updateRow(rowId, { query });
    },
    [updateRow]
  );

  const onModeChange = useCallback((rowId: string, newMode: RowMode) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (newMode === 'builder') {
          const result = parsePromQL(r.query);
          if (!result.canBuild) return r;
          return { ...r, mode: 'builder', builderState: result.state };
        }
        return { ...r, mode: 'code' };
      })
    );
  }, []);

  const addRow = useCallback(() => {
    const result = parsePromQL('');
    setRows((prev) => {
      const next = [
        ...prev,
        { id: nextRowId(), mode: 'builder' as RowMode, query: '', builderState: result.state },
      ];
      syncEditorText(next);
      return next;
    });
  }, [syncEditorText, nextRowId]);

  const removeRow = useCallback(
    (rowId: string) => {
      setRows((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((r) => r.id !== rowId);
        syncEditorText(next);
        return next;
      });
    },
    [syncEditorText]
  );

  // Drag-based reordering
  const onDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (!destination || source.index === destination.index) return;
      setRows((prev) => {
        const next = [...prev];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        syncEditorText(next);
        return next;
      });
    },
    [syncEditorText]
  );

  // PromQL suggestion provider for Code mode — register once globally to avoid
  // duplicate suggestions when multiple CodeEditor instances mount for the same language.
  const suggestionProviderRef = useRef<monaco.languages.CompletionItemProvider | null>(null);

  const suggestionProvider = useMemo((): monaco.languages.CompletionItemProvider => {
    const {
      data: { dataViews, query: queryService, autocomplete },
    } = services;
    const provider: monaco.languages.CompletionItemProvider = {
      triggerCharacters: [' ', '(', '{', '[', ',', '=', '~', '"', "'"],
      provideCompletionItems: async (model, position, _, token) => {
        if (token.isCancellationRequested) return { suggestions: [], incomplete: false };
        try {
          const currentDataset = queryService.queryString.getQuery().dataset;
          const currentDataView = await dataViews.get(
            currentDataset?.id!,
            currentDataset?.type !== DEFAULT_DATA.SET_TYPES.INDEX_PATTERN
          );
          const text = model.getValue();
          const offset = model.getOffsetAt(position);
          const suggestions = await autocomplete?.getQuerySuggestions({
            query: text,
            selectionStart: offset,
            selectionEnd: offset,
            language: 'PROMQL',
            baseLanguage: 'PROMQL',
            indexPattern: currentDataView,
            datasetType: currentDataset?.type,
            position,
            services: services as any,
          });
          const wordUntil = model.getWordUntilPosition(position);
          const range = new monaco.Range(
            position.lineNumber,
            wordUntil.startColumn,
            position.lineNumber,
            wordUntil.endColumn
          );
          return {
            suggestions: (suggestions?.filter((s: any) => 'detail' in s) || []).map((s: any) => ({
              label: s.text,
              kind: s.type as monaco.languages.CompletionItemKind,
              insertText: s.insertText ?? s.text,
              insertTextRules: s.insertTextRules ?? undefined,
              range,
              detail: s.detail,
              sortText: s.sortText,
              documentation: s.documentation ? { value: s.documentation, isTrusted: true } : '',
              command: { id: 'editor.action.triggerSuggest', title: 'Trigger Next Suggestion' },
            })),
            incomplete: false,
          };
        } catch {
          return { suggestions: [], incomplete: false };
        }
      },
    };
    suggestionProviderRef.current = provider;
    return provider;
  }, [services]);

  // Register the completion provider once globally for PROMQL
  useEffect(() => {
    if (!suggestionProviderRef.current) return;
    const disposable = monaco.languages.registerCompletionItemProvider(
      'PROMQL',
      suggestionProviderRef.current
    );
    return () => disposable.dispose();
  }, [suggestionProvider]);

  return (
    <EuiPanel paddingSize="s" borderRadius="none" className="exploreQueryPanel">
      <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <QueryPanelWidgets />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="queryRows" spacing="none">
          {rows.map((row, idx) => (
            <EuiDraggable
              key={row.id}
              index={idx}
              draggableId={row.id}
              customDragHandle={true}
              spacing="none"
              hasInteractiveChildren={true}
            >
              {(provided, snapshot) => (
                <QueryRowComponent
                  row={row}
                  label={getQueryLabel(idx)}
                  client={client}
                  onBuilderChange={onBuilderChange}
                  onCodeChange={onCodeChange}
                  onModeChange={onModeChange}
                  onRemove={removeRow}
                  canRemove={rows.length > 1}
                  isDragging={snapshot.isDragging}
                  dragHandleProps={provided.dragHandleProps}
                />
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>

      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        className="mqpAddQueryRow"
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" iconType="plusInCircle" onClick={addRow}>
            Add query
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

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

// --- Individual Query Row ---

interface QueryRowProps {
  row: QueryRow;
  label: string;
  client: PrometheusClient;
  onBuilderChange: (rowId: string, query: string, state: BuilderState) => void;
  onCodeChange: (rowId: string, query: string) => void;
  onModeChange: (rowId: string, mode: RowMode) => void;
  onRemove: (rowId: string) => void;
  canRemove: boolean;
  isDragging: boolean;
  dragHandleProps: any;
}

const QueryRowComponent: React.FC<QueryRowProps> = React.memo(
  ({
    row,
    label,
    client,
    onBuilderChange,
    onCodeChange,
    onModeChange,
    onRemove,
    canRemove,
    isDragging,
    dragHandleProps,
  }) => {
    const handleBuilderQueryChange = useCallback(
      (query: string) => {
        const result = parsePromQL(query);
        onBuilderChange(row.id, query, result.canBuild ? result.state : row.builderState!);
      },
      [row.id, row.builderState, onBuilderChange]
    );

    const canSwitchToBuilder =
      row.mode === 'builder' || !row.query || parsePromQL(row.query).canBuild;
    const builderTooltip =
      row.mode === 'code' && !canSwitchToBuilder
        ? 'This query cannot be represented in Builder mode. Simplify it or use Code mode.'
        : undefined;

    return (
      <div
        className={classNames('mqpQueryRow', { 'mqpQueryRow--dragging': isDragging })}
        data-test-subj={`queryRow-${label}`}
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" direction="column" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" className="mqpRowLabel">
                  {label}
                </EuiText>
              </EuiFlexItem>
              {canRemove && (
                <EuiFlexItem grow={false}>
                  <div {...dragHandleProps} aria-label="Drag to reorder" className="mqpDragHandle">
                    <EuiIcon type="grab" size="s" />
                  </div>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            {row.mode === 'builder' && row.builderState ? (
              <PromQLBuilder
                client={client}
                onQueryChange={handleBuilderQueryChange}
                initialState={row.builderState}
              />
            ) : (
              <div className="exploreQueryPanelEditor">
                <CodeEditor
                  languageId="PROMQL"
                  value={row.query}
                  onChange={(val) => onCodeChange(row.id, val)}
                  options={queryEditorOptions}
                  useLatestTheme
                  editorDidMount={(editor) => {
                    editor.onDidContentSizeChange(() => {
                      const contentHeight = editor.getContentHeight();
                      const maxHeight = 100;
                      const finalHeight = Math.min(contentHeight, maxHeight);
                      editor.layout({
                        width: editor.getLayoutInfo().width,
                        height: finalHeight,
                      });
                      editor.updateOptions({
                        scrollBeyondLastLine: false,
                        scrollbar: {
                          vertical: contentHeight > maxHeight ? 'visible' : 'hidden',
                        },
                      });
                    });
                  }}
                />
              </div>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={builderTooltip} position="top">
                  <EuiButtonGroup
                    legend={`Query ${label} mode`}
                    options={modeButtons}
                    idSelected={row.mode}
                    onChange={(id) => onModeChange(row.id, id as RowMode)}
                    buttonSize="compressed"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              {canRemove && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content="Remove query">
                    <EuiButtonIcon
                      iconType="cross"
                      color="text"
                      size="s"
                      aria-label="Remove query"
                      onClick={() => onRemove(row.id)}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);
