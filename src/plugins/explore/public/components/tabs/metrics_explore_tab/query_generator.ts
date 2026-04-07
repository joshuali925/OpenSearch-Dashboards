/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricType, LabelFilter, LABEL_BREAKDOWN_LIMIT } from './types';

export class MetricQueryGenerator {
  constructor(private scrapeInterval: string = '1m') {}

  public get rateInterval(): string {
    const seconds = this.parseToSeconds(this.scrapeInterval);
    const rateSeconds = Math.max(seconds * 4, 60);
    return rateSeconds >= 60 ? `${rateSeconds / 60}m` : `${rateSeconds}s`;
  }

  forMetric(name: string, type: MetricType, filters: LabelFilter[] = []): string {
    const selector = this.buildSelector(name, filters);
    switch (type) {
      case MetricType.COUNTER:
        return `rate(${selector}[${this.rateInterval}])`;
      case MetricType.HISTOGRAM:
        return `histogram_quantile(0.95, sum(rate(${selector}[${this.rateInterval}])) by (le))`;
      default:
        return selector;
    }
  }

  forSparkline(name: string, type: MetricType, filters: LabelFilter[] = []): string {
    const selector = this.buildSelector(name, filters);
    switch (type) {
      case MetricType.COUNTER:
        return `sum(rate(${selector}[${this.rateInterval}]))`;
      case MetricType.HISTOGRAM:
        return `histogram_quantile(0.95, sum(rate(${selector}[${this.rateInterval}])) by (le))`;
      default:
        return `sum(${selector})`;
    }
  }

  forBreakdown(name: string, type: MetricType, label: string, filters: LabelFilter[] = []): string {
    const selector = this.buildSelector(name, filters);
    const limit = LABEL_BREAKDOWN_LIMIT;
    switch (type) {
      case MetricType.COUNTER:
        return `topk(${limit}, sum by (${label}) (rate(${selector}[${this.rateInterval}])))`;
      case MetricType.HISTOGRAM:
        return `topk(${limit}, histogram_quantile(0.95, sum by (${label}, le) (rate(${selector}[${this.rateInterval}]))))`;
      default:
        return `topk(${limit}, sum by (${label}) (${selector}))`;
    }
  }

  private buildSelector(name: string, filters: LabelFilter[]): string {
    const matchers = [`__name__="${name}"`, ...filters.map((f) => `${f.name}="${f.value}"`)];
    return `{${matchers.join(',')}}`;
  }

  private parseToSeconds(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 60;
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(num, 10) * (multipliers[unit] || 60);
  }
}
