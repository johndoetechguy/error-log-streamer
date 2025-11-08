// Node.js + Express server for Error Log Streamer
// Implements PRD requirements: WebSocket streaming, config management, PostgreSQL integration

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateSyntheticError } from './services/geminiService.js';
import {
  insertErrorLog,
  getErrorLogs,
  getAnalytics,
  getAIProviderSettings,
  saveAIProviderSettings,
  getAppConfig,
  upsertAppConfig,
  purgeAllData,
} from './db/postgres.js';

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
  template: `You are a streaming data generator. Produce one realistic API error event in strict JSON format only.

Formatting requirements:
- errorCode, serviceName, errorCategory, errorLocation, and apiName must be uppercase with underscores (e.g. PAYMENT_GATEWAY_TIMEOUT_ERR).
- orderId and correlationId must be valid UUID v4 strings.
- errorStackTrace must be a realistic multi-line stack trace with at least 3 frames.
- Return valid JSON with double-quoted keys and no trailing commas.

Variation requirements:
- Maintain at most {{VARIATION_LIMIT}} distinct values across errorCode, serviceName, errorCategory, errorLocation, and apiName.
- After reaching the limit, reuse previously emitted values while still varying combinations and other fields.
- Keep the response coherent with the generated identifiers and timestamps.

Output rules:
- Emit a single JSON object only. No explanations, comments, or code fences.`
};

const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';
const FALLBACK_GEMINI_API_URL = 'https://generativelanguage.googleapis.com';
const FALLBACK_OLLAMA_MODEL = 'llama3.2:3b';
const FALLBACK_OLLAMA_API_URL = 'http://localhost:11434';
const DEFAULT_VARIATION_LIMIT = 10;
const MIN_VARIATION_LIMIT = 1;
const MAX_VARIATION_LIMIT = 10;

let currentProviderInfo = null;
let currentVariationLimit = DEFAULT_VARIATION_LIMIT;

function clampVariationLimit(raw) {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_VARIATION_LIMIT;
  }
  return Math.min(MAX_VARIATION_LIMIT, Math.max(MIN_VARIATION_LIMIT, parsed));
}

function buildGenerationPrompt(baseTemplate, variationLimit) {
  const limit = clampVariationLimit(variationLimit ?? currentVariationLimit);
  const template = baseTemplate ?? config.template ?? '';
  currentVariationLimit = limit;
  return template.replaceAll('{{VARIATION_LIMIT}}', String(limit));
}

async function ensureCurrentProviderInfo() {
  if (currentProviderInfo?.type) {
    return currentProviderInfo;
  }

  try {
    const aiSettings = await getAIProviderSettings();
    let providerType = aiSettings.activeProvider;

    if (!providerType) {
      const appConfigValues = await getAppConfig(['ACTIVE_PROVIDER', 'ERROR_VARIATION_LIMIT']);
      if (
        appConfigValues.ACTIVE_PROVIDER &&
        aiSettings.providers?.[appConfigValues.ACTIVE_PROVIDER]
      ) {
        providerType = appConfigValues.ACTIVE_PROVIDER;
      }
      if (appConfigValues.ERROR_VARIATION_LIMIT) {
        currentVariationLimit = clampVariationLimit(appConfigValues.ERROR_VARIATION_LIMIT);
      }
    }

    if (!providerType) {
      if (process.env.GEMINI_API_KEY) {
        currentProviderInfo = {
          type: 'gemini',
          modelName: FALLBACK_GEMINI_MODEL,
        };
        return currentProviderInfo;
      }
      return null;
    }

    const providerConfig = aiSettings.providers?.[providerType] || {};

    currentProviderInfo = {
      type: providerType,
      modelName:
        providerConfig.modelName ||
        (providerType === 'gemini' ? FALLBACK_GEMINI_MODEL : FALLBACK_OLLAMA_MODEL),
    };
    return currentProviderInfo;
  } catch (error) {
    console.error('Failed to resolve provider snapshot:', error);
    return currentProviderInfo;
  }
}

