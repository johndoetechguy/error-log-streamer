// Node.js + Express server for Error Log Streamer
// Implements PRD requirements: WebSocket streaming, config management, PostgreSQL integration

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateSyntheticError } from './services/geminiService.js';
import { insertErrorLog, getErrorLogs, getAnalytics, getAIProviderSettings, saveAIProviderSettings } from './db/postgres.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/stream' });

// Middleware - CORS must be first
// Allow all origins in development (for localhost:8080)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey']
}));

app.use(express.json());

// Configuration state (in-memory, can be persisted to DB later)
let config = {
  interval: 5000, // Default 5 seconds
  template: `You are a streaming data generator. Produce one realistic API error event in JSON format only.

Generate one JSON object with these fields:
timestamp, errorCode, error, errorCategory, errorLocation, apiName, errorReason,
awsCluster, actionToBeTaken, correlationId, orderId, serviceName, errorStackTrace.

Rules:
- Output strictly valid JSON (no code blocks or explanations)
- Use current UTC time for timestamp
- Use uppercase for API and service names
- Include realistic stack traces with at least 2 nested calls
- errorCategory must be one of: API_FAILURE, VALIDATION_ERROR, SYSTEM_ERROR, NETWORK_FAILURE
- All UUIDs must be valid v4 format
- The stack trace must look authentic with multiple nested calls (e.g., DAO → Manager → Service)`
};

// Streaming state
let streamInterval = null;
let isStreaming = false;
const connectedClients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  connectedClients.add(ws);

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });

  // Send current status on connection
  ws.send(JSON.stringify({
    type: 'status',
    isStreaming,
    interval: config.interval
  }));
});

// Broadcast to all connected WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  connectedClients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Start streaming
function startStream(interval) {
  if (isStreaming) {
    return { success: false, message: 'Stream is already running' };
  }

  isStreaming = true;
  const streamIntervalMs = interval || config.interval;

  // Generate first log immediately
  generateAndBroadcast();

  // Then set up interval
  streamInterval = setInterval(async () => {
    await generateAndBroadcast();
  }, streamIntervalMs);

  broadcast({ type: 'status', isStreaming: true, interval: streamIntervalMs });
  return { success: true, message: 'Stream started', interval: streamIntervalMs };
}

// Stop streaming
function stopStream() {
  if (!isStreaming) {
    return { success: false, message: 'Stream is not running' };
  }

  isStreaming = false;
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
  }

  broadcast({ type: 'status', isStreaming: false });
  return { success: true, message: 'Stream stopped' };
}

// Generate error log and broadcast
async function generateAndBroadcast() {
  try {
    const errorLog = await generateSyntheticError(config.template);
    
    if (errorLog) {
      // Save to PostgreSQL
      try {
        await insertErrorLog(errorLog);
      } catch (dbError) {
        console.error('Database save error (non-fatal):', dbError);
      }

      // Broadcast to all WebSocket clients
      broadcast({
        type: 'error-log',
        data: errorLog,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error generating log:', error);
    broadcast({
      type: 'error',
      message: error.message || 'Failed to generate error log'
    });
  }
}

// API Routes

// GET /api/start-stream?interval=5000
app.get('/api/start-stream', (req, res) => {
  try {
    const interval = parseInt(req.query.interval) || config.interval;
    const result = startStream(interval);
    res.json(result);
  } catch (error) {
    console.error('Error in start-stream:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to start stream' 
    });
  }
});

// GET /api/stop-stream
app.get('/api/stop-stream', (req, res) => {
  try {
    const result = stopStream();
    res.json(result);
  } catch (error) {
    console.error('Error in stop-stream:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to stop stream' 
    });
  }
});

// GET /api/config
app.get('/api/config', async (req, res) => {
  try {
    const aiProvider = await getAIProviderSettings();
    res.json({
      interval: config.interval,
      template: config.template,
      isStreaming,
      aiProvider
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// POST /api/config
app.post('/api/config', async (req, res) => {
  const { interval, template, aiProvider } = req.body;

  try {
    if (interval !== undefined) {
      if (interval < 1000 || interval > 10000) {
        return res.status(400).json({ 
          error: 'Interval must be between 1000ms (1s) and 10000ms (10s)' 
        });
      }
      config.interval = interval;
      
      // If streaming, restart with new interval
      if (isStreaming) {
        stopStream();
        startStream(interval);
      }
    }

    if (template !== undefined) {
      config.template = template;
    }

    let providerSettings = null;
    if (aiProvider) {
      providerSettings = await saveAIProviderSettings(aiProvider);
    } else {
      providerSettings = await getAIProviderSettings();
    }

    res.json({
      success: true,
      config: {
        interval: config.interval,
        template: config.template
      },
      aiProvider: providerSettings
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update configuration'
    });
  }
});

// POST /api/generate-error (single generation)
app.post('/api/generate-error', async (req, res) => {
  try {
    const errorLog = await generateSyntheticError(config.template);
    
    if (!errorLog) {
      return res.status(500).json({ error: 'Failed to generate error log' });
    }

    // Save to PostgreSQL
    try {
      await insertErrorLog(errorLog);
    } catch (dbError) {
      console.error('Database save error (non-fatal):', dbError);
    }

    res.json({ log: errorLog });
  } catch (error) {
    console.error('Error generating log:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate error log' 
    });
  }
});

// GET /api/logs
app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const logs = await getErrorLogs(limit, offset);
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// GET /api/analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await getAnalytics();
    res.json({ analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    isStreaming,
    connectedClients: connectedClients.size
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Error Log Streamer API Server',
    status: 'running',
    endpoints: {
      startStream: 'GET /api/start-stream?interval=5000',
      stopStream: 'GET /api/stop-stream',
      getConfig: 'GET /api/config',
      updateConfig: 'POST /api/config',
      generateError: 'POST /api/generate-error',
      getLogs: 'GET /api/logs?limit=100&offset=0',
      getAnalytics: 'GET /api/analytics',
      health: 'GET /health',
      websocket: 'WS /ws/stream'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws/stream`);
  console.log(`📝 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🌐 CORS enabled for all origins`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopStream();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

