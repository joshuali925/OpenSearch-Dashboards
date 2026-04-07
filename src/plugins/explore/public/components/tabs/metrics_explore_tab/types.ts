/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ExplorationLevel {
  BROWSER = 'browser',
  DETAIL = 'detail',
  BREAKDOWN = 'breakdown',
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
  UNKNOWN = 'unknown',
}

export enum GroupingStrategy {
  PREFIX = 'prefix',
  ALPHABETICAL = 'alphabetical',
}

export interface ExplorationState {
  level: ExplorationLevel;
  search: string;
  metric: string;
  label: string;
  filters: LabelFilter[];
  grouping: GroupingStrategy;
}

export interface LabelFilter {
  name: string;
  value: string;
}

export interface MetricMetadata {
  name: string;
  type: MetricType;
  help: string;
  unit: string;
}

export interface LabelInfo {
  name: string;
  cardinality: number;
}

export const CACHE_TTL_DATA = 60_000;
export const CACHE_TTL_METADATA = 300_000;
export const CACHE_MAX_ENTRIES = 500;
export const METRIC_LIMIT = 5000;
export const LABEL_BREAKDOWN_LIMIT = 20;
export const SEARCH_DEBOUNCE_MS = 300;

export const TYPE_COLORS: Record<MetricType, string> = {
  [MetricType.COUNTER]: 'primary',
  [MetricType.GAUGE]: 'success',
  [MetricType.HISTOGRAM]: 'warning',
  [MetricType.SUMMARY]: 'accent',
  [MetricType.UNKNOWN]: 'default',
};