function broadcastStatus(overrides = {}) {
  ensureCurrentProviderInfo()
    .then((provider) => {
      broadcast({
        type: 'status',
        isStreaming,
        interval: overrides.interval ?? config.interval,
        provider,
        ...overrides,
      });
    })
    .catch((error) => {
      console.error('Failed to broadcast status:', error);
      broadcast({
        type: 'status',
        isStreaming,
        interval: overrides.interval ?? config.interval,
        ...overrides,
      });
    });
}

async function resolveActiveAIProviderConfig() {
  const aiSettings = await getAIProviderSettings();
  let providerType = aiSettings.activeProvider;

  if (!providerType) {
    const appConfigValues = await getAppConfig(['ACTIVE_PROVIDER', 'ERROR_VARIATION_LIMIT']);
    if (
      appConfigValues.ACTIVE_PROVIDER &&
      aiSettings.providers?.[appConfigValues.ACTIVE_PROVIDER]
    ) {
      providerType = appConfigValues.ACTIVE_PROVIDER;
    }
    if (appConfigValues.ERROR_VARIATION_LIMIT) {
      currentVariationLimit = clampVariationLimit(appConfigValues.ERROR_VARIATION_LIMIT);
    }
  }

  if (!providerType) {
    if (process.env.GEMINI_API_KEY) {
      const fallback = {
        type: 'gemini',
        modelName: FALLBACK_GEMINI_MODEL,
        apiUrl: FALLBACK_GEMINI_API_URL,
        apiKey: process.env.GEMINI_API_KEY,
      };
      currentProviderInfo = {
        type: fallback.type,
        modelName: fallback.modelName,
      };
      await upsertAppConfig({ ACTIVE_PROVIDER: fallback.type });
      currentVariationLimit = clampVariationLimit(
        (await getAppConfig(['ERROR_VARIATION_LIMIT'])).ERROR_VARIATION_LIMIT
      );
      return fallback;
    }
    throw new Error('No AI provider configured. Please configure one in Settings.');
  }

  const providerConfig = aiSettings.providers?.[providerType];
  if (!providerConfig) {
    throw new Error(`Configuration missing for provider "${providerType}".`);
  }

  const resolved = {
    type: providerType,
    modelName:
      providerConfig.modelName ||
      (providerType === 'gemini'
        ? FALLBACK_GEMINI_MODEL
        : providerType === 'ollama'
          ? FALLBACK_OLLAMA_MODEL
          : null),
    apiUrl:
      providerConfig.apiUrl ||
      (providerType === 'gemini'
        ? FALLBACK_GEMINI_API_URL
        : providerType === 'ollama'
          ? FALLBACK_OLLAMA_API_URL
          : null),
    apiKey:
      providerConfig.apiKey ||
      (providerType === 'gemini'
        ? process.env.GEMINI_API_KEY
        : providerType === 'ollama'
          ? process.env.OLLAMA_API_KEY
          : undefined),
  };

  if (!resolved.modelName) {
    throw new Error(`Model name is required for provider "${providerType}".`);
  }

  if (providerType === 'gemini' && !resolved.apiKey) {
    throw new Error('Gemini API key is not configured. Please update the provider settings.');
  }

  if (!resolved.apiUrl) {
    throw new Error(`API URL is required for provider "${providerType}".`);
  }

  currentProviderInfo = {
    type: resolved.type,
    modelName: resolved.modelName,
  };
  await upsertAppConfig({ ACTIVE_PROVIDER: providerType });

  return resolved;
}

