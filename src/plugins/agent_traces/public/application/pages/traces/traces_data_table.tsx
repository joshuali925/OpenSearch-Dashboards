/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { EuiText, EuiSwitch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { i18n } from '@osd/i18n';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment-timezone';
import { DataTable } from '../../../components/data_table/data_table';
import { useTabResults } from '../../utils/hooks/use_tab_results';
import { useDatasetContext } from '../../context/dataset_context/dataset_context';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgentTracesServices } from '../../../types';
import { selectColumns, selectSort } from '../../utils/state_management/selectors';
import { setColumns, setSort } from '../../utils/state_management/slices/legacy/legacy_slice';
import { getLegacyDisplayedColumns } from '../../../helpers/data_table_helper';
import { SortOrder } from '../../../types/saved_agent_traces_types';
import { executeQueries } from '../../utils/state_management/actions/query_actions';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SAMPLE_SIZE_SETTING,
  AGENT_TRACES_DEFAULT_COLUMNS,
  AGENT_TRACES_DEFAULT_COLUMNS_SET,
} from '../../../../common';
import { UI_SETTINGS } from '../../../../../data/public';
import { getDocViewsRegistry } from '../../legacy/discover/opensearch_dashboards_services';
import { DocViewFilterFn, OpenSearchSearchHit } from '../../../types/doc_views_types';
import { useChangeQueryEditor } from '../../hooks';
import { TraceExpansionProvider, RowMeta } from './trace_expansion_context';
import { useTraceFlyout } from './flyout/trace_flyout_context';
import { traceHitToAgentSpan, unflattenSource } from './hooks/span_transforms';
import {
  BaseRow,
  LoadingState,
  buildFullSpanTree,
  hitsToAgentSpans,
  spanToRow,
  formatTimestamp,
} from './hooks/tree_utils';
import { TraceHit, transformPPLDataToTraceHits } from './trace_details/traces/ppl_to_trace_hits';
import { usePPLQueryDeps } from './hooks/use_ppl_query_deps';
import { TraceRow } from './hooks/use_agent_traces';
import { TableLoadingState, TableEmptyState } from './table_shared';
import { selectIsLoading } from '../../utils/state_management/selectors/query_editor/query_editor';
import { getHitId } from '../../../components/data_table/table_cell/trace_utils/trace_utils';
import './traces_table.scss';

const DEFAULT_TRACE_COLUMNS = [...AGENT_TRACES_DEFAULT_COLUMNS];

/** Convert an OpenSearchSearchHit _source to a BaseRow for metadata.
 *  The _source from OpenSearch uses flat dotted keys, so we unflatten first. */
const hitToTraceRow = (
  hit: OpenSearchSearchHit<Record<string, any>>,
  formatTs: (ts: string) => string
): BaseRow => {
  const source = unflattenSource(hit._source || {}) as TraceHit;
  const span = traceHitToAgentSpan(source, 0);
  const row = spanToRow(span, 0, formatTs);
  // Root traces (parentSpanId empty) are expandable
  row.isExpandable = !source.parentSpanId;
  row.level = 0;
  return row;
};

/** Create a synthetic OpenSearchSearchHit from a BaseRow */
const traceRowToHit = (row: BaseRow): OpenSearchSearchHit<Record<string, any>> => ({
  _index: '',
  _id: row.spanId,
  _score: null,
  _source: row.rawDocument || {},
});

