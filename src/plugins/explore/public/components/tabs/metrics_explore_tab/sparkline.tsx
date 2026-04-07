/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

export function renderSvgLine(
  values: Array<[number, string]>,
  w: number,
  h: number,
  stroke = '#006BB4'
): JSX.Element {
  const nums = values.map(([, v]) => parseFloat(v)).filter((v) => !isNaN(v));
  if (nums.length < 2) {
    return (
      <EuiText size="xs" color="subdued">
        No data
      </EuiText>
    );
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min;
  const points = nums
    .map((v, i) => {
      const x = (i / (nums.length - 1)) * w;
      const y = range === 0 ? h / 2 : h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
}
