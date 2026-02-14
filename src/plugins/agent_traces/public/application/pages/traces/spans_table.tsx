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
  EuiButtonEmpty,
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
import { useAgentSpans, SpanRow } from './use_agent_spans';
import { getKindColor } from './trace_utils';

const PAGE_SIZE = 50;

export const SpansTable = () => {
  const {
    spans,
    loading,
    error,
    refresh,
    expandSpan,
    spanSpansCache,
    spanLoadingState,
  } = useAgentSpans();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedSpan, setSelectedSpan] = useState<SpanRow | null>(null);
  const [selectedSpanFullTree, setSelectedSpanFullTree] = useState<SpanRow[] | undefined>(
    undefined
  );
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [flyoutLoading, setFlyoutLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const toggleRowExpansion = useCallback(
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

      await expandSpan(traceId);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [expandedRows, expandSpan]
  );

  const handleRowClick = useCallback(
    async (item: SpanRow) => {
      setSelectedSpan(item);
      setIsFlyoutOpen(true);

      const cached = spanSpansCache.get(item.traceId);
      if (cached) {
        setSelectedSpanFullTree(cached);
        return;
      }

      setFlyoutLoading(true);
      try {
        await expandSpan(item.traceId);
        setSelectedSpanFullTree(undefined);
      } finally {
        setFlyoutLoading(false);
      }
    },
    [expandSpan, spanSpansCache]
  );

  const flyoutFullTree = useMemo(() => {
    if (!selectedSpan) return undefined;
    return selectedSpanFullTree || spanSpansCache.get(selectedSpan.traceId);
  }, [selectedSpan, selectedSpanFullTree, spanSpansCache]);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedSpan(null);
    setSelectedSpanFullTree(undefined);
    setFlyoutLoading(false);
  }, []);

  const getVisibleRows = useMemo(() => {
    const visible: SpanRow[] = [];

    const addRowAndChildren = (row: SpanRow, parentExpanded: boolean) => {
      if (parentExpanded || row.level === 0) {
        visible.push(row);
      }

      if (!expandedRows.has(row.id)) return;

      const fullTree = spanSpansCache.get(row.traceId);
      const children = fullTree && row.level === 0 ? [] : row.children;

      if (children && children.length > 0) {
        children.forEach((child: SpanRow) => addRowAndChildren(child, true));
      }
    };

    spans.forEach((row: SpanRow) => addRowAndChildren(row, true));
    return visible;
  }, [spans, expandedRows, spanSpansCache]);

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

  const onTableChange = useCallback(({ page }: CriteriaWithPagination<SpanRow>) => {
    setPageIndex(page.index);
  }, []);

  const columns: Array<EuiBasicTableColumn<SpanRow>> = [
    {
      field: 'startTime',
      name: 'TIMESTAMP',
      render: (time: string) => <EuiText size="s">{time}</EuiText>,
    },
    {
      field: 'kind',
      name: 'KIND',
      render: (kind: string, item: SpanRow) => {
        const isSpanLoading = spanLoadingState.get(item.traceId)?.loading;
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingLeft: item.level ? `${item.level * 20}px` : '0',
            }}
          >
            {item.isExpandable && !isSpanLoading && (
              <EuiButtonEmpty
                size="xs"
                iconType={expandedRows.has(item.id) ? 'arrowDown' : 'arrowRight'}
                onClick={(e: React.MouseEvent) => toggleRowExpansion(e, item.id, item.traceId)}
                style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
              />
            )}
            {item.isExpandable && isSpanLoading && (
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

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
        <EuiText size="s" color="subdued" style={{ marginTop: '16px' }}>
          Loading agent spans...
        </EuiText>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px' }}>
        <EuiCallOut title="Error loading spans" color="danger" iconType="alert">
          <p>{error}</p>
          <EuiButton onClick={refresh} color="danger" size="s">
            Retry
          </EuiButton>
        </EuiCallOut>
      </div>
    );
  }

  if (spans.length === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <EuiEmptyPrompt
          iconType="apmTrace"
          title={<h3>No agent spans found</h3>}
          body={
            <p>
              No AI agent spans were found in the <code>otel-v1-apm-span</code> index. Make sure
              your application is instrumented with OpenTelemetry and is sending spans.
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
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              Showing {getVisibleRows.length} of {spans.length} spans
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
      {isFlyoutOpen && selectedSpan && (
        <TraceDetailsFlyout
          trace={selectedSpan}
          onClose={closeFlyout}
          fullTree={flyoutFullTree}
          isLoadingFullTree={flyoutLoading || spanLoadingState.get(selectedSpan.traceId)?.loading}
        />
      )}
    </>
  );
};
