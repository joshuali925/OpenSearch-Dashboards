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
import { useAgentSessions, SessionRow } from './use_agent_sessions';
import { getKindColor } from './trace_utils';

const PAGE_SIZE = 50;

export const SessionsTable = () => {
  const {
    sessions,
    loading,
    error,
    refresh,
    expandSession,
    sessionSpansCache,
    sessionLoadingState,
  } = useAgentSessions();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [selectedSessionFullTree, setSelectedSessionFullTree] = useState<SessionRow[] | undefined>(
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

      await expandSession(traceId);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [expandedRows, expandSession]
  );

  const handleRowClick = useCallback(
    async (item: SessionRow) => {
      setSelectedSession(item);
      setIsFlyoutOpen(true);

      const cached = sessionSpansCache.get(item.traceId);
      if (cached) {
        setSelectedSessionFullTree(cached);
        return;
      }

      setFlyoutLoading(true);
      try {
        await expandSession(item.traceId);
        setSelectedSessionFullTree(undefined);
      } finally {
        setFlyoutLoading(false);
      }
    },
    [expandSession, sessionSpansCache]
  );

  const flyoutFullTree = useMemo(() => {
    if (!selectedSession) return undefined;
    return selectedSessionFullTree || sessionSpansCache.get(selectedSession.traceId);
  }, [selectedSession, selectedSessionFullTree, sessionSpansCache]);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedSession(null);
    setSelectedSessionFullTree(undefined);
    setFlyoutLoading(false);
  }, []);

  const getVisibleRows = useMemo(() => {
    const visible: SessionRow[] = [];

    const addRowAndChildren = (row: SessionRow, parentExpanded: boolean) => {
      if (parentExpanded || row.level === 0) {
        visible.push(row);
      }

      if (!expandedRows.has(row.id)) return;

      const fullTree = sessionSpansCache.get(row.traceId);
      const children = fullTree && row.level === 0 ? [] : row.children;

      if (children && children.length > 0) {
        children.forEach((child: SessionRow) => addRowAndChildren(child, true));
      }
    };

    sessions.forEach((row: SessionRow) => addRowAndChildren(row, true));
    return visible;
  }, [sessions, expandedRows, sessionSpansCache]);

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

  const onTableChange = useCallback(({ page }: CriteriaWithPagination<SessionRow>) => {
    setPageIndex(page.index);
  }, []);

  const columns: Array<EuiBasicTableColumn<SessionRow>> = [
    {
      field: 'startTime',
      name: 'TIMESTAMP',
      render: (time: string) => <EuiText size="s">{time}</EuiText>,
    },
    {
      field: 'kind',
      name: 'KIND',
      render: (kind: string, item: SessionRow) => {
        const isSessionLoading = sessionLoadingState.get(item.traceId)?.loading;
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingLeft: item.level ? `${item.level * 20}px` : '0',
            }}
          >
            {item.isExpandable && !isSessionLoading && (
              <EuiButtonEmpty
                size="xs"
                iconType={expandedRows.has(item.id) ? 'arrowDown' : 'arrowRight'}
                onClick={(e: React.MouseEvent) => toggleRowExpansion(e, item.id, item.traceId)}
                style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
              />
            )}
            {item.isExpandable && isSessionLoading && (
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
          Loading agent sessions...
        </EuiText>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px' }}>
        <EuiCallOut title="Error loading sessions" color="danger" iconType="alert">
          <p>{error}</p>
          <EuiButton onClick={refresh} color="danger" size="s">
            Retry
          </EuiButton>
        </EuiCallOut>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <EuiEmptyPrompt
          iconType="apmTrace"
          title={<h3>No agent sessions found</h3>}
          body={
            <p>
              No AI agent sessions were found in the <code>otel-v1-apm-span</code> index. Make sure
              your application is instrumented with OpenTelemetry and is sending spans with session
              information.
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
              Showing {getVisibleRows.length} of {sessions.length} sessions
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
      {isFlyoutOpen && selectedSession && (
        <TraceDetailsFlyout
          trace={selectedSession}
          onClose={closeFlyout}
          fullTree={flyoutFullTree}
          isLoadingFullTree={
            flyoutLoading || sessionLoadingState.get(selectedSession.traceId)?.loading
          }
        />
      )}
    </>
  );
};
