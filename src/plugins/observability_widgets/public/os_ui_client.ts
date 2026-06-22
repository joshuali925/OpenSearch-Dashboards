/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Build the mcp-apps data client (OsUiConnection) for use inside OSD. We run it
// in `host` auth mode with a fetchImpl backed by core.http, so:
//   • no SigV4 / `/_login/` handshake (the AWS SDK is stubbed out of the bundle),
//   • core.http auto-attaches the session cookie, osd-xsrf, base path, and
//     osd-version — the transport adds no auth headers of its own,
//   • requests hit OSD's own /api/... routes in the same instance.

import { OsUiConnection, FetchImpl } from '@osd/mcp-apps-ui';
import { HttpStart } from '../../../core/public';

/**
 * Wrap core.http as the FetchImpl the transport expects. The transport builds a
 * full absolute URL (against the connection's nominal endpoint) and passes
 * method/headers/body; we extract the path + query and hand them to
 * `http.fetch`, which prepends the base path and attaches xsrf/cookie. The raw
 * Response is returned so the transport can read status, text, and Set-Cookie.
 */
function coreHttpFetch(http: HttpStart): FetchImpl {
  return async (url, init) => {
    const u = typeof url === 'string' ? new URL(url) : url;
    // core.http wants a server-relative path; it prepends the base path itself.
    const path = `${u.pathname}${u.search}`;
    return (http.fetch(path, {
      method: init.method,
      // Don't forward the transport's synthetic headers (user-agent, etc.);
      // core.http supplies the ones OSD needs. Body is a pre-stringified JSON.
      body: init.body,
      // Return the raw Response so the transport reads status/text/Set-Cookie.
      asResponse: true,
      // The body is already a JSON string — stop core.http from re-stringifying.
      prependBasePath: true,
    }) as unknown) as Promise<Response>;
  };
}

/**
 * Create a host-mode OsUiConnection. `endpoint` is nominal (only used to build
 * URL paths the fetchImpl consumes) — default to the current origin.
 */
export function createOsUiConnection(http: HttpStart): OsUiConnection {
  const endpoint =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : 'http://localhost:5601';
  return OsUiConnection.create(endpoint, '', {
    authMode: 'host',
    fetchImpl: coreHttpFetch(http),
  });
}
