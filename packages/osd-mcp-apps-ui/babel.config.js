/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Mirrors packages/osd-apm-topology: babel transpiles the thin src/ wrapper.
// The heavy logic+UI lives in src/vendor/logic.js — a pre-bundled, already-
// transpiled ESM artifact synced from the mcp-apps project (see
// scripts/sync-vendor.mjs). babel just copies it through (--copy-files) and
// compiles the small re-export wrapper around it.

const isTest = process.env.NODE_ENV === 'test';

module.exports = {
  plugins: [
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
    '@babel/plugin-transform-class-properties',
  ],
  env: {
    web: {
      presets: ['@osd/babel-preset/webpack_preset'],
    },
    node: {
      presets: ['@osd/babel-preset/node_preset'],
    },
  },
  // The vendored bundle is already transpiled — don't re-run babel over it.
  // Declaration files (*.d.ts) carry no runtime code and have initializer-less
  // `export const` forms babel's parser rejects — skip them (they're copied via
  // --copy-files for type resolution, not transpiled).
  ignore: [
    'src/vendor/logic.js',
    'src/vendor/logic.js.map',
    '**/*.d.ts',
    ...(isTest ? [] : ['**/*.test.ts', '**/*.test.tsx']),
  ],
};
