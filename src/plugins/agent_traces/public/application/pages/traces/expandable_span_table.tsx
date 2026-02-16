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
  EuiSpacer,
  CriteriaWithPagination,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { TraceDetailsFlyout } from './trace_details_flyout';
import { getKindColor } from './trace_utils';
import { SpanRow, SpanLoadingState, getChildrenFromFullTree } from './span_utils';
import './expandable_span_table.scss';

const PAGE_SIZE = 50;

export interface ExpandableSpanTableProps {
  rows: SpanRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  expandRow: (traceId: string) => Promise<void>;
  spansCache: Map<string, SpanRow[]>;
  loadingState: Map<string, SpanLoadingState>;
  /** Label used in loading/error/empty messages (e.g. "traces", "sessions", "spans") */
  entityLabel: string;
  /** Description shown in the empty state body */
  emptyDescription: string;
  /** Whether to resolve children from full tree on expand (traces use this, sessions/spans do not) */
  resolveChildrenFromFullTree?: boolean;
}

/**
 * Generic expandable table for traces, sessions, and spans.
 * Replaces the previously duplicated TracesTable, SessionsTable, and SpansTable.
 */
export const ExpandableSpanTable: React.FC<ExpandableSpanTableProps> = ({
  rows,
  loading,
  error,
  refresh,
  expandRow,
  spansCache,
  loadingState,
  entityLabel,
  emptyDescription,
  resolveChildrenFromFullTree = false,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<SpanRow | null>(null);
  const [selectedRowFullTree, setSelectedRowFullTree] = useState<SpanRow[] | undefined>(undefined);
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

      await expandRow(traceId);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [expandedRows, expandRow]
  );

  const handleRowClick = useCallback(
    async (item: SpanRow) => {
      setSelectedRow(item);
      setIsFlyoutOpen(true);

      const cached = spansCache.get(item.traceId);
      if (cached) {
        setSelectedRowFullTree(cached);
        return;
      }

      setFlyoutLoading(true);
      try {
        await expandRow(item.traceId);
        setSelectedRowFullTree(undefined);
      } finally {
        setFlyoutLoading(false);
      }
    },
    [expandRow, spansCache]
  );

  const flyoutFullTree = useMemo(() => {
    if (!selectedRow) return undefined;
    return selectedRowFullTree || spansCache.get(selectedRow.traceId);
  }, [selectedRow, selectedRowFullTree, spansCache]);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setSelectedRow(null);
    setSelectedRowFullTree(undefined);
    setFlyoutLoading(false);
  }, []);

  const getVisibleRows = useMemo(() => {
    const visible: SpanRow[] = [];

    const addRowAndChildren = (row: SpanRow, parentExpanded: boolean) => {
      if (parentExpanded || row.level === 0) {
        visible.push(row);
      }

      if (!expandedRows.has(row.id)) return;

      const fullTree = spansCache.get(row.traceId);
      const children =
        resolveChildrenFromFullTree && fullTree && row.level === 0
          ? getChildrenFromFullTree(fullTree, row.spanId)
          : row.children;

      if (children && children.length > 0) {
        children.forEach((child) => addRowAndChildren(child, true));
      }
    };

    rows.forEach((row) => addRowAndChildren(row, true));
    return visible;
  }, [rows, expandedRows, spansCache, resolveChildrenFromFullTree]);

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
        const isRowLoading = loadingState.get(item.traceId)?.loading;
        return (
          <div
            className="agtExpandableTable__kindCell"
            style={item.level ? { paddingLeft: `${item.level * 20}px` } : undefined}
          >
            {item.isExpandable && !isRowLoading && (
              <EuiButtonIcon
                size="xs"
                iconType={expandedRows.has(item.id) ? 'arrowDown' : 'arrowRight'}
                onClick={(e: React.MouseEvent) => toggleRowExpansion(e, item.id, item.traceId)}
                aria-label={
                  expandedRows.has(item.id)
                    ? i18n.translate('agentTraces.table.collapse', { defaultMessage: 'Collapse' })
                    : i18n.translate('agentTraces.table.expand', { defaultMessage: 'Expand' })
                }
                color="subdued"
                iconSize="s"
              />
            )}
            {item.isExpandable && isRowLoading && (
              <span className="agtExpandableTable__spinnerPlaceholder">
                <EuiLoadingSpinner size="s" />
              </span>
            )}
            {!item.isExpandable && <span className="agtExpandableTable__expandPlaceholder" />}
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
          {status === 'success'
            ? i18n.translate('agentTraces.table.statusSuccess', { defaultMessage: 'Success' })
            : i18n.translate('agentTraces.table.statusError', { defaultMessage: 'Error' })}
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
        <EuiText size="s" className="agtExpandableTable__truncatedText">
          {input}
        </EuiText>
      ),
    },
    {
      field: 'output',
      name: 'OUTPUT',
      render: (output: string) => (
        <EuiText size="s" className="agtExpandableTable__truncatedText">
          {output}
        </EuiText>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="agtExpandableTable__loadingState">
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          {i18n.translate('agentTraces.table.loading', {
            defaultMessage: 'Loading agent {entityLabel}...',
            values: { entityLabel },
          })}
        </EuiText>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agtExpandableTable__contentPadding">
        <EuiCallOut
          title={i18n.translate('agentTraces.table.errorTitle', {
            defaultMessage: 'Error loading {entityLabel}',
            values: { entityLabel },
          })}
          color="danger"
          iconType="alert"
        >
          <p>{error}</p>
          <EuiButton onClick={refresh} color="danger" size="s">
            {i18n.translate('agentTraces.table.retry', { defaultMessage: 'Retry' })}
          </EuiButton>
        </EuiCallOut>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="agtExpandableTable__contentPadding">
        <EuiEmptyPrompt
          iconType="apmTrace"
          title={
            <h3>
              {i18n.translate('agentTraces.table.emptyTitle', {
                defaultMessage: 'No agent {entityLabel} found',
                values: { entityLabel },
              })}
            </h3>
          }
          body={<p>{emptyDescription}</p>}
          actions={
            <EuiButton onClick={refresh} iconType="refresh">
              {i18n.translate('agentTraces.table.refresh', { defaultMessage: 'Refresh' })}
            </EuiButton>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="agtExpandableTable__contentPadding">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('agentTraces.table.showingCount', {
                defaultMessage: 'Showing {visible} of {total} {entityLabel}',
                values: {
                  visible: getVisibleRows.length,
                  total: rows.length,
                  entityLabel,
                },
              })}
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
      {isFlyoutOpen && selectedRow && (
        <TraceDetailsFlyout
          trace={selectedRow}
          onClose={closeFlyout}
          fullTree={flyoutFullTree}
          isLoadingFullTree={flyoutLoading || loadingState.get(selectedRow.traceId)?.loading}
        />
      )}
    </>
  );
};
