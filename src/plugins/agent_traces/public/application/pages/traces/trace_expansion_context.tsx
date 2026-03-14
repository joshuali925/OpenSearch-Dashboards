/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { BaseRow, LoadingState } from './hooks/tree_utils';

export interface RowMeta {
  level: number;
  isExpandable: boolean;
  traceRow: BaseRow;
}

export interface TraceExpansionState {
  toggleExpansion: (e: React.MouseEvent, id: string, traceId: string) => void;
  getRowMeta: (hitId: string) => RowMeta | null;
  onRowClick?: (hitId: string) => void;
  wrapCellText?: boolean;
  hasExpandableRows?: boolean;
}

const TraceExpansionContext = createContext<TraceExpansionState | null>(null);

export const TraceExpansionProvider = TraceExpansionContext.Provider;

export const useTraceExpansion = (): TraceExpansionState | null => {
  return useContext(TraceExpansionContext);
};

/**
 * Lightweight external store for expansion state (expandedRows + traceLoadingState).
 *
 * Lives outside React so updating it does NOT trigger a React context
 * re-render.  Only components that subscribe via `useSyncExternalStore`
 * re-render — typically just the expand/collapse arrow cells.
 */
type Listener = () => void;

export interface ExpansionSnapshot {
  expandedRows: Set<string>;
  traceLoadingState: Map<string, LoadingState>;
}

const createExpansionStore = () => {
  let snapshot: ExpansionSnapshot = {
    expandedRows: new Set(),
    traceLoadingState: new Map(),
  };
  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => snapshot,
    setExpandedRows(rows: Set<string>) {
      snapshot = { ...snapshot, expandedRows: rows };
      listeners.forEach((l) => l());
    },
    setTraceLoadingState(state: Map<string, LoadingState>) {
      snapshot = { ...snapshot, traceLoadingState: state };
      listeners.forEach((l) => l());
    },
    reset() {
      snapshot = { expandedRows: new Set(), traceLoadingState: new Map() };
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
};

export const expansionStore = createExpansionStore();

/** Subscribe to the expansion store snapshot. Only components calling this re-render on expansion changes. */
export const useExpansionSnapshot = (): ExpansionSnapshot => {
  return useSyncExternalStore(expansionStore.subscribe, expansionStore.getSnapshot);
};

/** Subscribe to a single node's expanded state — returns a boolean.
 *  Only re-renders when THIS node's expansion actually changes. */
export const useIsExpanded = (id: string): boolean => {
  return useSyncExternalStore(
    expansionStore.subscribe,
    () => expansionStore.getSnapshot().expandedRows.has(id)
  );
};

/** Subscribe to a single trace's loading state — returns a boolean.
 *  Only re-renders when THIS trace's loading flag actually changes. */
export const useIsTraceLoading = (traceId: string): boolean => {
  return useSyncExternalStore(
    expansionStore.subscribe,
    () => !!expansionStore.getSnapshot().traceLoadingState.get(traceId)?.loading
  );
};
