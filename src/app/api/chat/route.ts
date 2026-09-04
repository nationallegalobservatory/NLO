import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import { NextResponse } from 'next/server';
import { searchNloKnowledge, buildNloSystemPrompt } from '@/lib/search/vectorStore';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NVIDIA NIM API key is not configured.' }, { status: 500 });
    }

    // Extract the latest query from user messages
    const lastUserMessage = [...(messages || [])].reverse().find((m) => m.role === 'user');
    let userQuery = '';
    if (lastUserMessage) {
      if (typeof lastUserMessage.content === 'string') {
        userQuery = lastUserMessage.content;
      } else if (Array.isArray(lastUserMessage.parts)) {
        userQuery = lastUserMessage.parts
          .map((p: { text?: string }) => p.text || '')
          .filter(Boolean)
          .join(' ');
      }
    }

    // Query NLO Vector / Semantic Database with strict scope gate
    const searchResult = await searchNloKnowledge(userQuery);
    const systemPrompt = buildNloSystemPrompt(searchResult);

    const nvidia = createOpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey,
    });

    const primaryModel = process.env.NVIDIA_DEFAULT_MODEL || 'meta/llama-3.2-11b-vision-instruct';
    const fallbackModel = process.env.NVIDIA_FALLBACK_MODEL || 'mistralai/mistral-large-2-instruct';

    // Convert UI messages to Model messages for AI SDK streamText
    const modelMessages = await convertToModelMessages(messages || []);

    try {
      const result = streamText({
        model: nvidia.chat(primaryModel),
        messages: modelMessages,
        system: systemPrompt,
        temperature: 0.1,
      });

      return result.toUIMessageStreamResponse();
    } catch (primaryErr) {
      console.warn(`[chat] Primary model ${primaryModel} failed, retrying with fallback ${fallbackModel}:`, primaryErr);
      const fallbackResult = streamText({
        model: nvidia.chat(fallbackModel),
        messages: modelMessages,
        system: systemPrompt,
        temperature: 0.1,
      });

      return fallbackResult.toUIMessageStreamResponse();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat API Error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
