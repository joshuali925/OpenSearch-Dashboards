/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRowCell,
  EuiButtonIcon,
  EuiText,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { i18n } from '@osd/i18n';
import { FormattedMessage } from '@osd/i18n/react';
import { useTraceFlyout } from './flyout/trace_flyout_context';
import { useAgentTraces, TraceRow, getChildrenFromFullTree } from './hooks/use_agent_traces';
import { useTraceMetricsContext } from './hooks/use_trace_metrics';
import { getSpanCategory, getCategoryBadgeStyle } from '../../../services/span_categorization';
import { CATEGORY_BADGE_CLASS } from './flyout/tree_helpers';
import { renderStatus, TableLoadingState, TableEmptyState } from './table_shared';
import './traces_table.scss';
import './flyout/trace_details_flyout.scss';

interface ColumnDef {
  field: string;
  name: string;
  width?: string;
  textOnly?: boolean;
  render: (item: TraceRow) => React.ReactNode;
}

const NUM_COLUMNS = 8;

export const TracesTable = () => {
  const {
    traces,
    loading,
    isFetchingMore,
    hasMore,
    error,
    refresh,
    fetchMore,
    expandTrace,
    traceSpansCache,
    traceLoadingState,
  } = useAgentTraces();
  const { metrics } = useTraceMetricsContext();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { openFlyout, updateFlyoutFullTree } = useTraceFlyout();
  const flyoutTraceIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync full tree from cache to flyout when cache updates
  useEffect(() => {
    const traceId = flyoutTraceIdRef.current;
    if (!traceId) return;
    const cached = traceSpansCache.get(traceId);
    if (cached) {
      updateFlyoutFullTree(cached, false);
    }
  }, [traceSpansCache, updateFlyoutFullTree]);

  // Show error state in flyout when fetch fails (network error, etc.)
  useEffect(() => {
    const traceId = flyoutTraceIdRef.current;
    if (!traceId) return;
    const loadState = traceLoadingState.get(traceId);
    if (loadState && !loadState.loading && loadState.error) {
      updateFlyoutFullTree(undefined, false, loadState.error);
    }
  }, [traceLoadingState, updateFlyoutFullTree]);

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
      flyoutTraceIdRef.current = item.traceId;
      openFlyout(item);

      const cached = traceSpansCache.get(item.traceId);
      if (cached) {
        updateFlyoutFullTree(cached, false);
        return;
      }

      await expandTrace(item.traceId);
    },
    [expandTrace, traceSpansCache, openFlyout, updateFlyoutFullTree]
  );

  // Flatten tree structure for display, respecting expanded state
  const getVisibleRows = useMemo(() => {
    const visible: TraceRow[] = [];

    const addRowAndChildren = (row: TraceRow, parentExpanded: boolean) => {
      if (parentExpanded || row.level === 0) {
        visible.push(row);
      }

      if (!expandedRows.has(row.id)) return;

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

  const columns: ColumnDef[] = useMemo(
    () => [
      {
        field: 'startTime',
        name: i18n.translate('agentTraces.tracesTable.timeColumn', { defaultMessage: 'Time' }),
        width: '200px',
        render: (item: TraceRow) => <EuiLink color="primary">{item.startTime}</EuiLink>,
      },
      {
        field: 'kind',
        name: i18n.translate('agentTraces.tracesTable.kindColumn', { defaultMessage: 'Kind' }),
        render: (item: TraceRow) => {
          const isTraceLoading = traceLoadingState.get(item.traceId)?.loading;
          return (
            <div
              className="agentTracesTable__kindCell"
              style={item.level ? { paddingLeft: `${item.level * 20}px` } : undefined}
            >
              {item.isExpandable && !isTraceLoading && (
                <EuiButtonIcon
                  size="xs"
                  iconType={expandedRows.has(item.id) ? 'arrowDown' : 'arrowRight'}
                  onClick={(e: React.MouseEvent) => toggleRowExpansion(e, item.id, item.traceId)}
                  aria-label={
                    expandedRows.has(item.id)
                      ? i18n.translate('agentTraces.tracesTable.collapse', {
                          defaultMessage: 'Collapse',
                        })
                      : i18n.translate('agentTraces.tracesTable.expand', {
                          defaultMessage: 'Expand',
                        })
                  }
                  color="subdued"
                  iconSize="s"
                />
              )}
              {item.isExpandable && isTraceLoading && (
                <span className="agentTracesTable__spinnerWrapper">
                  <EuiLoadingSpinner size="s" />
                </span>
              )}
              {!item.isExpandable && <span className="agentTracesTable__expandSpacer" />}
              {(() => {
                const category = getSpanCategory(item);
                const modifier = CATEGORY_BADGE_CLASS[category];
                return (
                  <span
                    className={`agentTracesFlyout__kindBadge agentTracesFlyout__kindBadge--${modifier}`}
                    style={getCategoryBadgeStyle(category)}
                  >
                    {category}
                  </span>
                );
              })()}
            </div>
          );
        },
      },
      {
        field: 'name',
        name: i18n.translate('agentTraces.tracesTable.nameColumn', { defaultMessage: 'Name' }),
        render: (item: TraceRow) => <EuiText size="s">{item.name}</EuiText>,
      },
      {
        field: 'status',
        width: '100px',
        name: i18n.translate('agentTraces.tracesTable.statusColumn', {
          defaultMessage: 'Status',
        }),
        render: (item: TraceRow) => renderStatus(item.status),
      },
      {
        field: 'latency',
        width: '100px',
        name: i18n.translate('agentTraces.tracesTable.latencyColumn', {
          defaultMessage: 'Latency',
        }),
        render: (item: TraceRow) => <EuiText size="s">{item.latency}</EuiText>,
      },
      {
        field: 'totalTokens',
        name: i18n.translate('agentTraces.tracesTable.tokensColumn', {
          defaultMessage: 'Tokens',
        }),
        render: (item: TraceRow) => <EuiText size="s">{item.totalTokens}</EuiText>,
      },
      {
        field: 'input',
        name: i18n.translate('agentTraces.tracesTable.inputColumn', { defaultMessage: 'Input' }),
        width: '175px',
        render: (item: TraceRow) => (
          <EuiText size="s" className="agentTracesTable__truncatedText">
            {item.input}
          </EuiText>
        ),
      },
      {
        field: 'output',
        name: i18n.translate('agentTraces.tracesTable.outputColumn', {
          defaultMessage: 'Output',
        }),
        width: '175px',
        render: (item: TraceRow) => (
          <EuiText size="s" className="agentTracesTable__truncatedText">
            {item.output}
          </EuiText>
        ),
      },
    ],
    [expandedRows, traceLoadingState, toggleRowExpansion]
  );

  const virtualizer = useVirtualizer({
    count: getVisibleRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 32,
    overscan: 10,
    getItemKey: (index) => getVisibleRows[index]?.id ?? String(index),
  });

  // Prefetch next page when scrolling near the bottom
  const virtualItems = virtualizer.getVirtualItems();
  const lastItemIndex = virtualItems[virtualItems.length - 1]?.index;
  useEffect(() => {
    if (lastItemIndex == null) return;
    if (lastItemIndex >= getVisibleRows.length - 10) {
      fetchMore();
    }
  }, [lastItemIndex, getVisibleRows.length, fetchMore]);

  if (loading && traces.length === 0) {
    return (
      <TableLoadingState
        message={
          <FormattedMessage
            id="agentTraces.tracesTable.loading"
            defaultMessage="Loading agent traces..."
          />
        }
      />
    );
  }

  // upstream component will handle error state
  if (error) {
    return null;
  }

  if (traces.length === 0) {
    return (
      <TableEmptyState
        title={
          <FormattedMessage
            id="agentTraces.tracesTable.emptyTitle"
            defaultMessage="No agent traces found"
          />
        }
        onRefresh={refresh}
        refreshLabel={
          <FormattedMessage id="agentTraces.tracesTable.refreshButton" defaultMessage="Refresh" />
        }
      />
    );
  }

  return (
    <div className="agentTracesTable__container">
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="agentTraces.tracesTable.showingCount"
          defaultMessage="Showing {count} traces"
          values={{ count: metrics?.totalTraces ?? traces.length }}
        />
      </EuiText>
      <div ref={scrollContainerRef} className="agentTracesTable__scrollContainer">
        <EuiTable compressed tableLayout="fixed">
          <EuiTableHeader>
            {columns.map((col) => (
              <EuiTableHeaderCell key={col.field} width={col.width}>
                {col.name}
              </EuiTableHeaderCell>
            ))}
          </EuiTableHeader>
          <tbody>
            {virtualItems.length > 0 && (
              <tr>
                <td colSpan={NUM_COLUMNS} style={{ height: virtualItems[0].start, padding: 0 }} />
              </tr>
            )}
            {virtualItems.map((vRow) => {
              const item = getVisibleRows[vRow.index];
              return (
                <tr
                  key={vRow.key}
                  ref={virtualizer.measureElement}
                  data-index={vRow.index}
                  className="euiTableRow euiTableRow-isClickable agentTracesTable__clickableRow euiTableRow--isCompressed"
                  onClick={() => handleRowClick(item)}
                >
                  {columns.map((col) => (
                    <EuiTableRowCell key={col.field} width={col.width} textOnly={col.textOnly}>
                      {col.render(item)}
                    </EuiTableRowCell>
                  ))}
                </tr>
              );
            })}
            {virtualItems.length > 0 && (
              <tr>
                <td
                  colSpan={NUM_COLUMNS}
                  style={{
                    height:
                      virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1].end || 0),
                    padding: 0,
                  }}
                />
              </tr>
            )}
          </tbody>
        </EuiTable>
        {isFetchingMore && (
          <div className="agentTracesTable__loadingMore">
            <EuiLoadingSpinner size="m" />
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="agentTraces.tracesTable.loadingMore"
                defaultMessage="Loading more traces..."
              />
            </EuiText>
          </div>
        )}
        {!hasMore && traces.length > 0 && (
          <div className="agentTracesTable__loadingMore">
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="agentTraces.tracesTable.allLoaded"
                defaultMessage="All traces loaded"
              />
            </EuiText>
          </div>
        )}
      </div>
    </div>
  );
};
