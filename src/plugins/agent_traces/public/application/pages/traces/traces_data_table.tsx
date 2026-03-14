/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { FormattedMessage } from '@osd/i18n/react';
import { DataTable } from '../../../components/data_table/data_table';
import { AGENT_TRACES_DEFAULT_COLUMNS } from '../../../../common';
import { DocViewFilterFn, OpenSearchSearchHit } from '../../../types/doc_views_types';
import { TraceExpansionProvider, RowMeta, expansionStore } from './trace_expansion_context';
import { useTraceFlyout } from './flyout/trace_flyout_context';
import { BaseRow, LoadingState, buildFullSpanTree, hitsToAgentSpans } from './hooks/tree_utils';
import { transformPPLDataToTraceHits } from './trace_details/traces/ppl_to_trace_hits';
import { usePPLQueryDeps } from './hooks/use_ppl_query_deps';
import { TraceRow } from './hooks/tree_utils';
import {
  TableLoadingState,
  TableEmptyState,
  useDataTableCore,
  hitToBaseRow,
  DataTableInfoBar,
} from './table_shared';
import { getHitId } from '../../../components/data_table/table_cell/trace_utils/trace_utils';
import './traces_table.scss';

const DEFAULT_TRACE_COLUMNS = [...AGENT_TRACES_DEFAULT_COLUMNS];

/** Create a synthetic OpenSearchSearchHit from a BaseRow — cached so the same
 *  BaseRow always returns the same object reference (preserves React.memo). */
const hitCache = new WeakMap<BaseRow, OpenSearchSearchHit<Record<string, any>>>();
const traceRowToHit = (row: BaseRow): OpenSearchSearchHit<Record<string, any>> => {
  let hit = hitCache.get(row);
  if (!hit) {
    hit = { _index: '', _id: row.spanId, _score: null, _source: row.rawDocument || {} };
    hitCache.set(row, hit);
  }
  return hit;
};

