import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY ?? process.env.openai_api_key;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const DEFAULT_SYSTEM_PROMPT = `You are a smart project assistant for a task management application. You have access to the full app data below: CATEGORIES (name, id, and which tasks are in each category), PROJECTS (name, id, task count), and every TASK (ID, title, description, category, assignee, project, sprint, created date/time, attachment).

Use this data to answer the user's questions accurately. You must:
- Answer questions about categories: e.g. "What's in the Backlog?" or "How many tasks in category X?" using the CATEGORIES section (each category lists its tasks).
- Answer "How many tasks are in project X?" using the PROJECTS section (e.g. "Project AS currently has 8 tasks.").
- Answer "What is task AS-3 about?" or "Summarize task AS-5" using the TASKS list (title, description, category, assignee, when created).
- List "tasks created today" by filtering tasks whose Created date matches Today's date.
- Understand task IDs (e.g. AS-1, GEN-2), category names, and project names/IDs. Refer to the exact data in the context.
- Summarize task descriptions when asked; keep answers concise and friendly.
Answer only from the context provided. If the context does not contain the information, say so briefly.`;

export async function POST(request: Request) {
  if (!openai) {
    return NextResponse.json(
      { error: 'Chat is not configured. Add OPENAI_API_KEY to .env.local.' },
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
