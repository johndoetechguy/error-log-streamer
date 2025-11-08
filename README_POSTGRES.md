# Error Log Streamer - PostgreSQL Integration

## Overview

This application uses **PostgreSQL directly** for persistent storage. All error logs are stored in a PostgreSQL database running via Docker Compose.

## Architecture

```
[React Frontend] → [Node.js + Express Server] → [PostgreSQL Database]
                              ↓
                        [Gemini AI API]
```

## Database Setup

### 1. Start PostgreSQL

```bash
cd postgress
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Adminer** (database admin UI) on port `8081`

### 2. Database Connection

**Connection String:**
```
postgresql://admin:admin@localhost:5432/error_log_streamer
```

**Environment Variable:**
```bash
export DATABASE_URL="postgresql://admin:admin@localhost:5432/error_log_streamer"
```

### 3. Access Adminer

- URL: http://localhost:8081
- System: PostgreSQL
- Server: postgres
- Username: admin
- Password: admin
- Database: error_log_streamer

## API Server

### Start the Server

```bash
# Set environment variables
export DATABASE_URL="postgresql://admin:admin@localhost:5432/error_log_streamer"
export GEMINI_API_KEY="your-api-key-here"

# Start server
npm run server

# Or with auto-reload for development
npm run server:dev
```

The server will run on `http://localhost:3000`

## API Endpoints

### POST /api/generate-error
Generates a synthetic error log using Gemini AI and saves it to PostgreSQL.

**Response:**
```json
{
  "log": {
    "timestamp": "2025-11-08T07:44:16Z",
    "errorCode": "PAYMENT_GATEWAY_TIMEOUT_ERR",
    "error": "Payment Request Timeout",
    ...
  }
}
```

### GET /api/logs
Retrieves error logs from PostgreSQL.

**Query Parameters:**
- `limit` (optional, default: 100) - Number of logs to return
- `offset` (optional, default: 0) - Number of logs to skip

**Example:**
```
GET /api/logs?limit=50&offset=0
```

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-11-08T07:44:16Z",
      "error_code": "PAYMENT_GATEWAY_TIMEOUT_ERR",
      ...
    }
  ]
}
```

### GET /api/analytics
Retrieves analytics data aggregated from error logs.

**Response:**
```json
{
  "analytics": [
    {
      "error_category": "NETWORK_FAILURE",
      "count": 45,
      "unique_services": 12,
      "first_occurrence": "2025-11-08T07:00:00Z",
      "last_occurrence": "2025-11-08T08:30:00Z"
    }
  ]
}
```

### GET /api/start-stream
Start streaming error logs with configurable interval.

**Query Parameters:**
- `interval` (optional, default: 5000) - Time between logs in milliseconds

**Response:**
```json
{
  "message": "Stream started",
  "interval": 5000
}
```

### GET /api/stop-stream
Stop streaming error logs.

**Response:**
```json
{
  "message": "Stream stopped"
}
```

### GET /api/config
Get current configuration (interval and prompt template).

**Response:**
```json
{
  "interval": 5000,
  "template": "Your prompt template..."
}
```

### POST /api/config
Update configuration.

**Request Body:**
```json
{
  "interval": 5000,
  "template": "Your custom prompt template..."
}
```

### WebSocket: /ws/stream
Real-time error log streaming endpoint.

**Connection:**
```
ws://localhost:3000/ws/stream
```

**Messages Received:**
- `{ type: 'error-log', data: {...} }` - New error log generated
- `{ type: 'stream-status', data: { isStreaming: boolean } }` - Streaming status updates
- `{ type: 'error', message: '...' }` - Error messages

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-08T07:44:16Z"
}
```

## Frontend Configuration

Set the API URL in your `.env` file:

```bash
VITE_API_URL=http://localhost:3000
```

Or it will default to `http://localhost:3000`

## Database Schema

The `error_logs` table includes:
- `id` - Primary key
- `timestamp` - When the error occurred
- `error_code` - Error code
- `error` - Error message
- `error_category` - Category (API_FAILURE, VALIDATION_ERROR, SYSTEM_ERROR, NETWORK_FAILURE)
- `error_location` - Where the error occurred
- `api_name` - API name
- `error_reason` - Reason for the error
- `aws_cluster` - AWS cluster information
- `action_to_be_taken` - Recommended action
- `correlation_id` - Correlation UUID
- `order_id` - Order UUID
- `service_name` - Service name
- `error_stack_trace` - Stack trace
- `created_at` - When the record was created

## Project Structure

```
error-log-streamer/
├── server/
│   ├── index.js                 # Main Express server
│   ├── services/
│   │   └── geminiService.js     # Gemini AI integration
│   └── db/
│       └── postgres.js         # PostgreSQL client
├── postgress/
│   ├── docker-compose.yml       # PostgreSQL setup
│   └── init.sql                 # Database schema
└── src/
    └── pages/
        └── Dashboard.tsx         # Frontend dashboard
```

## Notes

- The application uses **Node.js + Express** for the backend server
- All error logs are automatically saved to PostgreSQL when generated
- The database schema is automatically created when PostgreSQL starts
- Adminer provides a web UI for database management
- WebSocket support for real-time error log streaming