export const TracesDataTable: React.FC = () => {
  const { services } = useOpenSearchDashboards<AgentTracesServices>();
  const { uiSettings } = services;
  const dispatch = useDispatch();

  const columns = useSelector(selectColumns);
  const { dataset } = useDatasetContext();
  const { results } = useTabResults();
  const isQueryLoading = useSelector(selectIsLoading);

  const { pplService, datasetParam } = usePPLQueryDeps();
  const { openFlyout, updateFlyoutFullTree } = useTraceFlyout();

  const docViewsRegistry = useMemo(() => getDocViewsRegistry(), []);
  const sampleSize = uiSettings.get(SAMPLE_SIZE_SETTING);

  // Timezone for formatting
  const timezone = useMemo(() => {
    const tz = uiSettings?.get('dateFormat:tz');
    if (tz && tz !== 'Browser') return tz;
    return moment.tz.guess() || moment().format('Z');
  }, [uiSettings]);

  const formatTs = useCallback((ts: string) => formatTimestamp(ts, timezone), [timezone]);

  // Initialize columns to defaults on mount if they don't contain any
  // agent traces virtual columns (e.g., first visit or migrating from old EuiTable columns).
  // Check for virtual columns that don't exist as real dataset fields.
  useEffect(() => {
    const traceOnlyVirtualColumns = ['latency', 'totalTokens', 'status'];
    const hasTraceVirtualColumns = columns.some((c) => traceOnlyVirtualColumns.includes(c));
    if (
      columns.length === 0 ||
      (columns.length === 1 && columns[0] === '_source') ||
      !hasTraceVirtualColumns
    ) {
      dispatch(setColumns(DEFAULT_TRACE_COLUMNS));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract hits from tab results
  const hits: Array<OpenSearchSearchHit<Record<string, any>>> = useMemo(() => {
    return results?.hits?.hits || [];
  }, [results]);

  // Build row metadata map from hits
  const rowMetaMap = useMemo(() => {
    const map = new Map<string, RowMeta>();
    hits.forEach((hit) => {
      const traceRow = hitToTraceRow(hit, formatTs);
      map.set(getHitId(hit), {
        level: traceRow.level || 0,
        isExpandable: !!traceRow.isExpandable,
        traceRow,
      });
    });
    return map;
  }, [hits, formatTs]);

  // Sort state from Redux — sort changes trigger a backend PPL query re-execution
  const sortOrder = useSelector(selectSort);

  const handleSortChange = useCallback(
    (newSort: SortOrder[]) => {
      dispatch(setSort(newSort));
      dispatch(executeQueries({ services }) as any);
    },
    [dispatch, services]
  );

  // Wrap cell text toggle
  const [wrapCellText, setWrapCellText] = useState(false);

  // Tree expansion state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [childHitsMap, setChildHitsMap] = useState<
    Map<string, Array<OpenSearchSearchHit<Record<string, any>>>>
  >(new Map());
  const [childMetaMap, setChildMetaMap] = useState<Map<string, Map<string, RowMeta>>>(new Map());
  const [traceLoadingState, setTraceLoadingState] = useState<Map<string, LoadingState>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const traceSpansCacheRef = useRef<Map<string, BaseRow[]>>(new Map());
  const flyoutTraceIdRef = useRef<string | null>(null);

  // Reset tree expansion when hits change (e.g. sort re-query)
  useEffect(() => {
    setExpandedRows(new Set());
  }, [hits]);

  // Sync full tree to flyout
  useEffect(() => {
    const traceId = flyoutTraceIdRef.current;
    if (!traceId) return;
    const cached = traceSpansCacheRef.current.get(traceId);
    if (cached) {
      updateFlyoutFullTree(cached as TraceRow[], false);
    }
  }, [childHitsMap, updateFlyoutFullTree]);

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
      setTraceLoadingState((prev) => {
        const next = new Map(prev);
        next.set(traceId, { loading: true, error: null });
        return next;
      });

      try {
        const response = await pplService.fetchTraceSpans({
          traceId,
          dataset: datasetParam,
          limit: 1000,
        });

        const traceHits = transformPPLDataToTraceHits(response);
        const agentSpans = hitsToAgentSpans(traceHits);
        const fullTree = buildFullSpanTree(agentSpans, formatTs);
        traceSpansCacheRef.current.set(traceId, fullTree);

        // Build child hits and metadata for displaying expanded rows
        const childRows: BaseRow[] = [];
        const flattenTree = (rows: BaseRow[]) => {
          for (const row of rows) {
            childRows.push(row);
            if (row.children && row.children.length > 0) {
              flattenTree(row.children);
            }
          }
        };
        flattenTree(fullTree);

        const newChildHits = childRows
          .filter((r) => r.parentSpanId) // exclude root (already in parent hits)
          .map((r) => traceRowToHit(r));
        const newChildMeta = new Map<string, RowMeta>();
        childRows.forEach((r) => {
          newChildMeta.set(r.spanId, {
            level: r.level || 0,
            isExpandable: !!(r.children && r.children.length > 0),
            traceRow: r,
          });
        });

        setChildHitsMap((prev) => {
          const next = new Map(prev);
          next.set(traceId, newChildHits);
          return next;
        });
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
    [pplService, datasetParam, formatTs]
  );

  const toggleExpansion = useCallback(
    async (e: React.MouseEvent, id: string, traceId: string) => {
      e.stopPropagation();

      if (expandedRows.has(id)) {
        setExpandedRows((prev) => {
          const next = new Set(prev);
          next.delete(id);
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
    [expandedRows, expandTrace]
  );

  // Combined getRowMeta that checks both root-level and child metadata
  const getRowMeta = useCallback(
    (hitId: string): RowMeta | null => {
      const rootMeta = rowMetaMap.get(hitId);
      if (rootMeta) return rootMeta;

      // Search child meta maps
      for (const meta of childMetaMap.values()) {
        const childMeta = meta.get(hitId);
        if (childMeta) return childMeta;
      }
      return null;
    },
    [rowMetaMap, childMetaMap]
  );

  // Build visible rows: root hits (already sorted by backend) + expanded children after parents
  const visibleRows = useMemo(() => {
    const result: Array<OpenSearchSearchHit<Record<string, any>>> = [];

    const addRowAndChildren = (hit: OpenSearchSearchHit<Record<string, any>>, hitId: string) => {
      result.push(hit);

      if (!expandedRows.has(hitId)) return;

      const meta = getRowMeta(hitId);
      if (!meta) return;

      const traceId = meta.traceRow.traceId;
      const fullTree = traceSpansCacheRef.current.get(traceId);
      if (!fullTree) return;

      // Find this node in the full tree and add its children
      const findAndAddChildren = (rows: BaseRow[]) => {
        for (const row of rows) {
          if (row.spanId === meta.traceRow.spanId) {
            if (row.children && row.children.length > 0) {
              const addTreeChildren = (children: BaseRow[]) => {
                for (const child of children) {
                  const childHit = traceRowToHit(child);
                  addRowAndChildren(childHit, child.spanId);
                }
              };
              addTreeChildren(row.children);
            }
            return true;
          }
          if (row.children && findAndAddChildren(row.children)) return true;
        }
        return false;
      };

      findAndAddChildren(fullTree);
    };

    hits.forEach((hit) => {
      const id = getHitId(hit);
      const meta = rowMetaMap.get(id);
      const hitId = meta?.traceRow.id || id;
      addRowAndChildren(hit, hitId);
    });

    return result;
  }, [hits, expandedRows, rowMetaMap, getRowMeta]);

  // Build displayed columns from Redux state
  const displayedColumns = useMemo(() => {
    if (!dataset) return [];
    return getLegacyDisplayedColumns(
      columns,
      dataset,
      uiSettings.get(UI_SETTINGS.SHORT_DOTS_ENABLE),
      uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING)
    );
  }, [columns, dataset, uiSettings]);

  // Column management callbacks
  const onRemoveColumn = useCallback(
    (column: string) => {
      if (AGENT_TRACES_DEFAULT_COLUMNS_SET.has(column)) return;
      const newColumns = columns.filter((c) => c !== column);
      dispatch(setColumns(newColumns.length > 0 ? newColumns : ['_source']));
    },
    [columns, dispatch]
  );

  const onAddColumn = useCallback(
    (column: string) => {
      if (!columns.includes(column)) {
        const newColumns = columns[0] === '_source' ? [column] : [...columns, column];
        dispatch(setColumns(newColumns));
      }
    },
    [columns, dispatch]
  );

  // Open flyout for a row by its hit ID
  const handleRowClick = useCallback(
    async (hitId: string) => {
      const meta = getRowMeta(hitId);
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
    [getRowMeta, openFlyout, updateFlyoutFullTree, expandTrace]
  );

  const { onAddFilter } = useChangeQueryEditor();

  const expansionContextValue = useMemo(
    () => ({
      expandedRows,
      toggleExpansion,
      traceLoadingState,
      getRowMeta,
      onRowClick: handleRowClick,
      wrapCellText,
    }),
    [expandedRows, toggleExpansion, traceLoadingState, getRowMeta, handleRowClick, wrapCellText]
  );

  // Loading state
  if (isQueryLoading && hits.length === 0) {
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

  if (!isQueryLoading && hits.length === 0) {
    return (
      <TableEmptyState
        title={
          <FormattedMessage
            id="agentTraces.tracesDataTable.emptyTitle"
            defaultMessage="No agent traces found"
          />
        }
        onRefresh={() => {}}
        refreshLabel={
          <FormattedMessage
            id="agentTraces.tracesDataTable.refreshButton"
            defaultMessage="Refresh"
          />
        }
      />
    );
  }

  if (!dataset) return null;

  return (
    <TraceExpansionProvider value={expansionContextValue}>
      <div className="agentTracesTable__container">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('agentTraces.tracesDataTable.wrapCellText', {
                defaultMessage: 'Wrap cell text',
              })}
              checked={wrapCellText}
              onChange={(e) => setWrapCellText(e.target.checked)}
              data-test-subj="agentTracesWrapCellTextSwitch"
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="agentTraces.tracesDataTable.showingCount"
                defaultMessage="Showing {count} traces"
                values={{ count: hits.length }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
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
    </TraceExpansionProvider>
  );
};
