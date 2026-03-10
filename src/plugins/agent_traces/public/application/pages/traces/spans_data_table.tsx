/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment-timezone';
import { DataTable } from '../../../components/data_table/data_table';
import { useTabResults } from '../../utils/hooks/use_tab_results';
import { useDatasetContext } from '../../context/dataset_context/dataset_context';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { AgentTracesServices } from '../../../types';
import { selectColumns } from '../../utils/state_management/selectors';
import { setColumns } from '../../utils/state_management/slices/legacy/legacy_slice';
import { getLegacyDisplayedColumns } from '../../../helpers/data_table_helper';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SAMPLE_SIZE_SETTING,
  AGENT_TRACES_DEFAULT_COLUMNS,
} from '../../../../common';
import { UI_SETTINGS } from '../../../../../data/public';
import { getDocViewsRegistry } from '../../legacy/discover/opensearch_dashboards_services';
import { DocViewFilterFn, OpenSearchSearchHit } from '../../../types/doc_views_types';
import { useChangeQueryEditor } from '../../hooks';
import { TraceExpansionProvider, RowMeta } from './trace_expansion_context';
import { traceHitToAgentSpan, unflattenSource } from './hooks/span_transforms';
import { BaseRow, LoadingState, spanToRow, formatTimestamp } from './hooks/tree_utils';
import { TraceHit } from './trace_details/traces/ppl_to_trace_hits';
import { TableLoadingState, TableEmptyState } from './table_shared';
import { selectIsLoading } from '../../utils/state_management/selectors/query_editor/query_editor';
import { getHitId } from '../../../components/data_table/table_cell/trace_utils/trace_utils';
import { useTraceFlyout } from './flyout/trace_flyout_context';
import { TraceRow } from './hooks/use_agent_traces';
import { usePPLQueryDeps } from './hooks/use_ppl_query_deps';
import { transformPPLDataToTraceHits } from './trace_details/traces/ppl_to_trace_hits';
import { hitsToAgentSpans, buildFullSpanTree } from './hooks/tree_utils';
import './traces_table.scss';

const DEFAULT_SPAN_COLUMNS = [...AGENT_TRACES_DEFAULT_COLUMNS];

/** Convert an OpenSearchSearchHit _source to a BaseRow for metadata.
 *  The _source from OpenSearch uses flat dotted keys, so we unflatten first. */
const hitToSpanRow = (
  hit: OpenSearchSearchHit<Record<string, any>>,
  formatTs: (ts: string) => string
): BaseRow => {
  const source = unflattenSource(hit._source || {}) as TraceHit;
  const span = traceHitToAgentSpan(source, 0);
  const row = spanToRow(span, 0, formatTs);
  row.isExpandable = false;
  row.level = 0;
  return row;
};

