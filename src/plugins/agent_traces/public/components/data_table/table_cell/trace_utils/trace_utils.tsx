/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiToolTip,
  EuiLink,
  EuiIcon,
  EuiText,
  EuiBadge,
  EuiButtonIcon,
  EuiHealth,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { SPAN_ID_FIELD_PATHS, TRACE_ID_FIELD_PATHS } from '../../../../utils/trace_field_constants';
import { OpenSearchSearchHit } from '../../../../types/doc_views_types';
import { DataView as Dataset } from '../../../../../../data/common';
import './trace_utils.scss';
import { validateRequiredTraceFields } from '../../../../utils/trace_field_validation';
import { extractFieldFromRowData } from '../../../../utils/trace_field_validation';
import {
  round,
  nanoToMilliSec,
} from '../../../../application/pages/traces/trace_details/utils/helper_functions';
import { getSpanCategory, getCategoryMeta } from '../../../../services/span_categorization';
import { useTraceExpansion } from '../../../../application/pages/traces/trace_expansion_context';

export const isOnTracesPage = (): boolean => {
  return window.location.pathname.includes('/agentTraces');
};

export const isSpanIdColumn = (columnId: string): boolean => {
  return columnId === 'spanId' || columnId === 'span_id' || columnId === 'spanID';
};

export const isDurationColumn = (columnId: string) => {
  return columnId === 'durationNano' || columnId === 'durationInNanos';
};

export const buildTraceDetailsUrl = (
  spanIdValue: string = '',
  traceIdValue: string,
  dataset: Dataset
): string => {
  const origin = window.location.origin;
  const pathname = window.location.pathname;

  // Get the base path before /app
  const basePathMatch = pathname.match(/^(.*?)\/app/);
  const basePath = basePathMatch ? basePathMatch[1] : '';

  let datasetParams = `dataset:(id:'${dataset?.id || 'default-dataset-id'}',title:'${
    dataset?.title || 'otel-v1-apm-span-*'
  }',type:'${dataset?.type || 'INDEX_PATTERN'}'`;

  // Add timeFieldName if present
  if (dataset?.timeFieldName) {
    datasetParams += `,timeFieldName:'${dataset.timeFieldName}'`;
  }

  // Add dataSource if present (external data source)
  // Handle both Dataset.dataSource and DataView.dataSourceRef
  const dataSourceInfo = (dataset as any)?.dataSource || (dataset as any)?.dataSourceRef;
  if (dataSourceInfo) {
    datasetParams += `,dataSource:(id:'${dataSourceInfo.id}',title:'${
      dataSourceInfo.title || dataSourceInfo.name
    }',type:'${dataSourceInfo.type}')`;
  }

  datasetParams += ')';

  // Build URL parameters
  const urlParams = `${datasetParams},spanId:'${spanIdValue}'`;
  const urlParamsWithTrace = traceIdValue ? `${urlParams},traceId:'${traceIdValue}'` : urlParams;

  return `${origin}${basePath}/app/agentTraces/traces/traceDetails#/?_a=(${urlParamsWithTrace})`;
};

export const getTraceDetailsUrlParams = (
  spanIdValue: string,
  traceIdValue: string,
  dataset: Dataset
) => {
  const dataSourceInfo = (dataset as any)?.dataSource || (dataset as any)?.dataSourceRef;

  return {
    spanId: spanIdValue,
    ...(traceIdValue && { traceId: traceIdValue }),
    dataset: {
      id: dataset?.id || 'default-dataset-id',
      title: dataset?.title || 'otel-v1-apm-span-*',
      type: dataset?.type || 'INDEX_PATTERN',
      timeFieldName: dataset?.timeFieldName || 'timestamp',
      ...(dataSourceInfo && {
        dataSource: {
          id: dataSourceInfo.id,
          title: dataSourceInfo.title || dataSourceInfo.name,
          type: dataSourceInfo.type,
        },
      }),
    },
  };
};

