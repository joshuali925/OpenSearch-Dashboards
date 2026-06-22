/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// The OSD implementation of the mcp-apps HostBridge. This is the adapter that
// replaces the MCP iframe's postMessage bridge (useAppProps) with direct OSD
// API calls — the "change iframe events to invoke OSD API directly" step.
//
// Each capability maps to an OSD service instead of an MCP host request:
//   • openLink     → application.navigateToUrl  (was App.openLink)
//   • callTool     → run the route handler again (was App.callServerTool)
//   • sendFollowup → no-op (no LLM chat turn in OSD)
//   • addToContext → no-op (no model context in OSD)

import {
  HostBridge,
  CallToolResult,
  OsUiConnection,
  routeCatalog,
  AppContext,
} from '@osd/mcp-apps-ui';
import { ApplicationStart } from '../../../core/public';

export interface OsdBridgeDeps {
  application: ApplicationStart;
  /** The host-mode data client used to re-run handlers for callTool. */
  osUi: OsUiConnection;
  /** Logger passed into handler ctx (defaults to console). */
  logger?: AppContext['logger'];
}

/**
 * Build a HostBridge backed by OSD services. Capability flags are all true
 * except the LLM-only ones (sendFollowup/addToContext), which have no OSD
 * equivalent and resolve false so the views degrade gracefully (static pills,
 * hidden "add to context" affordance).
 */
export function createOsdBridge({
  application,
  osUi,
  logger = console,
}: OsdBridgeDeps): HostBridge {
  return {
    // "View in OpenSearch" and drill-in deep links. The mcp-apps views build an
    // absolute osdUrl against the cluster origin; navigateToUrl handles both
    // in-app and absolute URLs.
    openLink: async (url: string): Promise<boolean> => {
      try {
        await application.navigateToUrl(url);
        return true;
      } catch (err) {
        logger.error(`[observability-widgets] navigateToUrl failed: ${String(err)}`);
        return false;
      }
    },
    canOpenLink: true,

    // A widget pulling another route's data on demand (e.g. the trace finder
    // expanding a row). In OSD we re-run the target route's handler directly
    // against the same host-mode connection — no MCP round-trip.
    callTool: async (name: string, args: Record<string, unknown>): Promise<CallToolResult> => {
      const entry = Object.values(routeCatalog).find(
        (e) => `${e.appId}_${e.routeId}` === name || e.key === name
      );
      if (!entry) {
        return {
          structuredContent: { error: `Unknown route: ${name}` },
          isError: true,
        };
      }
      try {
        const envelope = await entry.route.handler(args as never, { osUi, logger }, {});
        return {
          structuredContent: envelope.props,
          isError: Boolean(envelope.isError),
        };
      } catch (err) {
        return {
          structuredContent: { error: String(err) },
          isError: true,
        };
      }
    },
    canCallTool: true,

    // No chat turn in OSD — suggestion pills render as static chips.
    sendFollowup: async (): Promise<boolean> => false,
    canSendFollowup: false,

    // No model context in OSD — the "add to context" affordance stays hidden.
    addToContext: async (): Promise<boolean> => false,
    canAddToContext: false,
  };
}
