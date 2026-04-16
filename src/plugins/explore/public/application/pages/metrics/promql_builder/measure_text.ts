/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const measureCanvas = (() => {
  let canvas: HTMLCanvasElement | null = null;
  return (
    text: string,
    font = '14px Rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
  ): number => {
    if (!canvas) canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    return Math.ceil(ctx.measureText(text).width);
  };
})();

/**
 * Returns a minWidth style value that fits the displayed text (selected value or placeholder).
 * Adds padding for the combo box chrome (icon, borders, etc).
 */
export function comboBoxWidth(text: string, padding = 86, min = 200, max = 350): number {
  return Math.min(Math.max(measureCanvas(text) + padding, min), max);
}
