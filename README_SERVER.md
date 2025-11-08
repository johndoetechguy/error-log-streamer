# Error Log Streamer - Node.js Server

## Overview

This is a **Node.js + Express** server with **WebSocket** support for real-time error log streaming. It fully implements the PRD requirements.

## Features

✅ **WebSocket Streaming** - Real-time error log delivery via WebSocket  
✅ **REST API** - Full REST API for configuration and control  
✅ **PostgreSQL Integration** - All logs saved to PostgreSQL database  
✅ **Gemini AI Integration** - Uses Google Gemini AI for error generation  
✅ **Configurable** - Interval and prompt template can be updated via API  

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create a `.env` file:

```bash
DATABASE_URL=postgresql://admin:admin@localhost:5432/error_log_streamer
GEMINI_API_KEY=your-api-key-here
PORT=3000
```

### 3. Start PostgreSQL

```bash
cd postgress
docker-compose up -d
```

### 4. Start the Server

```bash
npm run server
```

Or with auto-reload:

```bash
npm run server:dev
```

## API Endpoints

### WebSocket

**WS /ws/stream**

Connects to the WebSocket server for real-time error log streaming.

**Message Types:**
- `error-log` - New error log generated
- `status` - Streaming status update
- `error` - Error message

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/stream');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'error-log') {
    console.log('New error log:', message.data);
  }
};
```

### REST API

#### GET /api/start-stream?interval=5000
Starts synthetic data streaming.

**Query Parameters:**
- `interval` (optional) - Interval in milliseconds (default: from config)

**Response:**
```json
{
  "success": true,
  "message": "Stream started",
  "interval": 5000
}
```

#### GET /api/stop-stream
Stops the stream.

**Response:**
```json
{
  "success": true,
  "message": "Stream stopped"
}
```

#### GET /api/config
Returns current configuration.

**Response:**
```json
{
  "interval": 5000,
  "template": "...",
  "isStreaming": false
}
```

#### POST /api/config
Updates configuration.

**Request Body:**
```json
{
  "interval": 3000,
  "template": "Custom prompt template..."
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "interval": 3000,
    "template": "Custom prompt template..."
  }
}
```

#### POST /api/generate-error
Generates a single error log (doesn't start streaming).

**Response:**
```json
{
  "log": {
    "timestamp": "2025-11-08T07:44:16Z",
    "errorCode": "PAYMENT_GATEWAY_TIMEOUT_ERR",
    ...
  }
}
```

#### GET /api/logs?limit=100&offset=0
Retrieves error logs from PostgreSQL.

**Query Parameters:**
- `limit` (optional, default: 100) - Number of logs to return
- `offset` (optional, default: 0) - Number of logs to skip

#### GET /api/analytics
Retrieves analytics data from PostgreSQL.

#### GET /health
Health check endpoint.

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

## Server Structure

```
server/
├── index.js              # Main Express server
├── services/
│   └── geminiService.js  # Gemini AI integration
└── db/
    └── postgres.js       # PostgreSQL client
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://admin:admin@localhost:5432/error_log_streamer` |
| `GEMINI_API_KEY` | Gemini AI API key | Required |
| `PORT` | Server port | `3000` |

## Development

### Start Development Server

```bash
npm run server:dev
```

This uses Node.js `--watch` flag for auto-reload on file changes.

### Start Frontend

```bash
npm run dev
```

## Production

### Build Frontend

```bash
npm run build
```

### Start Production Server

```bash
NODE_ENV=production npm run server
```

## Server Features

- ✅ Node.js runtime
- ✅ Express.js for HTTP server
- ✅ WebSocket support via `ws` package
- ✅ PostgreSQL via `pg` (node-postgres)
- ✅ Standard Node.js ecosystem

## Notes

- The server automatically saves all generated error logs to PostgreSQL
- WebSocket connections are managed automatically with reconnection support
- Configuration is stored in-memory (can be persisted to DB if needed)
- All endpoints include CORS headers for frontend access

