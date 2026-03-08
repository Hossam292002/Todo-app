import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY ?? process.env.openai_api_key;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const DEFAULT_SYSTEM_PROMPT = `You are a smart project assistant for a task management app. You have full app data below (categories, projects, tasks). Use it to answer accurately.

Rules:
- Keep every answer SHORT: 1–3 sentences, or a brief bullet list. No long paragraphs.
- Be direct: state the fact (e.g. "Task #VISA-24 was created 7 hours ago."). Do not add filler like "If you need more details, let me know" or "If today is X, that means...".
- For lists (tasks, projects, categories): use bullet points. One line per item when possible.
- Answer only from the context. If something is missing, say so in one short sentence.`;

export async function POST(request: Request) {
  if (!openai) {
    return NextResponse.json(
      { error: 'Chat is not configured. Add OPENAI_API_KEY or openai_api_key to .env.local, then restart the dev server.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { messages, context } = body as {
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
      context?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const systemContent = context
      ? `${DEFAULT_SYSTEM_PROMPT}\n\nCurrent app context (use this to answer):\n${context}`
      : DEFAULT_SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? 'I couldn’t generate a response.';
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isQuota = /quota|rate limit|429/i.test(message);
    const status = isQuota ? 429 : (message.includes('API key') ? 401 : 500);
    const friendly = message.includes('API key')
      ? 'Invalid or missing API key.'
      : isQuota
        ? 'OpenAI quota exceeded. Check your plan and billing at platform.openai.com.'
        : message;
    return NextResponse.json({ error: friendly }, { status });
  }
}
