# PostgreSQL Integration Summary

## What Was Changed

### 1. Docker Compose Configuration
- **Updated container names** to be project-specific:
  - `postgres` → `error-log-streamer-postgres`
  - `adminer` → `error-log-streamer-adminer`
- **Updated database name**: `mydb` → `error_log_streamer`
- **Updated network name**: `postgres-network` → `error-log-streamer-network`
- **Updated volume name**: `postgres-data` → `error-log-streamer-postgres-data`
- **Changed Adminer port**: `8080` → `8081` (to avoid conflicts)

### 2. Database Setup
- Created `postgress/init.sql` with:
  - `error_logs` table schema
  - Indexes for performance

### 3. Database Client
- Created `server/db/postgres.js`:
  - PostgreSQL client using `pg` (node-postgres)
  - Connection pooling
  - `insertErrorLog()`, `getErrorLogs()`, and `getAnalytics()` functions

### 4. API Server
- Created `server/index.js`:
  - Node.js + Express server
  - WebSocket support for real-time streaming
  - Routes for error generation, logs, analytics, and configuration
  - CORS enabled
  - Health check endpoint at `/health`

### 5. Gemini AI Integration
- Created `server/services/geminiService.js`:
  - Direct integration with Google Gemini API
  - Uses REST API for error log generation
  - Handles JSON parsing and error cleanup

### 6. Frontend Updates
- Updated `src/pages/Dashboard.tsx`:
  - Uses `fetch()` to call Node.js API server
  - WebSocket integration for real-time updates
  - Uses `VITE_API_URL` environment variable (defaults to `http://localhost:3000`)

## How to Use

### 1. Start PostgreSQL
```bash
cd postgress
docker-compose up -d
```

### 2. Start API Server
```bash
# Set environment variables
export DATABASE_URL="postgresql://admin:admin@localhost:5432/error_log_streamer"
export GEMINI_API_KEY="your-api-key"

# Start server
npm run server

# Or with auto-reload for development
npm run server:dev
```

### 3. Start Frontend
```bash
# Set API URL (optional, defaults to http://localhost:3000)
export VITE_API_URL="http://localhost:3000"

# Start dev server
npm run dev
```

### 4. Access Adminer
- URL: http://localhost:8081
- System: PostgreSQL
- Server: postgres
- Username: admin
- Password: admin
- Database: error_log_streamer

## Environment Variables

### Backend (API Server)
- `DATABASE_URL` - PostgreSQL connection string
  - Default: `postgresql://admin:admin@localhost:5432/error_log_streamer`
- `GEMINI_API_KEY` - Google Gemini API key for error generation
- `PORT` - Server port (default: 3000)

### Frontend
- `VITE_API_URL` - API server URL
  - Default: `http://localhost:3000`

## Database Schema

### error_logs Table
- `id` - SERIAL PRIMARY KEY
- `timestamp` - TIMESTAMPTZ
- `error_code` - VARCHAR(255)
- `error` - TEXT
- `error_category` - VARCHAR(100)
- `error_location` - VARCHAR(255)
- `api_name` - VARCHAR(255)
- `error_reason` - TEXT
- `aws_cluster` - VARCHAR(255)
- `action_to_be_taken` - TEXT
- `correlation_id` - UUID
- `order_id` - UUID
- `service_name` - VARCHAR(255)
- `error_stack_trace` - TEXT
- `created_at` - TIMESTAMPTZ (default: NOW())

## API Endpoints

### POST /api/generate-error
Generates a synthetic error log and saves it to PostgreSQL.

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

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-08T07:44:16Z"
}
```

### GET /
Server info endpoint.

## Features

- ✅ Real-time error log streaming via WebSocket
- ✅ PostgreSQL integration for persistent storage
- ✅ Google Gemini AI for error generation
- ✅ Configurable stream intervals and prompt templates
- ✅ Analytics endpoints for error categorization
- ✅ RESTful API for error log management
- ✅ Health check endpoint for monitoring

