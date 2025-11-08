// Gemini / AI provider service for generating synthetic error logs
// Supports configuration-driven providers with Gemini as the default implementation.

const DEFAULT_PROMPT = `You are a streaming data generator. Produce one realistic API error event in JSON format only.

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
- The stack trace must look authentic with multiple nested calls (e.g., DAO → Manager → Service)`;

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';
const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com';
const DEFAULT_OLLAMA_MODEL = 'llama3.1';
const DEFAULT_OLLAMA_API_URL = 'http://localhost:11434';

function normaliseBaseUrl(url, fallback = DEFAULT_GEMINI_API_URL) {
  const value = url || fallback;
  return value.replace(/\/+$/, '');
}

async function callGeminiAPI({ prompt, modelName, apiUrl, apiKey }) {
  const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('Gemini API key is not configured. Please set it in the Settings page or environment.');
  }

  const model = modelName || DEFAULT_GEMINI_MODEL;
  const baseUrl = normaliseBaseUrl(apiUrl, DEFAULT_GEMINI_API_URL);
  const endpoint = `${baseUrl}/v1beta/models/${model}:generateContent?key=${resolvedApiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (response.status === 403 || response.status === 401) {
      throw new Error('API key invalid or quota exceeded. Please check your Gemini API key.');
    }

    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  return response.json();
}

async function callOllamaAPI({ prompt, modelName, apiUrl, apiKey }) {
  const model = modelName || DEFAULT_OLLAMA_MODEL;
  const baseUrl = normaliseBaseUrl(apiUrl, DEFAULT_OLLAMA_API_URL);
  const endpoint = `${baseUrl}/api/chat`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const body = {
    model,
    stream: false,
    messages: [
      {
        role: 'system',
        content: 'You are a streaming data generator that must respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ollama API error:', response.status, errorText);
    throw new Error(`Ollama API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();

  if (data?.error) {
    throw new Error(`Ollama API error: ${data.error}`);
  }

  const content =
    data?.message?.content ||
    data?.messages?.[0]?.content ||
    (Array.isArray(data?.output) ? data.output.join('') : null);

  if (!content) {
    console.error('Unexpected Ollama response:', JSON.stringify(data, null, 2));
    throw new Error('No content generated from Ollama');
  }

  return content;
}

function sanitiseGeneratedText(raw) {
  let cleaned = raw.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```$/g, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```\s*/g, '').replace(/```$/g, '').trim();
  }

  return cleaned;
}

export async function generateSyntheticError({ prompt: customPrompt = null, provider } = {}) {
  const prompt = customPrompt || DEFAULT_PROMPT;

  try {
    const providerType = provider?.type || 'gemini';

    if (providerType === 'gemini') {
      const data = await callGeminiAPI({
        prompt,
        modelName: provider?.modelName || DEFAULT_GEMINI_MODEL,
        apiUrl: provider?.apiUrl || DEFAULT_GEMINI_API_URL,
        apiKey: provider?.apiKey,
      });

      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        console.error('No content in response:', JSON.stringify(data, null, 2));
        throw new Error('No content generated from Gemini');
      }

      const cleanedText = sanitiseGeneratedText(generatedText);

      try {
        const errorLog = JSON.parse(cleanedText);
        return errorLog;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Attempted to parse:', cleanedText);
        throw new Error('Invalid JSON generated by Gemini');
      }
    }

    if (providerType === 'ollama') {
      const rawText = await callOllamaAPI({
        prompt,
        modelName: provider?.modelName || DEFAULT_OLLAMA_MODEL,
        apiUrl: provider?.apiUrl || DEFAULT_OLLAMA_API_URL,
        apiKey: provider?.apiKey,
      });

      const cleanedText = sanitiseGeneratedText(rawText);

      try {
        const errorLog = JSON.parse(cleanedText);
        return errorLog;
      } catch (parseError) {
        console.error('JSON parse error (Ollama):', parseError);
        console.error('Attempted to parse:', cleanedText);
        throw new Error('Invalid JSON generated by Ollama');
      }
    }

    throw new Error(`Unsupported AI provider "${providerType}".`);
  } catch (error) {
    console.error('Error in generateSyntheticError:', error);

    if (error.message?.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.message?.includes('quota') || error.message?.includes('QUOTA')) {
      throw new Error('API quota exceeded. Please check your Gemini API quota.');
    }

    throw error;
  }
}

