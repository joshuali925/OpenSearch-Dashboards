/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@osd/i18n';
import { monaco } from '@osd/monaco';
import { CodeEditor } from '../../../../../../opensearch_dashboards_react/public';
import { analyzeSearchExpression, findFilterRanges } from './search_completion';

/** Dedicated Monaco language id for the restricted PPL search-expression box. */
export const PPL_SEARCH_LANGUAGE_ID = 'pplSearchExpression';

let languageRegistered = false;
function ensureLanguageRegistered() {
  if (languageRegistered) return;
  languageRegistered = true;
  monaco.languages.register({ id: PPL_SEARCH_LANGUAGE_ID });
}

// Re-opens the suggestion widget immediately after an item is accepted, so that
// picking a field flows straight into value suggestions.
const RETRIGGER_COMMAND: monaco.languages.CompletionItem['command'] = {
  id: 'editor.action.triggerSuggest',
  title: 'Suggest',
};

interface SearchBoxProps {
  /** Current search-expression text (the source of truth for the row). */
  value: string;
  /** All dataset field names, for field-name autocomplete. */
  fieldNames: string[];
  /** Fetch value suggestions for a field (lazy). Resolves to display strings. */
  onRequestValues: (field: string) => Promise<string[]>;
  /** Commit the edited search-expression text. */
  onChange: (text: string) => void;
}

