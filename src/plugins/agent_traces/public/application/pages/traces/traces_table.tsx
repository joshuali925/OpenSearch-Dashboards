/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiHealth,
  EuiBadge,
  EuiButtonIcon,
  EuiText,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  CriteriaWithPagination,
} from '@elastic/eui';
import { TraceDetailsFlyout } from './trace_details_flyout';
import { useAgentTraces, TraceRow, getChildrenFromFullTree } from './use_agent_traces';
import { useTraceMetrics } from './use_trace_metrics';
import { TraceMetricsBar } from './trace_metrics_bar';
import { getKindColor } from './trace_utils';

const PAGE_SIZE = 50;

export const TracesTable = () => {
  const {
    traces,
    loading,
    error,
    refresh,
    expandTrace,
    traceSpansCache,
    traceLoadingState,
  } = useAgentTraces();
  const { metrics, loading: metricsLoading } = useTraceMetrics(!loading && traces.length > 0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedTrace, setSelectedTrace] = useState<TraceRow | null>(null);
  const [selectedTraceFullTree, setSelectedTraceFullTree] = useState<TraceRow[] | undefined>(
    undefined
  );
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [flyoutLoading, setFlyoutLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const toggleRowExpansion = useCallback(
    async (e: React.MouseEvent, id: string, traceId: string) => {
      e.stopPropagation();

      // If collapsing, just toggle
      if (expandedRows.has(id)) {
        setExpandedRows((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      // If expanding, fetch children first (if not cached)
      await expandTrace(traceId);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [expandedRows, expandTrace]
  );

  const handleRowClick = useCallback(
    async (item: TraceRow) => {
      setSelectedTrace(item);
      setIsFlyoutOpen(true);

      // Check if full tree is already cached
      const cached = traceSpansCache.get(item.traceId);
      if (cached) {
        setSelectedTraceFullTree(cached);
        return;
      }

      // Fetch full tree for flyout
      setFlyoutLoading(true);
      try {
        await expandTrace(item.traceId);
        // After expandTrace completes, the cache will be updated
        // We need to read it from the updated state in the next render
        // Use a small timeout to let state propagate
        setSelectedTraceFullTree(undefined); // Will be picked up from cache
      } finally {
        setFlyoutLoading(false);
      }
    },
    [expandTrace, traceSpansCache]
  );

  // Keep flyout tree in sync with cache
  const flyoutFullTree = useMemo(() => {
    if (!selectedTrace) return undefined;
    return selectedTraceFullTree || traceSpansCache.get(selectedTrace.traceId);
  }, [selectedTrace, selectedTraceFullTree, traceSpansCache]);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedTrace(null);
    setSelectedTraceFullTree(undefined);
    setFlyoutLoading(false);
  }, []);

  // Flatten tree structure for display, respecting expanded state
  const getVisibleRows = useMemo(() => {
    const visible: TraceRow[] = [];

    const addRowAndChildren = (row: TraceRow, parentExpanded: boolean) => {
      if (parentExpanded || row.level === 0) {
        visible.push(row);
      }

      if (!expandedRows.has(row.id)) return;

      // Use full tree children if available, otherwise gen_ai-only children
      const fullTree = traceSpansCache.get(row.traceId);
      const children =
        fullTree && row.level === 0 ? getChildrenFromFullTree(fullTree, row.spanId) : row.children;

      if (children && children.length > 0) {
        children.forEach((child) => addRowAndChildren(child, true));
      }
    };

    traces.forEach((row) => addRowAndChildren(row, true));
    return visible;
  }, [traces, expandedRows, traceSpansCache]);

  // Paginate visible rows
  const pageOfItems = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return getVisibleRows.slice(start, start + PAGE_SIZE);
  }, [getVisibleRows, pageIndex]);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize: PAGE_SIZE,
      totalItemCount: getVisibleRows.length,
      showPerPageOptions: false,
    }),
    [pageIndex, getVisibleRows.length]
  );

  const onTableChange = useCallback(({ page }: CriteriaWithPagination<TraceRow>) => {
    setPageIndex(page.index);
  }, []);

  const columns: Array<EuiBasicTableColumn<TraceRow>> = [
    {
      field: 'startTime',
      name: 'TIMESTAMP',
      render: (time: string) => <EuiText size="s">{time}</EuiText>,
    },
    {
      field: 'kind',
      name: 'KIND',
      render: (kind: string, item: TraceRow) => {
        const isTraceLoading = traceLoadingState.get(item.traceId)?.loading;
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingLeft: item.level ? `${item.level * 20}px` : '0',
            }}
          >
            {item.isExpandable && !isTraceLoading && (
              <EuiButtonIcon
                size="xs"
                iconType={expandedRows.has(item.id) ? 'arrowDown' : 'arrowRight'}
                onClick={(e: React.MouseEvent) => toggleRowExpansion(e, item.id, item.traceId)}
                aria-label={expandedRows.has(item.id) ? 'Collapse' : 'Expand'}
                color="subdued"
                iconSize="s"
              />
            )}
            {item.isExpandable && isTraceLoading && (
              <span
                style={{
                  display: 'inline-flex',
                  width: '24px',
                  height: '24px',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EuiLoadingSpinner size="s" />
              </span>
            )}
            {!item.isExpandable && <span style={{ width: '24px' }} />}
            <EuiBadge color={getKindColor(kind)}>{kind}</EuiBadge>
          </div>
        );
      },
    },
    {
      field: 'name',
      name: 'NAME',
      render: (name: string) => <EuiText size="s">{name}</EuiText>,
    },
    {
      field: 'status',
      name: 'STATUS',
      render: (status: string) => (
        <EuiHealth color={status === 'success' ? 'success' : 'danger'}>
          {status === 'success' ? 'Success' : 'Error'}
        </EuiHealth>
      ),
    },
    {
      field: 'latency',
      name: 'LATENCY',
      render: (latency: string) => <EuiText size="s">{latency}</EuiText>,
    },
    {
      field: 'totalTokens',
      name: 'TOKENS',
      render: (tokens: number | string) => <EuiText size="s">{tokens}</EuiText>,
    },
    {
      field: 'input',
      name: 'INPUT',
      render: (input: string) => (
        <EuiText
          size="s"
          style={{
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {input}
        </EuiText>
      ),
    },
    {
      field: 'output',
      name: 'OUTPUT',
      render: (output: string) => (
        <EuiText
          size="s"
          style={{
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {output}
        </EuiText>
      ),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
        <EuiText size="s" color="subdued" style={{ marginTop: '16px' }}>
          Loading agent traces...
        </EuiText>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: '16px' }}>
        <EuiCallOut title="Error loading traces" color="danger" iconType="alert">
          <p>{error}</p>
          <EuiButton onClick={refresh} color="danger" size="s">
            Retry
          </EuiButton>
        </EuiCallOut>
      </div>
    );
  }

  // Empty state
  if (traces.length === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <EuiEmptyPrompt
          iconType="apmTrace"
          title={<h3>No agent traces found</h3>}
          body={
            <p>
              No AI agent spans were found in the <code>otel-v1-apm-span</code> index. Make sure
              your application is instrumented with OpenTelemetry and is sending spans with{' '}
              <code>gen_ai.operation.name</code> attribute.
            </p>
          }
          actions={
            <EuiButton onClick={refresh} iconType="refresh">
              Refresh
            </EuiButton>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '16px' }}>
        <TraceMetricsBar metrics={metrics} loading={metricsLoading} />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              Showing {getVisibleRows.length} of {traces.length} traces
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiBasicTable
          items={pageOfItems}
          columns={columns}
          tableLayout="auto"
          hasActions={false}
          pagination={pagination}
          onChange={onTableChange}
          rowProps={(item) => ({
            onClick: () => handleRowClick(item),
            style: { cursor: 'pointer' },
          })}
        />
      </div>
      {isFlyoutOpen && selectedTrace && (
        <TraceDetailsFlyout
          trace={selectedTrace}
          onClose={closeFlyout}
          fullTree={flyoutFullTree}
          isLoadingFullTree={flyoutLoading || traceLoadingState.get(selectedTrace.traceId)?.loading}
        />
      )}
    </>
  );
};
