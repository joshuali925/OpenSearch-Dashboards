/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef } from 'react';
import { monaco } from '@osd/monaco';
import { splitPromQLQueries, ParsedQuery } from '../../../../application/utils/multi_query_utils';

type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;
type IModelDeltaDecoration = monaco.editor.IModelDeltaDecoration;

// Cache for dynamically created CSS rules to avoid duplicates
const createdCssRules = new Set<string>();

/**
 * Converts a label to a CSS-safe class name suffix
 * Commas are replaced with underscores since commas are class separators in HTML
 * Dots are replaced with 'x' to avoid CSS selector issues
 */
function labelToClassName(label: string): string {
  return label.replace(/,/g, '_').replace(/\./g, 'x');
}

/**
 * Ensures a CSS rule exists for the given label (creates it dynamically if needed)
 */
function ensureLabelCssRule(label: string): void {
  if (createdCssRules.has(label)) return;

  // Use CSS-safe class name (commas replaced with underscores)
  const className = labelToClassName(label);
  const cssRule = `.query-label-gutter--${className}::before { content: "${label}"; }`;

  // Find or create our style element
  let styleEl = document.getElementById('query-label-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'query-label-dynamic-styles';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent += cssRule + '\n';
  createdCssRules.add(label);
}

/**
 * Hook for managing multi-query gutter decorations in Monaco editor
 * Displays labels (A, B, C, ...) in the gutter for each query segment
 */
export const useMultiQueryDecorations = () => {
  // Store decoration IDs for cleanup
  const decorationIdsRef = useRef<string[]>([]);

  /**
   * Updates gutter decorations based on current editor content
   * Only applies for PROMQL language
   */
  const updateDecorations = useCallback(
    (editor: IStandaloneCodeEditor | null, language: string) => {
      if (!editor) return;

      // Only apply decorations for PROMQL
      if (language !== 'PROMQL') {
        // Clear any existing decorations
        if (decorationIdsRef.current.length > 0) {
          decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
        }
        return;
      }

      const model = editor.getModel();
      if (!model) return;

      const text = model.getValue();
      const queries = splitPromQLQueries(text);

      // If only one query, don't show label (cleaner UX)
      if (queries.length <= 1) {
        if (decorationIdsRef.current.length > 0) {
          decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
        }
        return;
      }

      // Group queries by their start line (Monaco can only show one glyph per line)
      const queriesByLine = new Map<number, ParsedQuery[]>();
      for (const query of queries) {
        const lineNum = query.startLine + 1; // Monaco lines are 1-indexed
        if (!queriesByLine.has(lineNum)) {
          queriesByLine.set(lineNum, []);
        }
        queriesByLine.get(lineNum)!.push(query);
      }

      // Create decorations - one per line with combined labels if needed
      // Dynamically creates CSS rules for any label combination
      const decorations: IModelDeltaDecoration[] = [];
      queriesByLine.forEach((lineQueries, lineNum) => {
        const labels = lineQueries.map((q) => q.label);
        const fullLabel = labels.join(',');
        // Truncate to "A,B" for 2 queries, or "A.." for 3+ queries
        const displayLabel =
          labels.length <= 2 ? fullLabel : `${labels[0]}..`;
        const hoverText =
          labels.length > 1 ? `Queries ${fullLabel}` : `Query ${labels[0]}`;

        // Ensure CSS rule exists for this label (creates dynamically if needed)
        ensureLabelCssRule(displayLabel);

        // Use CSS-safe class name (commas replaced with underscores, dots replaced)
        const className = labelToClassName(displayLabel);

        decorations.push({
          range: new monaco.Range(lineNum, 1, lineNum, 1),
          options: {
            glyphMarginClassName: `query-label-gutter query-label-gutter--${className}`,
            glyphMarginHoverMessage: { value: hoverText },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      });

      // Apply decorations
      decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
    },
    []
  );

  /**
   * Clears all decorations (for cleanup on unmount)
   */
  const clearDecorations = useCallback((editor: IStandaloneCodeEditor | null) => {
    if (!editor) return;

    if (decorationIdsRef.current.length > 0) {
      decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
    }
  }, []);

  return {
    updateDecorations,
    clearDecorations,
  };
};
