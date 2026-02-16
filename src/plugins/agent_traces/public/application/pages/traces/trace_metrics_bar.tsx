/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { TraceMetrics } from './use_trace_metrics';

interface TraceMetricsBarProps {
  metrics: TraceMetrics | null;
  loading: boolean;
}

const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return value.toLocaleString();
};

const formatLatency = (seconds: number): string => {
  if (seconds === 0) return '0.00s';
  if (seconds < 0.01) return `${(seconds * 1000).toFixed(0)}ms`;
  return `${seconds.toFixed(2)}s`;
};

const MetricItem: React.FC<{ label: string; value: string; loading?: boolean }> = ({
  label,
  value,
  loading: isLoading,
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {label}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {isLoading ? (
        <EuiLoadingSpinner size="s" />
      ) : (
        <EuiText size="s">
          <strong>{value}</strong>
        </EuiText>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const TraceMetricsBar: React.FC<TraceMetricsBarProps> = ({ metrics, loading }) => {
  if (loading && !metrics) {
    return (
      <div style={{ padding: '4px 0 8px' }}>
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div style={{ padding: '4px 0 8px' }}>
      <EuiFlexGroup gutterSize="l" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <MetricItem
            label={i18n.translate('agentTraces.metrics.totalTraces', {
              defaultMessage: 'Total Traces',
            })}
            value={formatNumber(metrics.totalTraces)}
            loading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricItem
            label={i18n.translate('agentTraces.metrics.totalSpans', {
              defaultMessage: 'Total Spans',
            })}
            value={formatNumber(metrics.totalSpans)}
            loading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricItem
            label={i18n.translate('agentTraces.metrics.totalTokens', {
              defaultMessage: 'Total Tokens',
            })}
            value={formatNumber(metrics.totalTokens)}
            loading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricItem
            label={i18n.translate('agentTraces.metrics.latencyP50', {
              defaultMessage: 'Latency P50',
            })}
            value={formatLatency(metrics.latencyP50Seconds)}
            loading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricItem
            label={i18n.translate('agentTraces.metrics.latencyP99', {
              defaultMessage: 'Latency P99',
            })}
            value={formatLatency(metrics.latencyP99Seconds)}
            loading={loading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
