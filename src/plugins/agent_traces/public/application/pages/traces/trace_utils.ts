/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns a badge/icon color based on the operation kind string.
 * Used by both the traces table and trace details flyout.
 */
export const getKindColor = (kind?: string): string => {
  const k = (kind || '').toLowerCase();
  if (k.includes('agent')) return 'warning';
  if (k.includes('chain')) return 'secondary';
  if (k.includes('chat') || k.includes('llm') || k.includes('completion')) return 'danger';
  if (k.includes('retriev') || k.includes('vector') || k.includes('search')) return 'success';
  if (k.includes('tool') || k.includes('function')) return 'primary';
  if (k.includes('embed')) return 'accent';
  return 'default';
};

/**
 * Returns an EuiIcon-compatible color for a kind string.
 * Similar to getKindColor but returns 'subdued' as the fallback.
 */
export const getKindIconColor = (kind?: string): string => {
  const color = getKindColor(kind);
  return color === 'default' ? 'subdued' : color;
};
