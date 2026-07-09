/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiFieldSearch,
  EuiInputPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiHighlight,
} from '@elastic/eui';
import { activeTokenAt } from './search_syntax';

interface SearchBoxProps {
  /** Current search-box text (a view over the committed filters). */
  value: string;
  /** All dataset field names, for `field:` autocomplete. */
  fieldNames: string[];
  /** Value suggestions for the field currently being edited. */
  valueSuggestions: string[];
  valueLoading: boolean;
  /** Commit the whole search text (parsed into filters upstream). */
  onChange: (text: string) => void;
  /** Ask for value suggestions for a field (lazy-loaded). */
  onRequestValues: (field: string, queryText: string) => void;
}

type SuggestionKind = 'field' | 'value' | null;

/**
 * Datadog-style single-line search box with field/value autocomplete. The text
 * is the source of truth for the search row; suggestions replace only the token
 * under the caret. Mirrors the metrics builder's reliance on `data.autocomplete`
 * for value suggestions, but presented as one free-text bar instead of pills.
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  fieldNames,
  valueSuggestions,
  valueLoading,
  onChange,
  onRequestValues,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [caret, setCaret] = useState(0);

  const active = useMemo(() => activeTokenAt(value, caret), [value, caret]);

  const kind: SuggestionKind = useMemo(() => {
    if (active.field !== undefined) return 'value';
    if (active.fieldPartial !== undefined) return 'field';
    return null;
  }, [active]);

  const options = useMemo<EuiSelectableOption[]>(() => {
    if (kind === 'field') {
      const partial = (active.fieldPartial || '').toLowerCase();
      return fieldNames
        .filter((f) => f.toLowerCase().includes(partial))
        .slice(0, 50)
        .map((f) => ({ label: f, key: `field:${f}` }));
    }
    if (kind === 'value') {
      const partial = (active.valuePartial || '').toLowerCase();
      return valueSuggestions
        .filter((v) => v.toLowerCase().includes(partial))
        .slice(0, 50)
        .map((v) => ({ label: v, key: `value:${v}` }));
    }
    return [];
  }, [kind, active, fieldNames, valueSuggestions]);

  // Replace the active token's relevant segment with the picked suggestion,
  // preserving the rest of the query and any leading `field:` / operator prefix.
  const applySuggestion = useCallback(
    (picked: string) => {
      let replacement: string;
      let insertEnd: number;
      if (kind === 'field') {
        replacement = `${picked}:`;
        insertEnd = active.end;
      } else {
        // Keep everything up to and including the operator, replace the value.
        const colonRel = active.raw.indexOf(':');
        const head = active.raw.slice(0, colonRel + 1);
        const rhs = active.raw.slice(colonRel + 1);
        const opMatch = rhs.match(/^(>=|<=|!=|>|<|~)/);
        const opPrefix = opMatch ? opMatch[1] : '';
        const needsQuote = /[\s":]/.test(picked) || picked === '';
        const valueText = needsQuote ? `"${picked.replace(/"/g, '\\"')}"` : picked;
        replacement = `${head}${opPrefix}${valueText}`;
        insertEnd = active.end;
      }
      const next = `${value.slice(0, active.start)}${replacement}${value.slice(insertEnd)}`;
      onChange(next);
      const newCaret = active.start + replacement.length;
      setCaret(newCaret);
      // Restore focus + caret after the popover-driven re-render.
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(newCaret, newCaret);
        }
      });
      // A field pick should immediately offer values for that field.
      if (kind === 'field') {
        onRequestValues(picked, '');
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    },
    [kind, active, value, onChange, onRequestValues]
  );

  const syncCaretAndSuggest = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? el.value.length;
    setCaret(pos);
    const tok = activeTokenAt(el.value, pos);
    if (tok.field !== undefined) {
      onRequestValues(tok.field, tok.valuePartial || '');
      setIsOpen(true);
    } else if (tok.fieldPartial !== undefined) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [onRequestValues]);

  const input = (
    <EuiFieldSearch
      inputRef={(el) => (inputRef.current = el)}
      compressed
      fullWidth
      isClearable
      value={value}
      placeholder={i18n.translate('explore.pplBuilder.searchBoxPlaceholder', {
        defaultMessage: 'Search: field:value or free text (e.g. status:>=500 error)',
      })}
      onChange={(e) => {
        onChange(e.target.value);
        // Defer caret read until the DOM value has updated.
        requestAnimationFrame(syncCaretAndSuggest);
      }}
      onClick={syncCaretAndSuggest}
      onKeyUp={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') syncCaretAndSuggest();
      }}
      onFocus={syncCaretAndSuggest}
      data-test-subj="pplBuilderSearchBox"
    />
  );

  const showList = isOpen && kind !== null && (options.length > 0 || valueLoading);

  return (
    <EuiInputPopover
      fullWidth
      input={input}
      isOpen={showList}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      disableFocusTrap
      data-test-subj="pplBuilderSearchBoxPopover"
    >
      <EuiSelectable
        singleSelection
        options={options}
        isLoading={valueLoading && options.length === 0}
        listProps={{ showIcons: false, bordered: false }}
        onChange={(opts) => {
          const chosen = opts.find((o) => o.checked === 'on');
          if (chosen?.label) applySuggestion(chosen.label);
        }}
        renderOption={(option, searchText) => (
          <EuiHighlight search={searchText}>{option.label}</EuiHighlight>
        )}
      >
        {(list) => <div className="plqSearchSuggest">{list}</div>}
      </EuiSelectable>
    </EuiInputPopover>
  );
};
