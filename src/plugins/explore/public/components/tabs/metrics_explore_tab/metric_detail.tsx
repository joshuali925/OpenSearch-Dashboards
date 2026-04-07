/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiTitle,
  EuiText,
  EuiPanel,
  EuiBadge,
} from '@elastic/eui';
import { LabelInfo, MetricType } from './types';
import { useExploration } from './exploration_context';
import { renderSvgLine } from './sparkline';
import { LoadingIndicator, ErrorCallout } from './loading_state';

export const MetricDetail: React.FC = () => {
  const { state, dispatch, client, queryGen, executePromQL, refreshCounter } = useExploration();
  const [chartData, setChartData] = useState<Array<[number, string]>>([]);
  const [labels, setLabels] = useState<LabelInfo[]>([]);
  const [metadata, setMetadata] = useState<{ type: MetricType; help: string; unit: string }>({
    type: MetricType.UNKNOWN,
    help: '',
    unit: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const promql = queryGen.forMetric(state.metric, metadata.type, state.filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      try {
        const allMeta = await client.getMetadata();
        const meta = allMeta[state.metric];
        if (meta && !cancelled) {
          setMetadata({ type: meta.type, help: meta.help, unit: meta.unit });
        }

        const type = meta?.type || MetricType.GAUGE;
        const query = queryGen.forMetric(state.metric, type, state.filters);
        const result = await client.queryRange(query);
        if (!cancelled && result?.[0]?.values) {
          setChartData(result[0].values);
        }

        const labelNames = await client.getLabelsForMetric(state.metric);
        if (!cancelled) {
          const labelInfos: LabelInfo[] = await Promise.all(
            labelNames.map(async (name) => {
              const vals = await client.getLabelValues(name, `{__name__="${state.metric}"}`);
              return { name, cardinality: vals.length };
            })
          );
          setLabels(labelInfos);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [state.metric, state.filters, client, queryGen, refreshCounter]);

  const renderChart = () => {
    if (!chartData.length)
      return (
        <EuiText size="s" color="subdued">
          No data
        </EuiText>
      );
    return renderSvgLine(chartData, 700, 200);
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <ErrorCallout error={error} />;
  }

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{state.metric}</h2>
          </EuiTitle>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge>{metadata.type}</EuiBadge>
            </EuiFlexItem>
            {metadata.unit && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{metadata.unit}</EuiBadge>
              </EuiFlexItem>
            )}
            {metadata.help && (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {metadata.help}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="play" onClick={() => executePromQL(promql)} size="s" fill>
            Execute
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiText size="xs" color="subdued">
        <code>{promql}</code> (auto)
      </EuiText>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="m" hasBorder>
        {renderChart()}
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiTitle size="xs">
        <h3>Labels</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap>
        {labels.map((l) => (
          <EuiFlexItem key={l.name} grow={false}>
            <EuiPanel
              paddingSize="s"
              hasBorder
              onClick={() => dispatch({ type: 'SELECT_LABEL', label: l.name })}
              style={{ cursor: 'pointer', textAlign: 'center', minWidth: 100 }}
              aria-label={`Drill into label ${l.name}`}
            >
              <EuiText size="s" style={{ fontWeight: 600 }}>
                {l.name}
              </EuiText>
              <EuiText size="xs" color="subdued">
                ({l.cardinality})
              </EuiText>
              {l.cardinality > 100 && (
                <EuiBadge color="warning" iconType="alert">
                  high
                </EuiBadge>
              )}
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
