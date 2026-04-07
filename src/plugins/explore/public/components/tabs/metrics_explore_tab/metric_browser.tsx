/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiSpacer,
  EuiButton,
  EuiTitle,
  EuiEmptyPrompt,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { MetricMetadata, MetricType, GroupingStrategy, SEARCH_DEBOUNCE_MS } from './types';
import { useExploration } from './exploration_context';
import { MetricCard } from './metric_card';
import { LabelFilterPicker, LabelFilterBadges } from './label_filter_bar';
import { LoadingIndicator, ErrorCallout } from './loading_state';

const DISPLAY_LIMITS = [20, 50, 100] as const;
type DisplayLimit = typeof DISPLAY_LIMITS[number];
const SPARKLINE_CONCURRENCY = 3;

type SparklineMap = Map<string, Array<[number, string]>>;

function useSparklines(
  metadata: Record<string, MetricMetadata>,
  client: ReturnType<typeof useExploration>['client'],
  queryGen: ReturnType<typeof useExploration>['queryGen'],
  filters: ReturnType<typeof useExploration>['state']['filters']
) {
  const [sparklines, setSparklines] = useState<SparklineMap>(new Map());
  const stateRef = useRef({
    queue: [] as string[],
    inflight: new Map<string, AbortController>(),
    pending: new Map<string, ReturnType<typeof setTimeout>>(),
    fetched: new Set<string>(),
    viewport: new Set<string>(),
    pinned: new Set<string>(),
  });

  // Reset everything when client or filters change
  useEffect(() => {
    const s = stateRef.current;
    s.queue = [];
    s.fetched.clear();
    s.pinned.clear();
    for (const [, ctrl] of s.inflight) ctrl.abort();
    s.inflight.clear();
    for (const [, timer] of s.pending) clearTimeout(timer);
    s.pending.clear();
    setSparklines(new Map());
    // Re-queue everything still in viewport
    s.queue = Array.from(s.viewport);
    drainRef.current();
  }, [client, filters]);

  const drain = useCallback(() => {
    const s = stateRef.current;
    while (s.inflight.size + s.pending.size < SPARKLINE_CONCURRENCY && s.queue.length > 0) {
      const name = s.queue.shift()!;
      if (s.fetched.has(name) || s.inflight.has(name) || s.pending.has(name)) continue;
      // Skip if no longer near viewport
      if (!s.viewport.has(name)) continue;

      const type = metadata[name]?.type || MetricType.UNKNOWN;
      const promql = queryGen.forSparkline(name, type, filters);

      const timer = setTimeout(() => {
        s.pending.delete(name);
        // Re-check viewport after delay — card may have scrolled away
        if (!s.viewport.has(name) || s.fetched.has(name)) {
          drain();
          return;
        }

        const controller = new AbortController();
        s.inflight.set(name, controller);

        client
          .queryRange(promql, controller.signal)
          .then((result) => {
            s.fetched.add(name);
            setSparklines((prev) => new Map(prev).set(name, result?.[0]?.values ?? []));
          })
          .catch(() => {})
          .finally(() => {
            s.inflight.delete(name);
            drain();
          });
      }, 200);

      s.pending.set(name, timer);
    }
  }, [metadata, client, queryGen, filters]);

  const drainRef = useRef(drain);
  drainRef.current = drain;

  const onVisibilityChange = useCallback((name: string, visible: boolean) => {
    const s = stateRef.current;
    if (visible) {
      s.viewport.add(name);
      if (!s.fetched.has(name) && !s.inflight.has(name) && !s.pending.has(name)) {
        s.queue.push(name);
        drainRef.current();
      }
    } else {
      if (s.pinned.has(name)) return;
      s.viewport.delete(name);
      // Cancel pending timer before request is sent
      const timer = s.pending.get(name);
      if (timer) {
        clearTimeout(timer);
        s.pending.delete(name);
      }
      // Abort in-flight query for this card
      const ctrl = s.inflight.get(name);
      if (ctrl) {
        ctrl.abort();
        s.inflight.delete(name);
      }
      // Remove from queue
      s.queue = s.queue.filter((n) => n !== name);
    }
  }, []);

  const enqueueNames = useCallback((names: string[]) => {
    const s = stateRef.current;
    for (const name of names) {
      if (!s.fetched.has(name) && !s.inflight.has(name) && !s.pending.has(name)) {
        s.pinned.add(name);
        s.viewport.add(name);
        s.queue.push(name);
      }
    }
    drainRef.current();
  }, []);

  return { sparklines, onVisibilityChange, enqueueNames };
}

const RECENT_KEY = 'metricsExplorer:recentlyViewed';