/**
 * Datadog-style single-line search box for the PPL `search` command's
 * <search-expression>. Reuses the shared Monaco {@link CodeEditor} (the same
 * widget as the code editor) and drives its native suggestion dropdown with a
 * grammar-based analysis ({@link analyzeSearchExpression}) so fields, values,
 * operators, and `AND`/`OR`/`NOT`/`IN` are suggested only where the search
 * grammar permits them. The text is the row's source of truth (parsed into the
 * PPL query upstream).
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  fieldNames,
  onRequestValues,
  onChange,
}) => {
  const fieldNamesRef = useRef(fieldNames);
  fieldNamesRef.current = fieldNames;
  const onRequestValuesRef = useRef(onRequestValues);
  onRequestValuesRef.current = onRequestValues;

  // Monaco editor instance + the decoration ids currently applied, so each
  // committed `field=value` filter can be boxed (see updateFilterBoxes).
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  // Pending deferred suggestion-trigger (cursor moves; see handleEditorDidMount).
  const suggestTimerRef = useRef<number | undefined>(undefined);

  // Draw / refresh a colored box around every complete filter in the expression,
  // so the user reads the query as a set of discrete `field=value` conditions.
  const updateFilterBoxes = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    if (!model) return;
    const text = model.getValue();
    const decorations: monaco.editor.IModelDeltaDecoration[] = findFilterRanges(text).map(
      ({ start, end }) => ({
        range: new monaco.Range(1, start + 1, 1, end + 1),
        options: {
          inlineClassName: 'plqSearchBoxEditor__filter',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      })
    );
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
  }, []);

  // Programmatically open the native suggestion widget. Monaco treats this as a
  // no-op refresh when the widget is already showing, so it is safe to call on
  // every relevant event.
  const triggerSuggest = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editor.trigger('pplSearchBox', 'editor.action.triggerSuggest', {});
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      updateFilterBoxes(editor);

      // Keep suggestions available at all times: re-open the widget after any
      // content change (typing, delete/backspace) and after the caret moves by
      // an explicit user action (click, arrow keys). This shows the widget even
      // when there is nothing to complete (it renders "No suggestions.").
      editor.onDidChangeModelContent(() => {
        updateFilterBoxes(editor);
        triggerSuggest(editor);
      });
      editor.onDidChangeCursorPosition((e) => {
        const userMove =
          e.reason === monaco.editor.CursorChangeReason.Explicit ||
          e.source === 'mouse' ||
          e.source === 'keyboard';
        if (!userMove) return;
        // Defer past Monaco's own mousedown handling — a click otherwise opens
        // then immediately cancels the widget. A 0ms timer re-opens it after.
        window.clearTimeout(suggestTimerRef.current);
        suggestTimerRef.current = window.setTimeout(() => triggerSuggest(editor), 0);
      });
    },
    [updateFilterBoxes, triggerSuggest]
  );

  // Clear any pending deferred trigger on unmount.
  useEffect(() => () => window.clearTimeout(suggestTimerRef.current), []);

  // Re-box whenever the committed value changes (edits, autocomplete, mode toggles).
  useEffect(() => {
    if (editorRef.current) updateFilterBoxes(editorRef.current);
  }, [value, updateFilterBoxes]);

  // Also re-box synchronously on each keystroke so boxes track live typing.
  const handleChange = useCallback(
    (text: string) => {
      onChange(text);
      if (editorRef.current) updateFilterBoxes(editorRef.current);
    },
    [onChange, updateFilterBoxes]
  );

  ensureLanguageRegistered();

  const provideCompletionItems = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): Promise<monaco.languages.CompletionList> => {
      const text = model.getValue();
      // Monaco columns are 1-based; our analyzer uses 0-based char offsets.
      const cursor = position.column - 1;
      const analysis = analyzeSearchExpression(text, cursor);

      const range = new monaco.Range(
        position.lineNumber,
        analysis.replaceStart + 1,
        position.lineNumber,
        analysis.replaceEnd + 1
      );

      const suggestions: monaco.languages.CompletionItem[] = [];

      if (analysis.suggestFields) {
        for (const name of fieldNamesRef.current) {
          suggestions.push({
            label: name,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: i18n.translate('explore.pplBuilder.searchBox.fieldDetail', {
              defaultMessage: 'Field',
            }),
            // Accepting a field auto-completes `=` (no surrounding spaces) and
            // re-triggers the suggestion widget so the value dropdown opens.
            insertText: `${name}=`,
            range,
            sortText: `2_${name}`,
            command: RETRIGGER_COMMAND,
          });
        }
      }

      if (analysis.suggestValuesForField) {
        try {
          const values = await onRequestValuesRef.current(analysis.suggestValuesForField);
          for (const v of values) {
            // Quote values containing whitespace or special characters.
            const needsQuote = /[\s"'()=<>!,]/.test(v) || v === '';
            const insert = needsQuote ? `"${v.replace(/"/g, '\\"')}"` : v;
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              detail: i18n.translate('explore.pplBuilder.searchBox.valueDetail', {
                defaultMessage: 'Value',
              }),
              // Accepting a value appends a trailing space and re-triggers the
              // widget so the next suggestion (AND/OR/NOT) opens automatically.
              insertText: `${insert} `,
              range,
              sortText: `0_${v}`,
              command: RETRIGGER_COMMAND,
            });
          }
        } catch {
          // Value suggestions are best-effort.
        }
      }

      for (const kw of analysis.keywords) {
        const isBoolean = kw === 'AND' || kw === 'OR' || kw === 'NOT' || kw === 'IN';
        suggestions.push({
          label: kw,
          kind: isBoolean
            ? monaco.languages.CompletionItemKind.Keyword
            : monaco.languages.CompletionItemKind.Operator,
          detail: isBoolean
            ? i18n.translate('explore.pplBuilder.searchBox.keywordDetail', {
                defaultMessage: 'Keyword',
              })
            : i18n.translate('explore.pplBuilder.searchBox.operatorDetail', {
                defaultMessage: 'Operator',
              }),
          insertText: kw,
          range,
          sortText: `1_${kw}`,
        });
      }

      return { suggestions };
    },
    []
  );

  const suggestionProvider = useMemo<monaco.languages.CompletionItemProvider>(
    () => ({
      // Re-trigger on the operators / space / quote that begin a new token.
      triggerCharacters: [' ', '=', '!', '>', '<', '(', ',', '"', "'"],
      provideCompletionItems,
    }),
    [provideCompletionItems]
  );

  const options = useMemo<monaco.editor.IEditorConstructionOptions>(
    () => ({
      lineNumbers: 'off',
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 0,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      wrappingIndent: 'none',
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      renderLineHighlight: 'none',
      scrollbar: { vertical: 'hidden', horizontal: 'hidden', horizontalScrollbarSize: 0 },
      fontSize: 12,
      lineHeight: 18,
      fixedOverflowWidgets: true,
      suggest: { showWords: false },
    }),
    []
  );

  return (
    <div className="plqSearchBoxEditor" data-test-subj="pplBuilderSearchBox">
      <CodeEditor
        height={20}
        languageId={PPL_SEARCH_LANGUAGE_ID}
        value={value}
        onChange={handleChange}
        options={options}
        suggestionProvider={suggestionProvider}
        editorDidMount={handleEditorDidMount}
        triggerSuggestOnFocus
      />
    </div>
  );
};
