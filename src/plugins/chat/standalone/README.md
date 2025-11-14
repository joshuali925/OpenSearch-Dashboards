# Chat Plugin - Standalone Mode

This directory contains a minimal standalone launcher for the OpenSearch Dashboards chat plugin. It allows you to run the chat interface independently without the full OpenSearch Dashboards application.

## Architecture

The standalone launcher **reuses all existing plugin code** with minimal glue code:

- **Server**: Express wrapper (~100 lines) that proxies requests to AG-UI
- **Client**: React app wrapper (~200 lines) that renders the existing ChatWindow component
- **Shared**: All components, services, and logic from `../public/` and `../common/`

**Total new code: ~300 lines** (vs ~6,600 lines reused from the plugin)

## Features

✅ Full chat functionality with AI assistant
✅ Server-Sent Events (SSE) streaming
✅ Tool execution support
✅ Conversation history
✅ Context-aware responses
✅ Same UI/UX as the OSD plugin

## Prerequisites

- Node.js 18+ (for native fetch support)
- An AG-UI server or OpenSearch ML Commons agent
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
cd src/plugins/chat/standalone
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your AG-UI server URL:

```bash
AG_UI_URL=http://localhost:8000  # Your AG-UI server
```

### 3. Run Development Mode

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```

Or run both together:
```bash
npm run dev
```

### 4. Open Browser

Navigate to: [http://localhost:5173](http://localhost:5173)

## Production Build

### Build

```bash
npm run build
```

This creates:
- `dist/client/` - Production-optimized frontend bundle
- `dist/server/` - Compiled server JavaScript

### Run Production Server

```bash
npm start
```

The server will:
1. Start Express on port 3001 (or PORT from .env)
2. Serve the built frontend files
3. Proxy chat requests to AG-UI

Open: [http://localhost:3001](http://localhost:3001)

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Frontend URL for CORS |
| `AG_UI_URL` | Yes* | - | AG-UI backend URL |
| `ML_COMMONS_AGENT_ID` | Yes* | - | ML Commons agent ID |

\* Either `AG_UI_URL` or `ML_COMMONS_AGENT_ID` must be configured.

### Using ML Commons Agent

If you have OpenSearch with ML Commons plugin:

```bash
# In .env
ML_COMMONS_AGENT_ID=your-agent-id
```

**Note:** ML Commons support in standalone mode is limited. For full support, implement the `forwardToMLCommonsAgent` logic in `server/index.ts`.

## Project Structure

```
standalone/
├── client/                          # Frontend (React)
│   ├── index.html                  # HTML template
│   ├── index.tsx                   # React entry point
│   ├── app.tsx                     # Main app component
│   ├── opensearch_dashboards_services_shim.tsx  # OSD services mock
│   └── styles.scss                 # App styles
│
├── server/                          # Backend (Express)
│   ├── index.ts                    # Express server
│   └── config.ts                   # Configuration loader
│
├── package.json                     # Dependencies
├── vite.config.ts                  # Frontend build config
├── tsconfig.json                   # TypeScript config (client)
├── tsconfig.server.json            # TypeScript config (server)
├── .env.example                    # Environment template
└── README.md                       # This file
```

## How It Works

### Code Reuse Strategy

The standalone launcher **imports directly** from the plugin:

```typescript
// In client/app.tsx
import { ChatWindow } from '../../public/components/chat_window';
import { ChatService } from '../../public/services/chat_service';
import { ChatProvider } from '../../public/contexts/chat_context';
```

### Minimal Shims

Only two small shims are needed:

1. **OpenSearchDashboards Services Shim** (`client/opensearch_dashboards_services_shim.tsx`)
   - Mocks the `useOpenSearchDashboards()` hook
   - Provides empty services object (ChatWindow declares it but doesn't use it)

2. **Express Server** (`server/index.ts`)
   - Proxies `/api/chat/proxy` to AG-UI server
   - Replicates the SSE streaming logic from plugin's server routes

### No Plugin Code Changes

**Zero modifications** to existing plugin code:
- ✅ Plugin still works in OpenSearch Dashboards
- ✅ All updates to plugin automatically work in standalone mode
- ✅ Single source of truth for all logic

## Development Tips

### Hot Module Replacement (HMR)

Vite provides instant HMR for React components. Changes to files in `client/` reload instantly.

### Server Restart

Changes to `server/` files require server restart. Use `tsx watch` (included in `dev:server` script) for auto-restart.

### Debugging

**Server logs:**
```bash
# Server shows proxy requests
[Chat Proxy] Forwarding request to AG-UI: http://localhost:8000
```

**Client debugging:**
```javascript
// ChatService and AgUiAgent have console.log statements
// Open browser DevTools Console to see streaming events
```

### Modifying Plugin Code

When you modify files in `../public/`, the standalone app will use those changes:

1. For client changes: HMR updates instantly
2. For server changes: Restart the server

## API Endpoints

### `POST /api/chat/proxy`

Proxies chat requests to AG-UI backend.

**Request body:**
```json
{
  "threadId": "string",
  "runId": "string",
  "messages": [...],
  "tools": [...],
  "context": [...],
  "state": {}
}
```

**Response:** Server-Sent Events stream

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "config": {
    "agUiUrl": "configured",
    "mlCommonsAgentId": "not configured"
  }
}
```

## Troubleshooting

### "AG-UI URL not configured"

Make sure `.env` file exists and has `AG_UI_URL` set:
```bash
cp .env.example .env
# Edit .env
```

### Port already in use

Change ports in `.env`:
```bash
PORT=3002
CORS_ORIGIN=http://localhost:5174
```

And update Vite config in `vite.config.ts`:
```typescript
server: {
  port: 5174,  // Match CORS_ORIGIN
}
```

### Import errors

Make sure you're in the correct directory:
```bash
cd src/plugins/chat/standalone
npm install
```

### CORS errors

Ensure `CORS_ORIGIN` in `.env` matches your frontend URL.

## Docker Support (Optional)

Create a `Dockerfile` in this directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy standalone app
COPY standalone/ /app/

# Copy plugin code (needed for imports)
COPY public/ /plugin/public/
COPY common/ /plugin/common/

# Install dependencies
RUN npm install

# Build
RUN npm run build

# Expose port
EXPOSE 3001

# Run
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t chat-standalone .
docker run -p 3001:3001 --env-file .env chat-standalone
```

## Contributing

When adding features to the chat plugin:

1. Add functionality to the main plugin code (`../public/`, `../server/`)
2. The standalone launcher will automatically inherit changes
3. Only update standalone code if you need to modify the wrapper/shims

## License

Copyright OpenSearch Contributors
SPDX-License-Identifier: Apache-2.0
