/**
 * Multi-provider LLM caller with fallbacks. Used by the AI refactor pipeline.
 *
 * Order:
 *  1) NVIDIA NIM (if NVIDIA_API_KEY set) — primary
 *  2) OmniRoute (if OMNIROUTE_URL set, default http://127.0.0.1:20128/v1)
 *  3) Google Gemini (if GOOGLE_GENERATIVE_AI_API_KEY set)
 *  4) Anything in OPENAI_API_KEY
 *
 * All providers take an OpenAI-compatible Chat Completions request. The format
 * translation (Claude, Gemini native) is the job of OmniRoute — direct calls
 * here are limited to the OpenAI shape.
 *
 * The router returns the first successful response. If the primary errors with
 * 429 / 5xx, it transparently falls through to the next provider.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface ChatResponse {
  text: string;
  provider: string;
  model: string;
  raw?: unknown;
}

interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  defaultModel: string;
}

function providers(): ProviderConfig[] {
  const list: ProviderConfig[] = [];
  const primaryModel = process.env.NVIDIA_DEFAULT_MODEL || 'meta/llama-3.2-11b-vision-instruct';
  const fallbackModel = process.env.NVIDIA_FALLBACK_MODEL || 'mistralai/mistral-large-2-instruct';
  const reasoningModel = process.env.NVIDIA_REASONING_MODEL || 'meta/llama-3.2-90b-vision-instruct';

  if (process.env.NVIDIA_API_KEY) {
    list.push({
      name: 'nvidia-nim-primary',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
      defaultModel: primaryModel,
    });
    list.push({
      name: 'nvidia-nim-fallback',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
      defaultModel: fallbackModel,
    });
    list.push({
      name: 'nvidia-nim-reasoning',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
      defaultModel: reasoningModel,
    });
  }

  if (process.env.OMNIROUTE_URL || process.env.OMNIROUTE_API_KEY) {
    list.push({
      name: 'omniroute',
      baseUrl: process.env.OMNIROUTE_URL || 'http://127.0.0.1:20128/v1',
      apiKey: process.env.OMNIROUTE_API_KEY || 'no-key-required-locally',
      defaultModel: process.env.OMNIROUTE_DEFAULT_MODEL || 'if/kimi-k2-thinking',
    });
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    list.push({
      name: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      defaultModel: process.env.GOOGLE_DEFAULT_MODEL || 'gemini-2.5-flash',
    });
  }

  if (process.env.OPENAI_API_KEY) {
    list.push({
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    });
  }

  return list;
}

export function hasAnyProvider(): boolean {
  return providers().length > 0;
}

async function callProvider(
  p: ProviderConfig,
  req: ChatRequest,
): Promise<ChatResponse> {
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model || p.defaultModel,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.max_tokens ?? 4096,
      ...(req.response_format ? { response_format: req.response_format } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${p.name}] HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error(`[${p.name}] unexpected response shape`);
  }
  return { text, provider: p.name, model: req.model || p.defaultModel, raw: data };
}

/**
 * Try each provider in order. Returns the first success.
 * If all fail, throws an AggregateError-like string.
 */
export async function chatWithFallback(req: ChatRequest): Promise<ChatResponse> {
  const list = providers();
  if (list.length === 0) {
    throw new Error(
      'No LLM provider is configured. Set NVIDIA_API_KEY (recommended), OMNIROUTE_URL, GOOGLE_GENERATIVE_AI_API_KEY, or OPENAI_API_KEY in .env.local.',
    );
  }
  const errors: string[] = [];
  for (const p of list) {
    try {
      return await callProvider(p, req);
    } catch (err) {
      errors.push((err as Error).message);
      // continue to next provider
    }
  }
  throw new Error(`All providers failed:\n  - ${errors.join('\n  - ')}`);
}