export const handleSpanIdNavigation = (
  rowData: OpenSearchSearchHit<Record<string, unknown>>,
  dataset: Dataset
): void => {
  // Extract spanId from row data
  const spanIdValue = extractFieldFromRowData(rowData, SPAN_ID_FIELD_PATHS);

  // Extract traceId from row data
  const traceIdValue = extractFieldFromRowData(rowData, TRACE_ID_FIELD_PATHS);

  // Build and open the URL
  const fullPageUrl = buildTraceDetailsUrl(spanIdValue, traceIdValue, dataset);
  window.open(fullPageUrl, '_blank');
};

export interface SpanIdLinkProps {
  sanitizedCellValue: string;
  rowData: OpenSearchSearchHit<Record<string, unknown>>;
  dataset: Dataset;
}

export const SpanIdLink: React.FC<SpanIdLinkProps> = ({ sanitizedCellValue, rowData, dataset }) => {
  // Validate required fields before allowing navigation
  const validationResult = validateRequiredTraceFields(rowData as any);
  const isValid = validationResult.isValid;

  const handleSpanIdClick = () => {
    if (isValid) {
      handleSpanIdNavigation(rowData, dataset);
    }
  };

  const displayValue = sanitizedCellValue.replace(/<[^>]*>/g, '').trim();

  if (!isValid) {
    // Return non-clickable text when required fields are missing
    return (
      <EuiToolTip
        content={i18n.translate('agentTraces.spanIdLink.missingFieldsTooltip', {
          defaultMessage:
            'Required trace fields are missing. Please update your data ingestion to include all required fields.',
        })}
      >
        <EuiText size="s" color="subdued">
          {displayValue}
        </EuiText>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      content={i18n.translate('agentTraces.spanIdLink.redirectTooltip', {
        defaultMessage: 'Redirect to trace details',
      })}
    >
      <EuiLink
        onClick={handleSpanIdClick}
        data-test-subj="spanIdLink"
        className="agentTracesSpanIdLink"
      >
        {displayValue}
        <EuiIcon type="popout" size="s" />
      </EuiLink>
    </EuiToolTip>
  );
};

export interface TraceNavigationContext {
  traceId: string;
  spanId: string;
  dataset: Dataset;
}

export const navigateToTraceDetailsWithSpan = (context: TraceNavigationContext): void => {
  const url = buildTraceDetailsUrl(context.spanId, context.traceId, context.dataset);
  window.open(url, '_blank');
};

export const getStatusCodeColor = (statusCode: number | undefined): string => {
  if (!statusCode) return 'default';

  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'primary';
  if (statusCode >= 400 && statusCode < 500) return 'warning';
  if (statusCode >= 500 && statusCode < 600) return 'danger';
  return 'default';
};

interface DurationTableCellProps {
  sanitizedCellValue: string;
}

export const DurationTableCell: React.FC<DurationTableCellProps> = ({ sanitizedCellValue }) => {
  const duration = sanitizedCellValue
    .replace(/<[^>]*>/g, '')
    .replace(/,/g, '')
    .trim();

  const durationLabel = `${round(nanoToMilliSec(Math.max(0, Number(duration))), 2)} ms`;

  return (
    <span className="agentTracesDocTableCell__dataField" data-test-subj="osdDocTableCellDataField">
      <span>{durationLabel}</span>
    </span>
  );
};

// --- Agent Traces Virtual Column Support ---

/** Get a stable unique ID for a hit row. PPL query results don't populate _id,
 *  so we fall back to spanId from _source. */
export const getHitId = (hit: OpenSearchSearchHit<Record<string, any>>): string => {
  return hit._id || (hit._source as any)?.spanId || '';
};

const AGENT_TRACES_VIRTUAL_COLUMNS = new Set([
  'kind',
  'status',
  'latency',
  'totalTokens',
  'input',
  'output',
]);

export const isOnAgentTracesPage = (): boolean => {
  return window.location.pathname.includes('/agentTraces');
};

export const isAgentTracesVirtualColumn = (col: string): boolean => {
  return AGENT_TRACES_VIRTUAL_COLUMNS.has(col);
};

const AgentTracesKindCell: React.FC<{ hitId: string }> = ({ hitId }) => {
  const ctx = useTraceExpansion();
  if (!ctx) return null;

  const meta = ctx.getRowMeta(hitId);
  if (!meta) return null;

  const { traceRow, level, isExpandable } = meta;
  const isTraceLoading = ctx.traceLoadingState.get(traceRow.traceId)?.loading;

  const category = getSpanCategory(traceRow);
  const catMeta = getCategoryMeta(category);

  return (
    <div
      className="agentTracesTable__kindCell"
      style={level ? { paddingLeft: `${level * 20}px` } : undefined}
    >
      {isExpandable && !isTraceLoading && (
        <EuiButtonIcon
          size="xs"
          iconType={ctx.expandedRows.has(traceRow.id) ? 'arrowDown' : 'arrowRight'}
          onClick={(e: React.MouseEvent) => ctx.toggleExpansion(e, traceRow.id, traceRow.traceId)}
          aria-label={
            ctx.expandedRows.has(traceRow.id)
              ? i18n.translate('agentTraces.dataTable.collapse', { defaultMessage: 'Collapse' })
              : i18n.translate('agentTraces.dataTable.expand', { defaultMessage: 'Expand' })
          }
          color="subdued"
          iconSize="s"
        />
      )}
      {isExpandable && isTraceLoading && (
        <span className="agentTracesTable__spinnerWrapper">
          <EuiLoadingSpinner size="s" />
        </span>
      )}
      {!isExpandable && <span className="agentTracesTable__expandSpacer" />}
      <EuiBadge className="agentTraces__categoryBadge" color={catMeta.color}>
        {catMeta.label}
      </EuiBadge>
    </div>
  );
};

const AgentTracesStatusCell: React.FC<{ status: string }> = ({ status }) => (
  <EuiHealth color={status === 'success' ? 'success' : 'danger'}>
    {status === 'success'
      ? i18n.translate('agentTraces.dataTable.statusSuccess', { defaultMessage: 'Success' })
      : i18n.translate('agentTraces.dataTable.statusError', { defaultMessage: 'Error' })}
  </EuiHealth>
);

const AgentTracesTruncatedCell: React.FC<{ value: string }> = ({ value }) => (
  <EuiText size="s" className="agentTracesTable__truncatedText">
    {value}
  </EuiText>
);

const AgentTracesTextCell: React.FC<{ value: string | number }> = ({ value }) => (
  <EuiText size="s">{value}</EuiText>
);

interface AgentTracesVirtualCellProps {
  colName: string;
  row: OpenSearchSearchHit<Record<string, unknown>>;
}

export const AgentTracesVirtualCell: React.FC<AgentTracesVirtualCellProps> = ({ colName, row }) => {
  const ctx = useTraceExpansion();
  const hitId = getHitId(row);
  const meta = ctx?.getRowMeta(hitId);
  const traceRow = meta?.traceRow;

  if (!traceRow) {
    return <td className="agentTracesDocTableCell" />;
  }

  let content: React.ReactNode;
  switch (colName) {
    case 'kind':
      content = <AgentTracesKindCell hitId={hitId} />;
      break;
    case 'status':
      content = <AgentTracesStatusCell status={traceRow.status} />;
      break;
    case 'latency':
      content = <AgentTracesTextCell value={traceRow.latency} />;
      break;
    case 'totalTokens':
      content = <AgentTracesTextCell value={traceRow.totalTokens} />;
      break;
    case 'input':
      content = <AgentTracesTruncatedCell value={traceRow.input} />;
      break;
    case 'output':
      content = <AgentTracesTruncatedCell value={traceRow.output} />;
      break;
    default:
      content = null;
  }

  return (
    <td className="agentTracesDocTableCell">
      <span
        className="agentTracesDocTableCell__dataField"
        data-test-subj="osdDocTableCellDataField"
      >
        {content}
      </span>
    </td>
  );
};
