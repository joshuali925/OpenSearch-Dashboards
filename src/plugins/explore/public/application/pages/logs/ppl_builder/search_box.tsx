/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@osd/i18n';
import { monaco } from '@osd/monaco';
import { CodeEditor } from '../../../../../../opensearch_dashboards_react/public';
import { analyzeSearchExpression } from './search_completion';

/** Dedicated Monaco language id for the restricted PPL search-expression box. */
export const PPL_SEARCH_LANGUAGE_ID = 'pplSearchExpression';

let languageRegistered = false;
function ensureLanguageRegistered() {
  if (languageRegistered) return;
  languageRegistered = true;
  monaco.languages.register({ id: PPL_SEARCH_LANGUAGE_ID });
}

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
            insertText: name,
            range,
            sortText: `2_${name}`,
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
              insertText: insert,
              range,
              sortText: `0_${v}`,
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
        onChange={onChange}
        options={options}
        suggestionProvider={suggestionProvider}
        triggerSuggestOnFocus
      />
    </div>
  );
};
