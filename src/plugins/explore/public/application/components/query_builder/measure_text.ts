/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const measureCanvas = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (
    text: string,
    font = '14px Rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
  ): number => {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return text.length * 8;
    ctx.font = font;
    return Math.ceil(ctx.measureText(text).width);
  };
})();

/**
 * Returns a minWidth style value that fits the displayed text (selected value or placeholder).
 * Adds padding for the combo box chrome (icon, borders, etc).
 */
export function comboBoxWidth(text: string): number {
  return Math.min(Math.max(measureCanvas(text) + 80, 200), 700);
}

export function inputWidth(
  text: string,
  padding = 16,
  min = 50,
  max = 200,
  font = '12px Rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
): number {
  return Math.min(Math.max(measureCanvas(text, font) + padding, min), max);
}

/**
 * A minWidth that fits the widest of a set of option labels. EuiSuperSelect's
 * dropdown panel copies the control's rendered width, so a control sized only to
 * its selected value clips longer options (e.g. a short "Count" selection
 * truncating "Percentile" in the list). Sizing to the widest label keeps every
 * option readable. `pad` covers the control chrome (caret + padding); the result
 * is clamped so a very long label can't blow out the row.
 */
export function widestOptionWidth(labels: string[], pad = 44, min = 110, max = 260): number {
  const widest = labels.reduce((w, label) => Math.max(w, measureCanvas(label)), 0);
  return Math.min(Math.max(widest + pad, min), max);
}
