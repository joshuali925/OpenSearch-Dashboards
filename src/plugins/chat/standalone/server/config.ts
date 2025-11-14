/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file from standalone directory
// When running with tsx, __dirname is the source location, so we go up one level
dotenv.config({ path: path.join(__dirname, '../.env') });

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  agUiUrl?: string;
  mlCommonsAgentId?: string;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  agUiUrl: process.env.AG_UI_URL,
  mlCommonsAgentId: process.env.ML_COMMONS_AGENT_ID,
};

// Validate configuration
if (!config.agUiUrl && !config.mlCommonsAgentId) {
  console.warn(
    'Warning: Neither AG_UI_URL nor ML_COMMONS_AGENT_ID is set. Chat proxy will not work properly.'
  );
}
