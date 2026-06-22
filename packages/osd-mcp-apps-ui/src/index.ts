/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Public surface of @osd/mcp-apps-ui.
//
// The real implementation is a pre-bundled artifact synced from the mcp-apps
// project (`src/vendor/logic.js` — built by `npm run build:osd-lib` there, then
// `yarn sync-vendor` here). It bundles the host-agnostic data client
// (OsUiConnection), the route catalog (handlers + views + schemas), and the UI
// mount surface (AppProviders, HostBridge, registry, PresentationFrame) into one
// ESM file with React/zod/chart.js external and the node-only AWS SigV4 stubbed
// (OSD always runs the client in `host` auth mode — see the mcp-apps repo).
//
// `src/vendor/logic.d.ts` (a sibling .d.ts) provides the hand-authored types for
// the bundle, so OSD plugin code gets a typed import without depending on the
// mcp-apps source tree or its .ts-extension import style.

export * from './vendor/logic';

// The glass theme stylesheet, scoped under the `osd` Tailwind prefix. Import
// once at plugin mount (and wrap views in a `.mcp-apps-root` container).
import './styles.scss';
