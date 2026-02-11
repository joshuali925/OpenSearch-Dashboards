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
import { useAgentTraces, TraceRow } from './use_agent_traces';

const PAGE_SIZE = 50;

export const TracesTable = () => {
  const { traces, loading, error, refresh } = useAgentTraces();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedTrace, setSelectedTrace] = useState<TraceRow | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const toggleRowExpansion = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleRowClick = useCallback((item: TraceRow) => {
    setSelectedTrace(item);
    setIsFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedTrace(null);
  }, []);

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'AGENT':
        return 'warning';
      case 'CHAIN':
        return 'secondary';
      case 'LLM':
        return 'danger';
      case 'RETRIEVE':
        return 'success';
      case 'TOOL':
        return 'primary';
      case 'EMBEDDING':
        return 'accent';
      default:
        return 'default';
    }
  };

  // Flatten tree structure for display, respecting expanded state
  const getVisibleRows = useMemo(() => {
    const visible: TraceRow[] = [];

    const addRowAndChildren = (row: TraceRow, parentExpanded: boolean) => {
      if (parentExpanded || row.level === 0) {
        visible.push(row);
      }

      if (row.children && row.children.length > 0 && expandedRows.has(row.id)) {
        row.children.forEach((child) => addRowAndChildren(child, true));
      }
    };

    traces.forEach((row) => addRowAndChildren(row, true));
    return visible;
  }, [traces, expandedRows]);

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
      field: 'status',
      name: 'STATUS',
      width: '80px',
      render: (status: string) => (
        <EuiHealth color={status === 'success' ? 'success' : 'danger'}>
          {status === 'success' ? '✓' : '✗'}
        </EuiHealth>
      ),
    },
    {
      field: 'kind',
      name: 'KIND',
      width: '120px',
      render: (kind: string, item: TraceRow) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            paddingLeft: item.level ? `${item.level * 20}px` : '0',
          }}
        >
          {item.isExpandable && (
            <EuiButtonEmpty
              size="xs"
              iconType={expandedRows.has(item.id) ? 'arrowDown' : 'arrowRight'}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                toggleRowExpansion(item.id);
              }}
              style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
            />
          )}
          {!item.isExpandable && <span style={{ width: '24px' }} />}
          <EuiBadge color={getKindColor(kind)}>{kind}</EuiBadge>
        </div>
      ),
    },
    {
      field: 'name',
      name: 'NAME',
      width: '200px',
      render: (name: string) => <EuiText size="s">{name}</EuiText>,
    },
    {
      field: 'input',
      name: 'INPUT',
      width: '200px',
      render: (input: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          {input && input.length > 20 && input !== '—' && (
            <EuiButtonEmpty size="xs" color="primary">
              View
            </EuiButtonEmpty>
          )}
        </div>
      ),
    },
    {
      field: 'output',
      name: 'OUTPUT',
      width: '200px',
      render: (output: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          {output && output.length > 20 && output !== '—' && (
            <EuiButtonEmpty size="xs" color="primary">
              View
            </EuiButtonEmpty>
          )}
        </div>
      ),
    },
    {
      field: 'startTime',
      name: 'START TIME',
      width: '120px',
      render: (time: string) => <EuiText size="s">{time}</EuiText>,
    },
    {
      field: 'latency',
      name: 'LATENCY',
      width: '100px',
      render: (latency: string) => <EuiText size="s">{latency}</EuiText>,
    },
    {
      field: 'totalTokens',
      name: 'TOTAL TOKENS',
      width: '120px',
      render: (tokens: number | string) => <EuiText size="s">{tokens}</EuiText>,
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
        <TraceDetailsFlyout trace={selectedTrace} onClose={closeFlyout} />
      )}
    </>
  );
};
