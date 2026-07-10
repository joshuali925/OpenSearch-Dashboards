/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';

/**
 * Wraps a child with a tree connector from its parent: a vertical line dropping
 * from the parent row above and a horizontal branch at the child's vertical
 * center, forming an "L" so nested rows read as an indented tree (adapted from
 * the metric explorer's tree_connector).
 *
 * depth: indentation level (each level shifts right by LEVEL_INDENT px).
 * isLast: when true the vertical line stops at the branch instead of continuing
 *   down to the next sibling — giving the "L" join for the last/only child.
 * anchorY: fixed pixel offset for the horizontal branch (defaults to 50%), used
 *   when the child's connect point isn't its vertical center.
 */
const LEVEL_GAP = 12;
const LEVEL_INDENT = 24;
// How far the vertical line reaches up past this row's top edge: the row's own
// top margin (LEVEL_GAP) plus the parent row's bottom padding ($euiSizeXS, 4px),
// so the line starts exactly at the bottom of the parent's control (the search
// box) rather than extending up into it.
const TOP_REACH = LEVEL_GAP + 4;

export const withConnector = (
  depth: number,
  content: React.ReactNode,
  isLast = false,
  anchorY?: number
) => (
  <div
    style={{
      marginLeft: depth * LEVEL_INDENT,
      display: 'flex',
      alignItems: 'center',
      marginTop: LEVEL_GAP,
    }}
  >
    <div
      style={{
        alignSelf: 'stretch',
        width: 16,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -TOP_REACH,
          left: 6,
          bottom: isLast ? (anchorY !== undefined ? `calc(100% - ${anchorY}px)` : '50%') : 0,
          borderLeft: `2px solid ${euiThemeVars.euiColorLightShade}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: anchorY !== undefined ? anchorY : '50%',
          left: 6,
          right: 0,
          borderBottom: `2px solid ${euiThemeVars.euiColorLightShade}`,
        }}
      />
    </div>
    <div style={{ minWidth: 0 }}>{content}</div>
  </div>
);
