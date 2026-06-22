/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import {
  AppProviders,
  registry,
  routeCatalog,
  HostBridge,
  OsUiConnection,
  AppContext,
} from '@osd/mcp-apps-ui';

interface WidgetHostProps {
  /** `${appId}/${routeId}` — keys both routeCatalog (handler) and registry (view). */
  routeKey: string;
  /** Handler input (filters, ids, narrative/suggestions). */
  input: Record<string, unknown>;
  bridge: HostBridge;
  osUi: OsUiConnection;
  logger?: AppContext['logger'];
}

type State =
  | { phase: 'loading' }
  | { phase: 'ready'; props: unknown }
  | { phase: 'error'; message: string };

/**
 * Mount one mcp-apps view inside OSD: call the route's handler against the
 * host-mode data client to get the view's props, then render the view through
 * the shared AppProviders + the OSD HostBridge. This is the OSD analog of the
 * iframe shell-mount — same views, same provider stack, OSD-native data + bridge.
 */
export const WidgetHost: React.FC<WidgetHostProps> = ({
  routeKey,
  input,
  bridge,
  osUi,
  logger = console,
}) => {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const entry = registry[routeKey];
  const catalogEntry = routeCatalog[routeKey];

  // Stable key so the effect re-runs when the route or input identity changes.
  const inputKey = useMemo(() => JSON.stringify(input), [input]);

  useEffect(() => {
    let cancelled = false;
    if (!catalogEntry) {
      setState({ phase: 'error', message: `Unknown route: ${routeKey}` });
      return;
    }
    setState({ phase: 'loading' });
    catalogEntry.route
      .handler(input as never, { osUi, logger }, {})
      .then((envelope) => {
        if (cancelled) return;
        setState({ phase: 'ready', props: envelope.props });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ phase: 'error', message: String(err) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, inputKey]);

  if (!entry) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={<h2>Unknown widget</h2>}
        body={<p>No view registered for &quot;{routeKey}&quot;.</p>}
      />
    );
  }

  if (state.phase === 'loading') {
    return (
      <div
        className="mcp-apps-root"
        style={{ display: 'flex', justifyContent: 'center', padding: 48 }}
      >
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={<h2>Failed to load widget</h2>}
        body={<p>{state.message}</p>}
      />
    );
  }

  // The container class scopes the vendored glass theme (see @osd/mcp-apps-ui
  // styles.scss). AppProviders renders the view through the shared provider stack.
  return (
    <div className="mcp-apps-root">
      <AppProviders bridge={bridge} view={entry.view} props={state.props} />
    </div>
  );
};
