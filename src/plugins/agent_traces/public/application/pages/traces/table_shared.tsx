/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import React from 'react';

/** Maps UI column field names to PPL index field names */
export const PPL_SORT_FIELDS: Record<string, string> = {
  startTime: 'startTime',
  kind: '`attributes.gen_ai.operation.name`',
  latency: 'durationInNanos',
  name: 'name',
  status: '`status.code`',
};

/** Build a PPL sort clause from UI sort state */
export const buildPplSortClause = (field: string, direction: 'asc' | 'desc'): string => {
  const pplField = PPL_SORT_FIELDS[field] || 'startTime';
  const prefix = direction === 'desc' ? '- ' : '';
  return `| sort ${prefix}${pplField}`;
};

/** Shared loading state */
export const TableLoadingState: React.FC<{ message: React.ReactNode }> = ({ message }) => (
  <EuiEmptyPrompt
    icon={<EuiLoadingSpinner size="xl" />}
    body={
      <EuiText size="s" color="subdued">
        {message}
      </EuiText>
    }
  />
);

/** Shared empty state */
export const TableEmptyState: React.FC<{
  title: React.ReactNode;
  onRefresh: () => void;
  refreshLabel: React.ReactNode;
}> = ({ title, onRefresh, refreshLabel }) => (
  <EuiEmptyPrompt
    iconType="apmTrace"
    title={<h3>{title}</h3>}
    body={
      <p>
        <FormattedMessage
          id="agentTraces.table.emptyBody"
          defaultMessage="No AI agent spans were found in the {indexName} index. Make sure your application is instrumented with OpenTelemetry and is sending spans with {attributeName} attribute."
          values={{
            indexName: <code>otel-v1-apm-span-*</code>,
            attributeName: <code>gen_ai.operation.name</code>,
          }}
        />
      </p>
    }
    actions={
      <EuiButton onClick={onRefresh} iconType="refresh">
        {refreshLabel}
      </EuiButton>
    }
  />
);