// Streaming state
let streamInterval = null;
let isStreaming = false;
const connectedClients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  connectedClients.add(ws);

  ensureCurrentProviderInfo().then((provider) => {
    ws.send(
      JSON.stringify({
        type: 'status',
        isStreaming,
        interval: config.interval,
        provider,
      })
    );
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
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

  broadcastStatus({ interval: streamIntervalMs });
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

  broadcastStatus();
  return { success: true, message: 'Stream stopped' };
}

// Generate error log and broadcast
async function generateAndBroadcast() {
  try {
    const provider = await resolveActiveAIProviderConfig();
    const prompt = buildGenerationPrompt(config.template, currentVariationLimit);
    const errorLog = await generateSyntheticError({
      prompt,
      provider,
    });
    
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
        timestamp: new Date().toISOString(),
        provider: currentProviderInfo,
      });
    }
  } catch (error) {
    console.error('Error generating log:', error);
    const payload = {
      type: 'error',
      message: error.message || 'Failed to generate error log',
    };
    if (currentProviderInfo) {
      payload.provider = currentProviderInfo;
    }
    broadcast(payload);
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
    const defaultApiUrl = process.env.VITE_API_URL || 'http://localhost:3000';
    const desiredKeys = ['VITE_API_URL', 'ERROR_VARIATION_LIMIT'];
    let appConfig = await getAppConfig(desiredKeys);

    if (!appConfig.VITE_API_URL) {
      appConfig = await upsertAppConfig({
        VITE_API_URL: defaultApiUrl,
        ERROR_VARIATION_LIMIT: String(DEFAULT_VARIATION_LIMIT),
      });
    } else if (!appConfig.ERROR_VARIATION_LIMIT) {
      appConfig = await upsertAppConfig({ ERROR_VARIATION_LIMIT: String(DEFAULT_VARIATION_LIMIT) });
    }

    currentVariationLimit = clampVariationLimit(appConfig.ERROR_VARIATION_LIMIT);

    appConfig = {
      VITE_API_URL: appConfig.VITE_API_URL ?? defaultApiUrl,
      ERROR_VARIATION_LIMIT: String(currentVariationLimit),
    };

    res.json({
      interval: config.interval,
      template: config.template,
      isStreaming,
      aiProvider,
      appConfig,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// POST /api/config
app.post('/api/config', async (req, res) => {
  const { interval, template, aiProvider, appConfig: appConfigPayload } = req.body;

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
    let persistedAppConfig = null;
    if (aiProvider) {
      providerSettings = await saveAIProviderSettings(aiProvider);
    } else {
      providerSettings = await getAIProviderSettings();
    }

    if (appConfigPayload) {
      const upsertPayload = { ...appConfigPayload };
      if (upsertPayload.ERROR_VARIATION_LIMIT !== undefined) {
        upsertPayload.ERROR_VARIATION_LIMIT = String(
          clampVariationLimit(upsertPayload.ERROR_VARIATION_LIMIT)
        );
      }
      persistedAppConfig = await upsertAppConfig(upsertPayload);
    } else {
      persistedAppConfig = await getAppConfig(['VITE_API_URL', 'ERROR_VARIATION_LIMIT']);
    }

    currentVariationLimit = clampVariationLimit(
      persistedAppConfig.ERROR_VARIATION_LIMIT ?? currentVariationLimit
    );
    const fallbackApiUrl = process.env.VITE_API_URL || 'http://localhost:3000';
    persistedAppConfig = {
      VITE_API_URL: persistedAppConfig.VITE_API_URL ?? fallbackApiUrl,
      ERROR_VARIATION_LIMIT: String(currentVariationLimit),
    };

    if (providerSettings?.activeProvider) {
      const active = providerSettings.activeProvider;
      const modelName =
        providerSettings.providers?.[active]?.modelName ||
        (active === 'gemini' ? FALLBACK_GEMINI_MODEL : FALLBACK_OLLAMA_MODEL);
      currentProviderInfo = {
        type: active,
        modelName,
      };
    } else {
      await ensureCurrentProviderInfo();
    }

    broadcastStatus();

    res.json({
      success: true,
      config: {
        interval: config.interval,
        template: config.template
      },
      aiProvider: providerSettings,
      appConfig: persistedAppConfig
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update configuration'
    });
  }
});

// DELETE /api/logs (purge data)
app.delete('/api/logs', async (req, res) => {
  try {
    await purgeAllData();
    res.json({ success: true });
  } catch (error) {
    console.error('Error purging logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to purge data'
    });
  }
});

// POST /api/generate-error (single generation)
app.post('/api/generate-error', async (req, res) => {
  try {
    const provider = await resolveActiveAIProviderConfig();
    const prompt = buildGenerationPrompt(config.template, currentVariationLimit);
    const errorLog = await generateSyntheticError({
      prompt,
      provider,
    });
    
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

