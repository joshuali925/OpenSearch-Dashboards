/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRowCell,
  EuiText,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { i18n } from '@osd/i18n';
import { FormattedMessage } from '@osd/i18n/react';
import './traces_table.scss';
import './flyout/trace_details_flyout.scss';
import { useTraceFlyout } from './flyout/trace_flyout_context';
import { TraceRow } from './hooks/use_agent_traces';
import { useAgentSpans, SpanRow } from './hooks/use_agent_spans';
import { useTraceMetricsContext } from './hooks/use_trace_metrics';
import { getSpanCategory, getCategoryBadgeStyle } from '../../../services/span_categorization';
import { CATEGORY_BADGE_CLASS } from './flyout/tree_helpers';
import { renderStatus, TableLoadingState, TableEmptyState } from './table_shared';

interface ColumnDef {
  field: string;
  name: string;
  width?: string;
  textOnly?: boolean;
  render: (item: SpanRow) => React.ReactNode;
}

const NUM_COLUMNS = 8;

export const SpansTable = () => {
  const {
    spans,
    loading,
    isFetchingMore,
    hasMore,
    error,
    refresh,
    fetchMore,
    expandSpan,
    spanSpansCache,
  } = useAgentSpans();
  const { metrics } = useTraceMetricsContext();

  const { openFlyout, updateFlyoutFullTree } = useTraceFlyout();
  const flyoutTraceIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync full tree from cache to flyout when cache updates
  useEffect(() => {
    const traceId = flyoutTraceIdRef.current;
    if (!traceId) return;
    const cached = spanSpansCache.get(traceId);
    if (cached) {
      updateFlyoutFullTree((cached as unknown) as TraceRow[], false);
    }
  }, [spanSpansCache, updateFlyoutFullTree]);

  const handleRowClick = useCallback(
    async (item: SpanRow) => {
      flyoutTraceIdRef.current = item.traceId;
      openFlyout((item as unknown) as TraceRow);

      const cached = spanSpansCache.get(item.traceId);
      if (cached) {
        updateFlyoutFullTree((cached as unknown) as TraceRow[], false);
        return;
      }

      await expandSpan(item.traceId);
    },
    [expandSpan, spanSpansCache, openFlyout, updateFlyoutFullTree]
  );

  const columns: ColumnDef[] = useMemo(
    () => [
      {
        field: 'startTime',
        name: i18n.translate('agentTraces.spansTable.timeColumn', { defaultMessage: 'Time' }),
        width: '200px',
        render: (item: SpanRow) => <EuiLink color="primary">{item.startTime}</EuiLink>,
      },
      {
        field: 'kind',
        name: i18n.translate('agentTraces.spansTable.kindColumn', { defaultMessage: 'Kind' }),
        render: (item: SpanRow) => {
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
        },
      },
      {
        field: 'name',
        name: i18n.translate('agentTraces.spansTable.nameColumn', { defaultMessage: 'Name' }),
        render: (item: SpanRow) => <EuiText size="s">{item.name}</EuiText>,
      },
      {
        field: 'status',
        width: '100px',
        name: i18n.translate('agentTraces.spansTable.statusColumn', { defaultMessage: 'Status' }),
        render: (item: SpanRow) => renderStatus(item.status),
      },
      {
        field: 'latency',
        width: '100px',
        name: i18n.translate('agentTraces.spansTable.latencyColumn', {
          defaultMessage: 'Latency',
        }),
        render: (item: SpanRow) => <EuiText size="s">{item.latency}</EuiText>,
      },
      {
        field: 'totalTokens',
        name: i18n.translate('agentTraces.spansTable.tokensColumn', { defaultMessage: 'Tokens' }),
        render: (item: SpanRow) => <EuiText size="s">{item.totalTokens}</EuiText>,
      },
      {
        field: 'input',
        name: i18n.translate('agentTraces.spansTable.inputColumn', { defaultMessage: 'Input' }),
        width: '175px',
        render: (item: SpanRow) => (
          <EuiText size="s" className="agentTracesTable__truncatedText">
            {item.input}
          </EuiText>
        ),
      },
      {
        field: 'output',
        name: i18n.translate('agentTraces.spansTable.outputColumn', { defaultMessage: 'Output' }),
        width: '175px',
        render: (item: SpanRow) => (
          <EuiText size="s" className="agentTracesTable__truncatedText">
            {item.output}
          </EuiText>
        ),
      },
    ],
    []
  );

  const virtualizer = useVirtualizer({
    count: spans.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 32,
    overscan: 10,
    getItemKey: (index) => spans[index]?.id ?? String(index),
  });

  // Prefetch next page when scrolling near the bottom
  const virtualItems = virtualizer.getVirtualItems();
  const lastItemIndex = virtualItems[virtualItems.length - 1]?.index;
  useEffect(() => {
    if (lastItemIndex == null) return;
    if (lastItemIndex >= spans.length - 10) {
      fetchMore();
    }
  }, [lastItemIndex, spans.length, fetchMore]);

  if (loading && spans.length === 0) {
    return (
      <TableLoadingState
        message={
          <FormattedMessage
            id="agentTraces.spansTable.loadingText"
            defaultMessage="Loading agent spans..."
          />
        }
      />
    );
  }

  // upstream component will handle error state
  if (error) {
    return null;
  }

  if (spans.length === 0) {
    return (
      <TableEmptyState
        title={
          <FormattedMessage
            id="agentTraces.spansTable.emptyTitle"
            defaultMessage="No agent spans found"
          />
        }
        onRefresh={refresh}
        refreshLabel={
          <FormattedMessage id="agentTraces.spansTable.refreshButton" defaultMessage="Refresh" />
        }
      />
    );
  }

  return (
    <div className="agentTracesTable__container">
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="agentTraces.spansTable.showingCount"
          defaultMessage="Showing {count} spans"
          values={{ count: metrics?.totalSpans ?? spans.length }}
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
              const item = spans[vRow.index];
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
                id="agentTraces.spansTable.loadingMore"
                defaultMessage="Loading more spans..."
              />
            </EuiText>
          </div>
        )}
        {!hasMore && spans.length > 0 && (
          <div className="agentTracesTable__loadingMore">
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="agentTraces.spansTable.allLoaded"
                defaultMessage="All spans loaded"
              />
            </EuiText>
          </div>
        )}
      </div>
    </div>
  );
};
