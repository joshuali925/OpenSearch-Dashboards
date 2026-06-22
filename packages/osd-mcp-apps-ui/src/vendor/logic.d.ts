/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Hand-authored declarations for the vendored bundle (src/vendor/logic.js).
// Covers the public surface OSD plugin code consumes. The bundle is JS-only
// (esbuild emits no types), and the mcp-apps-side .d.ts uses .ts/.tsx import
// specifiers that don't resolve standalone — so we describe the contract here.
// Keep in sync with mcp-apps `src/osd/index.ts` exports.

import type { ComponentType, ReactNode } from 'react';

// ─── Data client ─────────────────────────────────────────────────────────────

export type OsUiAuthMode =
  | 'aws-sigv4'
  | 'idc-cookie'
  | 'none'
  | 'basic'
  | 'anonymous'
  | 'host';

export type FetchImpl = (
  url: string | URL,
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<Response>;

export interface ConnectOptions {
  authMode?: OsUiAuthMode;
  username?: string;
  password?: string;
  fetchImpl?: FetchImpl;
}

/** The OpenSearch Dashboards HTTP data client. In OSD use authMode "host" + a
 *  fetchImpl backed by core.http. Methods are the per-API data fetches the route
 *  handlers call; the full set is large, so this declares the commonly-used ones
 *  plus an index signature for the rest. */
export class OsUiConnection {
  static create(rawEndpoint: string, region: string, options?: ConnectOptions): OsUiConnection;
  readonly endpoint: string;
  isSessionReady(): boolean;
  resolveObservabilityWorkspaceId(): Promise<string | undefined>;
  resolveDataSourceId(id?: string): Promise<string>;
  // Other per-API methods (runPpl, runPromql, listSlos, getSlo, listUnifiedAlerts,
  // describeFields, …) are present on the instance.
  [method: string]: any;
}

export function normalizeEndpoint(
  rawEndpoint: string,
  authMode: OsUiAuthMode
): { host: string; origin: string };

export class OsHttpError extends Error {
  status: number;
}
export class SsoLoginRequiredError extends Error {}
export class DataSourceResolutionError extends Error {}
export function errorMessage(err: unknown): string;

// ─── Route catalog (handlers + views + schemas) ──────────────────────────────

export interface AppContext {
  osUi: OsUiConnection;
  logger: Pick<Console, 'log' | 'warn' | 'error' | 'info'>;
  workspaceId?: string;
  indexPatternId?: string;
}

export interface AppToolExtra {
  progressToken?: string | number;
  sendNotification?: (notification: any) => Promise<void>;
}

export interface ToolResultEnvelope<P = unknown> {
  props: P;
  text?: string;
  isError?: boolean;
}

export type ToolHandler<I = any, P = any> = (
  input: I,
  ctx: AppContext,
  extra?: AppToolExtra
) => Promise<ToolResultEnvelope<P>>;

export interface ToolSpec {
  title: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface RouteSpec {
  id: string;
  tool: ToolSpec;
  propsSchema?: any;
  view?: ComponentType<{ props: any }>;
  echoHint?: string;
  handler: ToolHandler;
}

export interface AppSpec {
  id: string;
  title?: string;
  description?: string;
  routes: RouteSpec[];
}

export const apps: AppSpec[];

export interface OsdRouteEntry {
  appId: string;
  routeId: string;
  /** `${appId}/${routeId}` — matches the UI registry key. */
  key: string;
  route: RouteSpec;
}

/** Routes flattened + keyed by `${appId}/${routeId}`. */
export const routeCatalog: Record<string, OsdRouteEntry>;

export function routeUri(appId: string, routeId: string): string;
export function toolName(appId: string, routeId: string): string;
export const URI_SCHEME_PREFIX: string;

// ─── UI mount surface ─────────────────────────────────────────────────────────

export interface CallToolResult {
  structuredContent: unknown;
  isError: boolean;
}

/** Host capabilities a mounted View depends on. OSD implements this with
 *  core.http (callTool), application.navigateToUrl (openLink), etc. */
export interface HostBridge {
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
  canCallTool: boolean;
  openLink: (url: string) => Promise<boolean>;
  canOpenLink: boolean;
  sendFollowup: (text: string) => Promise<boolean>;
  canSendFollowup: boolean;
  addToContext: (text: string) => Promise<boolean>;
  canAddToContext: boolean;
}

/** Wrap a View in the host-bridge provider stack and render it. */
export function AppProviders<P>(props: {
  bridge: HostBridge;
  view: ComponentType<{ props: P | null }>;
  props: P | null;
}): ReactNode;

export interface RegistryEntry {
  appId: string;
  routeId: string;
  appTitle: string;
  view: ComponentType<{ props: any }>;
}

/** Host-agnostic view registry keyed by `${appId}/${routeId}`. */
export const registry: Record<string, RegistryEntry>;

export interface PresentationFrameProps {
  presentation: any;
  category?: string;
  title?: string;
  osdUrl?: string;
  fallbackHeadline?: ReactNode;
  children: ReactNode;
}
export function PresentationFrame(props: PresentationFrameProps): ReactNode;
export function DashboardLink(props: {
  url?: string;
  label?: string;
  compact?: boolean;
  noLogo?: boolean;
}): ReactNode;
