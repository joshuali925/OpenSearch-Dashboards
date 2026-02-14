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
  EuiText,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiLink,
  CriteriaWithPagination,
} from '@elastic/eui';
import { TraceDetailsFlyout } from './trace_details_flyout';
import { useAgentTraces, TraceRow } from './use_agent_traces';
import { getKindColor } from './trace_utils';

const PAGE_SIZE = 50;

export const SpansTable = () => {
  const { traces, loading, error, refresh } = useAgentTraces();
  const [selectedTrace, setSelectedTrace] = useState<TraceRow | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  // Flatten all spans into a single flat list (no tree nesting)
  const flatSpans = useMemo(() => {
    const collectAll = (rows: TraceRow[]): TraceRow[] => {
      const result: TraceRow[] = [];
      for (const row of rows) {
        result.push({ ...row, level: 0, isExpandable: false, children: [] });
        if (row.children && row.children.length > 0) {
          result.push(...collectAll(row.children));
        }
      }
      return result;
    };
    return collectAll(traces);
  }, [traces]);

  const handleRowClick = useCallback((item: TraceRow) => {
    setSelectedTrace(item);
    setIsFlyoutOpen(true);
  }, []);

  const handleParentClick = useCallback(
    (e: React.MouseEvent, parentSpanId: string) => {
      e.stopPropagation();
      const parent = flatSpans.find((s) => s.spanId === parentSpanId);
      if (parent) {
        setSelectedTrace(parent);
        setIsFlyoutOpen(true);
      }
    },
    [flatSpans]
  );

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedTrace(null);
  }, []);

  // Paginate
  const pageOfItems = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return flatSpans.slice(start, start + PAGE_SIZE);
  }, [flatSpans, pageIndex]);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize: PAGE_SIZE,
      totalItemCount: flatSpans.length,
      showPerPageOptions: false,
    }),
    [pageIndex, flatSpans.length]
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
      render: (kind: string) => <EuiBadge color={getKindColor(kind)}>{kind}</EuiBadge>,
    },
    {
      field: 'name',
      name: 'NAME',
      render: (name: string) => <EuiText size="s">{name}</EuiText>,
    },
    {
      field: 'parentSpanId',
      name: 'PARENT SPAN ID',
      render: (parentSpanId: string | null) => {
        if (!parentSpanId) {
          return <EuiText size="s">—</EuiText>;
        }
        return (
          <EuiLink onClick={(e: React.MouseEvent) => handleParentClick(e, parentSpanId)}>
            {parentSpanId.substring(0, 8)}...
          </EuiLink>
        );
      },
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
          Loading spans...
        </EuiText>
      </div>
    );
  }

  // Error state
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

  // Empty state
  if (flatSpans.length === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <EuiEmptyPrompt
          iconType="apmTrace"
          title={<h3>No spans found</h3>}
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
              Showing {flatSpans.length} spans
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
