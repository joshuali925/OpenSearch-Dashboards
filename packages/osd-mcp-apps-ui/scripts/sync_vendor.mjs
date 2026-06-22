#!/usr/bin/env node
/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Copy the freshly-built OSD library bundle from the sibling mcp-apps project
// into this package's src/vendor/. Run after `npm run build:osd-lib` in
// mcp-apps. Override the source location with MCP_APPS_DIR.
//
//   MCP_APPS_DIR=/path/to/mcp-apps node scripts/sync-vendor.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');
const VENDOR = path.join(PKG, 'src', 'vendor');

// Default: ../../../mcp-apps relative to the OSD repo root (the os-3.0 layout).
const MCP_APPS_DIR =
  process.env.MCP_APPS_DIR ||
  path.resolve(PKG, '..', '..', '..', 'mcp-apps');

const SRC_DIR = path.join(MCP_APPS_DIR, 'dist', 'osd');
const FILES = ['logic.js', 'logic.js.map', 'global.css'];

async function main() {
  await fs.mkdir(VENDOR, { recursive: true });
  for (const f of FILES) {
    const src = path.join(SRC_DIR, f);
    try {
      await fs.copyFile(src, path.join(VENDOR, f));
      console.log(`[sync-vendor] ${f}`);
    } catch (err) {
      console.error(
        `[sync-vendor] missing ${src} — run \`npm run build:osd-lib\` in mcp-apps first.\n  ${err.message}`
      );
      process.exit(1);
    }
  }
  console.log(`[sync-vendor] synced from ${SRC_DIR}`);
}

await main();
