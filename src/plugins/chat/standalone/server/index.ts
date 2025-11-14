/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Readable } from 'stream';
import { config } from './config';

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Proxy endpoint - replicates the logic from plugin's server/routes/index.ts
app.post('/api/chat/proxy', async (req: Request, res: Response) => {
  try {
    // For standalone mode, we only support AG-UI proxy (not ML Commons)
    // To add ML Commons support, implement the forwardToMLCommonsAgent logic
    if (!config.agUiUrl) {
      return res.status(503).json({
        error: 'AG-UI URL not configured. Set AG_UI_URL in .env file.',
      });
    }

    console.log(`[Chat Proxy] Forwarding request to AG-UI: ${config.agUiUrl}`);

    // Forward the request to AG-UI server using native fetch
    const agUiResponse = await fetch(config.agUiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(req.body),
    });

    if (!agUiResponse.ok) {
      console.error(
        `[Chat Proxy] AG-UI server error: ${agUiResponse.status} ${agUiResponse.statusText}`
      );
      return res.status(agUiResponse.status).json({
        error: `AG-UI server error: ${agUiResponse.statusText}`,
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Content-Encoding', 'identity'); // Prevents compression buffering
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked'); // Enables HTTP chunked transfer
    res.setHeader('X-Accel-Buffering', 'no'); // Disables nginx buffering

    // Convert Web ReadableStream to Node.js Readable stream and pipe to response
    const reader = agUiResponse.body!.getReader();
    const stream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null); // Signal end of stream
          } else {
            this.push(Buffer.from(value)); // Push as Buffer
          }
        } catch (error) {
          console.error('[Chat Proxy] Stream read error:', error);
          this.destroy(error as Error);
        }
      },
    });

    // Handle stream errors
    stream.on('error', (error) => {
      console.error('[Chat Proxy] Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error occurred' });
      }
    });

    // Pipe the stream to the response
    stream.pipe(res);
  } catch (error) {
    console.error('[Chat Proxy] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    config: {
      agUiUrl: config.agUiUrl ? 'configured' : 'not configured',
      mlCommonsAgentId: config.mlCommonsAgentId ? 'configured' : 'not configured',
    },
  });
});

// In production, serve the built client files
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(process.cwd(), 'dist/client');
  console.log('[Server] Serving static files from:', clientDistPath);
  app.use(express.static(clientDistPath));

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  Chat Standalone Server                                ║
╠════════════════════════════════════════════════════════╣
║  Server:  http://localhost:${config.port.toString().padEnd(30)} ║
║  Proxy:   /api/chat/proxy                              ║
║  Health:  /api/health                                  ║
╠════════════════════════════════════════════════════════╣
║  AG-UI:   ${(config.agUiUrl || 'NOT CONFIGURED').padEnd(41)} ║
║  CORS:    ${config.corsOrigin.padEnd(41)} ║
╚════════════════════════════════════════════════════════╝
  `);

  if (!config.agUiUrl && !config.mlCommonsAgentId) {
    console.warn('\n⚠️  Warning: No AG-UI URL configured. Set AG_UI_URL in .env file.\n');
  }
});