export const SpansDataTable: React.FC = () => {
  const { services } = useOpenSearchDashboards<AgentTracesServices>();
  const { uiSettings } = services;
  const dispatch = useDispatch();

  const columns = useSelector(selectColumns);
  const { dataset } = useDatasetContext();
  const { results } = useTabResults();
  const isQueryLoading = useSelector(selectIsLoading);

  const { openFlyout, updateFlyoutFullTree } = useTraceFlyout();
  const { pplService, datasetParam } = usePPLQueryDeps();
  const flyoutTraceIdRef = useRef<string | null>(null);
  const spansCacheRef = useRef<Map<string, TraceRow[]>>(new Map());

  const docViewsRegistry = useMemo(() => getDocViewsRegistry(), []);
  const sampleSize = uiSettings.get(SAMPLE_SIZE_SETTING);

  const timezone = useMemo(() => {
    const tz = uiSettings?.get('dateFormat:tz');
    if (tz && tz !== 'Browser') return tz;
    return moment.tz.guess() || moment().format('Z');
  }, [uiSettings]);

  const formatTs = useCallback((ts: string) => formatTimestamp(ts, timezone), [timezone]);

  // Initialize columns to defaults on mount if they don't contain any
  // agent traces virtual columns (e.g., first visit or migrating from old EuiTable columns).
  useEffect(() => {
    const traceOnlyVirtualColumns = ['latency', 'totalTokens', 'status'];
    const hasTraceVirtualColumns = columns.some((c) => traceOnlyVirtualColumns.includes(c));
    if (
      columns.length === 0 ||
      (columns.length === 1 && columns[0] === '_source') ||
      !hasTraceVirtualColumns
    ) {
      dispatch(setColumns(DEFAULT_SPAN_COLUMNS));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hits: Array<OpenSearchSearchHit<Record<string, any>>> = useMemo(() => {
    return results?.hits?.hits || [];
  }, [results]);

  // Build row metadata map from hits (flat, no tree expansion)
  const rowMetaMap = useMemo(() => {
    const map = new Map<string, RowMeta>();
    hits.forEach((hit) => {
      const row = hitToSpanRow(hit, formatTs);
      map.set(getHitId(hit), {
        level: 0,
        isExpandable: false,
        traceRow: row,
      });
    });
    return map;
  }, [hits, formatTs]);

  const getRowMeta = useCallback(
    (hitId: string): RowMeta | null => {
      return rowMetaMap.get(hitId) || null;
    },
    [rowMetaMap]
  );

  // Open flyout for a span row
  const handleRowClick = useCallback(
    async (hitId: string) => {
      const meta = getRowMeta(hitId);
      if (!meta) return;
      const traceRow = meta.traceRow as TraceRow;
      flyoutTraceIdRef.current = traceRow.traceId;
      openFlyout(traceRow);

      const cached = spansCacheRef.current.get(traceRow.traceId);
      if (cached) {
        updateFlyoutFullTree(cached, false);
        return;
      }

      // Fetch the full trace tree for the flyout
      if (pplService && datasetParam) {
        try {
          const response = await pplService.fetchTraceSpans({
            traceId: traceRow.traceId,
            dataset: datasetParam,
            limit: 1000,
          });
          const traceHits = transformPPLDataToTraceHits(response);
          const agentSpans = hitsToAgentSpans(traceHits);
          const fullTree = buildFullSpanTree(agentSpans, formatTs) as TraceRow[];
          spansCacheRef.current.set(traceRow.traceId, fullTree);
          updateFlyoutFullTree(fullTree, false);
        } catch (err) {
          updateFlyoutFullTree(undefined, false, (err as Error).message);
        }
      }
    },
    [getRowMeta, openFlyout, updateFlyoutFullTree, pplService, datasetParam, formatTs]
  );

  // No tree expansion for spans — provide a no-op context
  const expansionContextValue = useMemo(
    () => ({
      expandedRows: new Set<string>(),
      toggleExpansion: () => {},
      traceLoadingState: new Map<string, LoadingState>(),
      getRowMeta,
      onRowClick: handleRowClick,
    }),
    [getRowMeta, handleRowClick]
  );

  const displayedColumns = useMemo(() => {
    if (!dataset) return [];
    return getLegacyDisplayedColumns(
      columns,
      dataset,
      uiSettings.get(UI_SETTINGS.SHORT_DOTS_ENABLE),
      uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING)
    );
  }, [columns, dataset, uiSettings]);

  const onRemoveColumn = useCallback(
    (column: string) => {
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

  const { onAddFilter } = useChangeQueryEditor();

  if (isQueryLoading && hits.length === 0) {
    return (
      <TableLoadingState
        message={
          <FormattedMessage
            id="agentTraces.spansDataTable.loading"
            defaultMessage="Loading agent spans..."
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
            id="agentTraces.spansDataTable.emptyTitle"
            defaultMessage="No agent spans found"
          />
        }
        onRefresh={() => {}}
        refreshLabel={
          <FormattedMessage
            id="agentTraces.spansDataTable.refreshButton"
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
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="agentTraces.spansDataTable.showingCount"
            defaultMessage="Showing {count} spans"
            values={{ count: hits.length }}
          />
        </EuiText>
        <DataTable
          columns={displayedColumns}
          rows={hits}
          dataset={dataset}
          hits={results?.hits?.total}
          sampleSize={sampleSize}
          isShortDots={false}
          showPagination={false}
          docViewsRegistry={docViewsRegistry}
          onRemoveColumn={onRemoveColumn}
          onAddColumn={onAddColumn}
          onFilter={onAddFilter as DocViewFilterFn}
        />
      </div>
    </TraceExpansionProvider>
  );
};