export const TracesDataTable: React.FC = () => {
  const {
    dataset,
    results,
    hits,
    isQueryLoading,
    isInitialized,
    traceMetrics,
    formatTs,
    sortOrder,
    handleSortChange,
    displayedColumns,
    onRemoveColumn,
    onAddColumn,
    hasHead,
    onAddFilter,
    docViewsRegistry,
    sampleSize,
    wrapCellText,
    setWrapCellText,
  } = useDataTableCore({ defaultColumns: DEFAULT_TRACE_COLUMNS });

  const { pplService, datasetParam } = usePPLQueryDeps();
  const { openFlyout, updateFlyoutFullTree } = useTraceFlyout();

  // Build row metadata map from hits
  const rowMetaMap = useMemo(() => {
    const map = new Map<string, RowMeta>();
    hits.forEach((hit) => {
      const traceRow = hitToBaseRow(hit, formatTs, { markExpandable: true });
      map.set(getHitId(hit), {
        level: traceRow.level || 0,
        isExpandable: !!traceRow.isExpandable,
        traceRow,
      });
    });
    return map;
  }, [hits, formatTs]);

  // Tree expansion state — expandedRows drives visibleRows computation,
  // and is also synced to the external store so cell components can
  // subscribe without triggering context re-renders.
  const [expandedRows, setExpandedRowsRaw] = useState<Set<string>>(new Set());
  const expandedRowsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync after React commits — safe in concurrent mode.
  useLayoutEffect(() => {
    expandedRowsRef.current = expandedRows;
  }, [expandedRows]);

  // Wrapper that syncs React state + external store.
  // The external store is updated synchronously inside the updater so that
  // useSyncExternalStore subscribers and the React state update are processed
  // in the same render batch (React 18 automatic batching).
  const setExpandedRows = useCallback(
    (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setExpandedRowsRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        expansionStore.setExpandedRows(next);
        return next;
      });
    },
    []
  );

  const [childMetaMap, setChildMetaMap] = useState<Map<string, Map<string, RowMeta>>>(new Map());
  const [traceLoadingState, setTraceLoadingStateRaw] = useState<Map<string, LoadingState>>(
    new Map()
  );

  // Wrapper that syncs React state + external store
  const setTraceLoadingState = useCallback(
    (updater: (prev: Map<string, LoadingState>) => Map<string, LoadingState>) => {
      setTraceLoadingStateRaw((prev) => {
        const next = updater(prev);
        expansionStore.setTraceLoadingState(next);
        return next;
      });
    },
    []
  );
  const inFlightRef = useRef<Set<string>>(new Set());
  const traceSpansCacheRef = useRef<Map<string, BaseRow[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const flyoutTraceIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Merged meta map: O(1) lookup combining root and all child metadata.
  // Stored in a ref so getRowMeta callback stays stable.
  const mergedMetaRef = useRef(new Map<string, RowMeta>());
  const mergedMeta = useMemo(() => {
    const merged = new Map<string, RowMeta>(rowMetaMap);
    childMetaMap.forEach((childMap) => {
      childMap.forEach((meta, key) => merged.set(key, meta));
    });
    return merged;
  }, [rowMetaMap, childMetaMap]);
  mergedMetaRef.current = mergedMeta;

  // Abort in-flight fetches on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Reset tree expansion and caches when hits change (e.g. sort re-query)
  useEffect(() => {
    abortControllerRef.current?.abort();
    setExpandedRows(new Set());
    setChildMetaMap(new Map());
    setTraceLoadingState(() => new Map());
    traceSpansCacheRef.current.clear();
    inFlightRef.current.clear();
  }, [hits, setExpandedRows, setTraceLoadingState]);

  // Sync full tree to flyout when child data changes
  useEffect(() => {
    const traceId = flyoutTraceIdRef.current;
    if (!traceId) return;
    const cached = traceSpansCacheRef.current.get(traceId);
    if (cached) {
      updateFlyoutFullTree(cached as TraceRow[], false);
    }
  }, [childMetaMap, updateFlyoutFullTree]);

  // Show error state in flyout when fetch fails
  useEffect(() => {
    const traceId = flyoutTraceIdRef.current;
    if (!traceId) return;
    const loadState = traceLoadingState.get(traceId);
    if (loadState && !loadState.loading && loadState.error) {
      updateFlyoutFullTree(undefined, false, loadState.error);
    }
  }, [traceLoadingState, updateFlyoutFullTree]);

  const expandTrace = useCallback(
    async (traceId: string) => {
      if (traceSpansCacheRef.current.has(traceId)) return;
      if (inFlightRef.current.has(traceId)) return;
      if (!pplService || !datasetParam) return;

      inFlightRef.current.add(traceId);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setTraceLoadingState((prev) => {
        const next = new Map(prev);
        next.set(traceId, { loading: true, error: null });
        return next;
      });

      try {
        const response = await pplService.fetchTraceSpans(
          { traceId, dataset: datasetParam, limit: 1000 },
          controller.signal
        );

        const traceHits = transformPPLDataToTraceHits(response);
        const agentSpans = hitsToAgentSpans(traceHits);
        const fullTree = buildFullSpanTree(agentSpans, formatTs);
        traceSpansCacheRef.current.set(traceId, fullTree);

        // Flatten tree into child metadata
        const newChildMeta = new Map<string, RowMeta>();
        const flattenTree = (rows: BaseRow[]) => {
          for (const row of rows) {
            newChildMeta.set(row.spanId, {
              level: row.level || 0,
              isExpandable: !!(row.children && row.children.length > 0),
              traceRow: row,
            });
            if (row.children && row.children.length > 0) {
              flattenTree(row.children);
            }
          }
        };
        flattenTree(fullTree);

        // Batch both state updates together
        setChildMetaMap((prev) => {
          const next = new Map(prev);
          next.set(traceId, newChildMeta);
          return next;
        });
        setTraceLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, { loading: false, error: null });
          return next;
        });
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
        setTraceLoadingState((prev) => {
          const next = new Map(prev);
          next.set(traceId, {
            loading: false,
            error: (err as Error).message || 'Failed to fetch trace spans',
          });
          return next;
        });
      } finally {
        inFlightRef.current.delete(traceId);
      }
    },
    [pplService, datasetParam, formatTs, setTraceLoadingState]
  );

  // Stable toggleExpansion — reads expandedRows from ref, no dependency on expandedRows state
  const toggleExpansion = useCallback(
    async (e: React.MouseEvent, id: string, traceId: string) => {
      e.stopPropagation();

      if (expandedRowsRef.current.has(id)) {
        setExpandedRows((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      // Fast path: tree already cached — update synchronously (no await/microtask)
      if (traceSpansCacheRef.current.has(traceId)) {
        setExpandedRows((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        return;
      }

      await expandTrace(traceId);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [expandTrace, setExpandedRows]
  );

  // Stable getRowMeta — reads from merged ref, O(1) lookup
  const getRowMeta = useCallback((hitId: string): RowMeta | null => {
    return mergedMetaRef.current.get(hitId) || null;
  }, []);

  // Build visible rows: root hits + expanded children, O(V) via direct lookup.
  const visibleRows = useMemo(() => {
    const result: Array<OpenSearchSearchHit<Record<string, any>>> = [];
    const merged = mergedMetaRef.current;

    const addRowAndChildren = (hit: OpenSearchSearchHit<Record<string, any>>, hitId: string) => {
      result.push(hit);
      if (!expandedRows.has(hitId)) return;
      const meta = merged.get(hitId);
      const children = meta?.traceRow.children;
      if (!children) return;
      for (const child of children) {
        addRowAndChildren(traceRowToHit(child), child.spanId);
      }
    };

    hits.forEach((hit) => {
      const id = getHitId(hit);
      const meta = rowMetaMap.get(id);
      const hitId = meta?.traceRow.id || id;
      addRowAndChildren(hit, hitId);
    });

    return result;
  }, [hits, expandedRows, rowMetaMap]);

  // Open flyout for a row by its hit ID — reads meta from ref for stability
  const handleRowClick = useCallback(
    async (hitId: string) => {
      const meta = mergedMetaRef.current.get(hitId);
      if (!meta) return;
      const traceRow = meta.traceRow as TraceRow;
      flyoutTraceIdRef.current = traceRow.traceId;
      openFlyout(traceRow);

      const cached = traceSpansCacheRef.current.get(traceRow.traceId);
      if (cached) {
        updateFlyoutFullTree(cached as TraceRow[], false);
        return;
      }

      await expandTrace(traceRow.traceId);
    },
    [openFlyout, updateFlyoutFullTree, expandTrace]
  );

  // Context value is now stable — expandedRows and traceLoadingState
  // live in the external store, so only cells that subscribe re-render.
  const expansionContextValue = useMemo(
    () => ({
      toggleExpansion,
      getRowMeta,
      onRowClick: handleRowClick,
      wrapCellText,
      hasExpandableRows: true,
    }),
    [toggleExpansion, getRowMeta, handleRowClick, wrapCellText]
  );

  // Loading state — show during active query or before initial query has completed
  if ((isQueryLoading || !isInitialized) && hits.length === 0) {
    return (
      <TableLoadingState
        message={
          <FormattedMessage
            id="agentTraces.tracesDataTable.loading"
            defaultMessage="Loading agent traces..."
          />
        }
      />
    );
  }

  if (!isQueryLoading && isInitialized && hits.length === 0) {
    return (
      <TableEmptyState
        title={
          <FormattedMessage
            id="agentTraces.tracesDataTable.emptyTitle"
            defaultMessage="No agent traces found"
          />
        }
      />
    );
  }

  if (!dataset) return null;

  return (
    <TraceExpansionProvider value={expansionContextValue}>
      <div className="agentTracesTable__container">
        <DataTableInfoBar
          hasHead={hasHead}
          hitsCount={hits.length}
          totalCount={traceMetrics?.filteredTraces ?? hits.length}
          elapsedMs={results?.elapsedMs}
          entityName="trace"
          wrapCellText={wrapCellText}
          onWrapCellTextChange={setWrapCellText}
        />
        <div
          ref={scrollContainerRef}
          className="agentTracesTable__scrollContainer eui-xScrollWithShadows"
        >
          <DataTable
            columns={displayedColumns}
            rows={visibleRows}
            dataset={dataset}
            hits={results?.hits?.total}
            sampleSize={sampleSize}
            isShortDots={false}
            showPagination={false}
            docViewsRegistry={docViewsRegistry}
            onRemoveColumn={onRemoveColumn}
            onAddColumn={onAddColumn}
            onFilter={onAddFilter as DocViewFilterFn}
            wrapCellText={wrapCellText}
            sortOrder={sortOrder}
            onChangeSortOrder={handleSortChange}
          />
        </div>
      </div>
    </TraceExpansionProvider>
  );
};
