# Error Log Streamer - Node.js Server

## Summary

This is a **Node.js + Express** server with **WebSocket** support that fully satisfies the PRD requirements for real-time error log streaming.

## Server Architecture

### 1. Node.js Server
- ✅ **`server/index.js`** - Main Express server with WebSocket support
- ✅ **`server/services/geminiService.js`** - Gemini AI integration
- ✅ **`server/db/postgres.js`** - PostgreSQL client using `pg` package

### 2. Implemented PRD Requirements

#### ✅ REST API Endpoints
- `GET /api/start-stream?interval=5000` - Starts streaming
- `GET /api/stop-stream` - Stops streaming
- `GET /api/config` - Get current config
- `POST /api/config` - Update config (interval, template)
- `POST /api/generate-error` - Generate single error log
- `GET /api/logs` - Get logs from PostgreSQL
- `GET /api/analytics` - Get analytics from PostgreSQL
- `GET /health` - Health check

#### ✅ WebSocket Support
- `WS /ws/stream` - Real-time error log streaming
- Automatic reconnection
- Status updates
- Broadcasts to all connected clients

### 3. Frontend Updates
- ✅ Created `src/hooks/useWebSocket.ts` - WebSocket hook
- ✅ Updated `Dashboard.tsx` - Uses WebSocket for real-time updates
- ✅ Updated `Settings.tsx` - Syncs with server API
- ✅ Removed polling/interval-based approach

### 4. Dependencies Added
- `express` - HTTP server
- `ws` - WebSocket support
- `pg` - PostgreSQL client
- `@google/generative-ai` - Gemini AI (using Google Gemini API directly)
- `cors` - CORS middleware
- `dotenv` - Environment variables

## Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Vite + TS)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│   REST  │ │  WebSocket   │
│   API   │ │   /ws/stream │
└────┬────┘ └──────┬───────┘
     │             │
     └──────┬──────┘
            │
            ▼
    ┌───────────────┐
    │ Express Server│
    │  (Node.js)    │
    └───────┬───────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐   ┌──────────────┐
│PostgreSQL│   │ Gemini AI API│
│(Port 5432)│   │  (Google)   │
└─────────┘   └──────────────┘
```

## How to Run

### 1. Start PostgreSQL
```bash
cd postgress
docker-compose up -d
```

### 2. Set Environment Variables
Create `.env` file:
```bash
DATABASE_URL=postgresql://admin:admin@localhost:5432/error_log_streamer
GEMINI_API_KEY=your-api-key
PORT=3000
```

### 3. Start Server
```bash
npm run server
```

Or with auto-reload:
```bash
npm run server:dev
```

### 4. Start Frontend
```bash
npm run dev
```

## Features

✅ **Real-time Streaming** - WebSocket delivers logs instantly  
✅ **Configurable** - Update interval and prompt template via API  
✅ **PostgreSQL Integration** - All logs automatically saved  
✅ **Gemini AI** - Generates realistic synthetic error logs  
✅ **REST API** - Full API for control and data retrieval  
✅ **Health Monitoring** - Health check endpoint  

## API Examples

### Start Streaming
```bash
curl http://localhost:3000/api/start-stream?interval=5000
```

### Stop Streaming
```bash
curl http://localhost:3000/api/stop-stream
```

### Get Config
```bash
curl http://localhost:3000/api/config
```

### Update Config
```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"interval": 3000, "template": "Custom prompt..."}'
```

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/stream');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'error-log') {
    console.log('New log:', message.data);
  }
};
```

## Server Features

- ✅ **Node.js Runtime** - Standard Node.js ecosystem
- ✅ **Express.js** - HTTP server framework
- ✅ **WebSocket Support** - Real-time streaming via `ws` package
- ✅ **PostgreSQL Integration** - Using `pg` (node-postgres)
- ✅ **PRD Compliance** - All requirements fully implemented

## Notes

- The server uses in-memory configuration (can be persisted to DB if needed)
- WebSocket connections are automatically managed
- All error logs are saved to PostgreSQL automatically
- The server matches the PRD requirements exactly