function getRecentlyViewed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export const MetricBrowser: React.FC = () => {
  const { state, dispatch, client, queryGen, executePromQL, refreshCounter } = useExploration();
  const [allMetrics, setAllMetrics] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<Record<string, MetricMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [debouncedSearch, setDebouncedSearch] = useState(state.search);
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [displayLimit, setDisplayLimit] = useState<DisplayLimit>(20);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(state.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [state.search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([client.getMetricNames(), client.getMetadata()])
      .then(([names, meta]) => {
        if (cancelled) return;
        setAllMetrics(names);
        setMetadata(meta);
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [client, refreshCounter]);

  // Backend search when debounced search term changes
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    client
      .searchMetricNames(debouncedSearch)
      .then((names) => {
        if (!cancelled) setSearchResults(names);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, client]);

  const displayedMetrics = useMemo(() => {
    const metrics = searchResults ?? allMetrics;
    return metrics.slice(0, displayLimit);
  }, [allMetrics, searchResults, displayLimit]);

  const grouped = useMemo(() => {
    if (state.grouping === GroupingStrategy.ALPHABETICAL) {
      return { 'All Metrics': displayedMetrics };
    }
    const groups: Record<string, string[]> = {};
    for (const m of displayedMetrics) {
      const idx = m.indexOf('_');
      const prefix = idx > 0 ? m.substring(0, idx + 1) : 'other';
      (groups[prefix] = groups[prefix] || []).push(m);
    }
    return groups;
  }, [displayedMetrics, state.grouping]);

  const recentlyViewed = useMemo(() => getRecentlyViewed(), []);

  const { sparklines, onVisibilityChange, enqueueNames } = useSparklines(
    metadata,
    client,
    queryGen,
    state.filters
  );

  const handleSelectMetric = useCallback(
    (metric: string) => {
      dispatch({ type: 'SELECT_METRIC', metric });
    },
    [dispatch]
  );

  useEffect(() => {
    if (recentlyViewed.length && Object.keys(metadata).length) {
      enqueueNames(recentlyViewed.slice(0, 6));
    }
  }, [recentlyViewed, metadata, enqueueNames]);

  const toggleSelection = useCallback((metric: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) next.delete(metric);
      else next.add(metric);
      return next;
    });
  }, []);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <ErrorCallout error={error} />;
  }

  if (!allMetrics.length) {
    return (
      <EuiEmptyPrompt
        iconType="metricsApp"
        title={<h2>Explore Your Metrics</h2>}
        body={
          <EuiText>
            <p>Browse, search, and drill into Prometheus metrics without writing PromQL.</p>
            <p>No metrics found. Ensure a Prometheus data source is configured.</p>
          </EuiText>
        }
      />
    );
  }

  const groupingOptions = [
    { id: GroupingStrategy.PREFIX, label: 'Prefix' },
    { id: GroupingStrategy.ALPHABETICAL, label: 'A-Z' },
  ];

  const limitOptions = DISPLAY_LIMITS.map((n) => ({ id: String(n), label: String(n) }));

  const totalMetrics = searchResults?.length ?? allMetrics.length;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder="Search metrics..."
            value={state.search}
            onChange={(e) => dispatch({ type: 'SET_SEARCH', search: e.target.value })}
            isClearable
            fullWidth
            compressed
            aria-label="Search metrics"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LabelFilterPicker />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Grouping"
            options={groupingOptions}
            idSelected={state.grouping}
            onChange={(id) => dispatch({ type: 'SET_GROUPING', grouping: id as GroupingStrategy })}
            buttonSize="compressed"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Display limit"
            options={limitOptions}
            idSelected={String(displayLimit)}
            onChange={(id) => setDisplayLimit(Number(id) as DisplayLimit)}
            buttonSize="compressed"
          />
        </EuiFlexItem>
        {selected.size > 0 && (
          <>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={() => {
                  const queries = Array.from(selected).map((selName) => {
                    const type = metadata[selName]?.type || MetricType.GAUGE;
                    return queryGen.forMetric(selName, type, state.filters);
                  });
                  const multiQuery = queries.map((q) => `${q};`).join('\n');
                  executePromQL(multiQuery);
                }}
                iconType="play"
                size="s"
              >
                Execute ({selected.size})
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => setSelected(new Set())} size="s">
                Clear
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>

      <LabelFilterBadges />
      <EuiSpacer size="s" />

      <EuiText size="xs" color="subdued">
        {displayedMetrics.length} of {totalMetrics.toLocaleString()} metrics
      </EuiText>
      <EuiSpacer size="s" />

      {recentlyViewed.length > 0 && !debouncedSearch && (
        <>
          <EuiTitle size="xxs">
            <h3>Recently viewed</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" wrap alignItems="flexStart">
            {recentlyViewed.slice(0, 6).map((m) => (
              <EuiFlexItem key={m} grow={false} style={{ width: 400 }}>
                <MetricCard
                  name={m}
                  metadata={metadata[m]}
                  sparkline={sparklines.get(m) ?? null}
                  isSelected={selected.has(m)}
                  onToggleSelect={() => toggleSelection(m)}
                  onNavigate={() => handleSelectMetric(m)}
                  onVisibilityChange={onVisibilityChange}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, metrics]) => (
          <div key={group}>
            <EuiTitle size="xxs">
              <h3>
                {group} ({metrics.length} metrics)
              </h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="s" wrap alignItems="flexStart">
              {metrics.map((m) => (
                <EuiFlexItem key={m} grow={false} style={{ width: 400 }}>
                  <MetricCard
                    name={m}
                    metadata={metadata[m]}
                    sparkline={sparklines.get(m) ?? null}
                    isSelected={selected.has(m)}
                    onToggleSelect={() => toggleSelection(m)}
                    onNavigate={() => handleSelectMetric(m)}
                    onVisibilityChange={onVisibilityChange}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </div>
        ))}
    </>
  );
};
