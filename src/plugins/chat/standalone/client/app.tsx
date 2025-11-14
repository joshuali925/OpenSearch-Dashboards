/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import '@opensearch-project/oui/dist/eui_theme_light.css';

// Import existing chat components and services from the plugin
import { ChatWindow } from '../../public/components/chat_window';
import { ChatProvider } from '../../public/contexts/chat_context';
import { ChatService } from '../../public/services/chat_service';
import { SuggestedActionsService } from '../../public/services/suggested_action';
import { ChatLayoutMode } from '../../public/components/chat_header_button';
import { OpenSearchDashboardsProvider } from './opensearch_dashboards_services_shim';

// Note: SCSS styles from the plugin are not imported to avoid SCSS variable dependencies
// The components will use OUI's default styles

/**
 * Standalone Chat Application
 *
 * This is a minimal wrapper that provides the necessary context for the chat plugin
 * to run independently of OpenSearch Dashboards.
 */
export const App: React.FC = () => {
  // Create service instances (only once)
  const chatService = useMemo(() => new ChatService(), []);
  const suggestedActionsService = useMemo(() => new SuggestedActionsService(), []);

  return (
    // Provide mock OpenSearchDashboards services
    <OpenSearchDashboardsProvider>
      <div className="standalone-chat-app">
        <header className="standalone-header">
          <div className="standalone-header-content">
            <h1>AI Chat</h1>
            <div className="standalone-header-info">
              Standalone Mode
            </div>
          </div>
        </header>

        <main className="standalone-main">
          {/* Provide chat context to the chat window */}
          <ChatProvider
            chatService={chatService}
            suggestedActionsService={suggestedActionsService}
          >
            {/* Render the chat window in fullscreen mode */}
            <ChatWindow layoutMode={ChatLayoutMode.FULLSCREEN} />
          </ChatProvider>
        </main>
      </div>
    </OpenSearchDashboardsProvider>
  );
};
