'use client';

import { useState, useRef, useEffect } from 'react';
import { useTodoStore } from '@/store/useTodoStore';
import { useFindTask } from '@/context/FindTaskContext';
import { formatSprintRange } from './SprintCalendar';
import { getRelativeTime } from './TaskCard';
import type { Task } from '@/lib/supabase';

type Message = { role: 'user' | 'assistant'; content: string };

const QUICK_ACTIONS = [
  { label: 'Create Task', value: 'create task' },
  { label: 'Find Task', value: '__find_task__' },
  { label: 'Show Sprint Tasks', value: 'show sprint tasks summary' },
] as const;

const DEFAULT_FALLBACK_REPLY =
  "I can find tasks (e.g. \"find AS-1\"), filter by assignee (e.g. \"tasks assigned to Ana\"), filter by project, show sprint summary, or create a task. Use the quick actions or type a command.";

function toISODateOnly(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildAppContext(
  tasks: Task[],
  projects: { id: string; name: string }[],
  categories: { id: string; name: string }[]
): string {
  const today = toISODateOnly(new Date().toISOString());
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const lines: string[] = [
    `Today's date: ${today}`,
    '',
    '--- CATEGORIES (each category contains the tasks listed) ---',
    ...categories.map((c) => {
      const categoryTasks = tasks.filter((t) => t.category_id === c.id);
      const ids = categoryTasks.map((t) => `#${t.display_id ?? t.task_id}`).join(', ');
      return `- ${c.name} (id: ${c.id}): ${categoryTasks.length} task(s)${ids ? ` — ${ids}` : ''}`;
    }),
    '',
    '--- PROJECTS ---',
    ...projects.map((p) => {
      const projectTasks = tasks.filter((t) => t.project_id === p.id);
      const ids = projectTasks.map((t) => `#${t.display_id ?? t.task_id}`).join(', ');
      return `- ${p.name} (id: ${p.id}): ${projectTasks.length} task(s)${ids ? ` — ${ids}` : ''}`;
    }),
    '',
    '--- TASKS (full list) ---',
    ...tasks.map((t) => {
      const proj = t.project_id ? projectById.get(t.project_id) : null;
      const projectName = proj ? proj.name : '(no project)';
      const cat = categoryById.get(t.category_id);
      const categoryName = cat ? cat.name : '(unknown category)';
      const sprint = t.sprint_start ? formatSprintRange(t.sprint_start) : '(no sprint)';
      const created = t.created_at ? `${getRelativeTime(t.created_at)} (${toISODateOnly(t.created_at)})` : '(unknown)';
      const attachment = t.attachment_url ? 'yes' : 'no';
      const desc = (t.description ?? '').trim().slice(0, 400);
      return [
        `#${t.display_id ?? t.task_id}`,
        `Title: ${t.title}`,
        desc ? `Description: ${desc}${(t.description ?? '').length > 400 ? '…' : ''}` : null,
        `Category: ${categoryName}`,
        `Assigned to: ${t.assigned_to ?? '(unassigned)'}`,
        `Project: ${projectName}`,
        `Sprint: ${sprint}`,
        `Created: ${created}`,
        `Attachment: ${attachment}`,
      ]
        .filter(Boolean)
        .join(' | ');
    }),
  ];
  if (tasks.length === 0) lines.push('(No tasks yet.)');
  return lines.join('\n');
}

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const tasks = useTodoStore((s) => s.tasks);
  const categories = useTodoStore((s) => s.categories);
  const projects = useTodoStore((s) => s.projects);
  const setFilterAssignedTo = useTodoStore((s) => s.setFilterAssignedTo);
  const setFilterProject = useTodoStore((s) => s.setFilterProject);
  const setFilterSprint = useTodoStore((s) => s.setFilterSprint);
  const setOpenCreateTaskCategoryId = useTodoStore((s) => s.setOpenCreateTaskCategoryId);
  const findTaskApi = useFindTask();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (open && !target.closest?.('[data-ai-chat-root]')) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function processMessage(text: string): string {
    const lower = text.trim().toLowerCase();
    const trimmed = text.trim();

    // Find task by ID (e.g. "find AS-1", "go to GEN-2", "show task AS-1")
    let taskId: string | null = null;
    const findMatchVerb = trimmed.match(/(?:find|go to|show|locate)\s+(?:task\s+)?([A-Za-z0-9_-]+)/i);
    if (findMatchVerb) taskId = findMatchVerb[1] ?? trimmed;
    else {
      const findMatchIdOnly = lower.match(/^([a-z0-9_-]+)$/);
      if (findMatchIdOnly && trimmed.length <= 20) taskId = findMatchIdOnly[1] ?? trimmed;
    }
    if (taskId && findTaskApi) {
      const result = findTaskApi.findTask(taskId.trim());
      if (result.found) return `Found and focused task #${taskId}.`;
      return result.error ?? `Could not find task #${taskId}.`;
    }

    // Tasks assigned to X
    const assignMatch = lower.match(/(?:show|list|filter|get)\s+(?:me\s+)?(?:tasks?\s+)?(?:assigned\s+to|for)\s+(.+?)(?:\s*\.?)?$/) || lower.match(/(?:tasks?\s+)?(?:assigned\s+to|for)\s+(.+?)(?:\s*\.?)?$/);
    if (assignMatch) {
      const name = assignMatch[1].trim();
      setFilterAssignedTo(name);
      const count = tasks.filter((t) => (t.assigned_to ?? '').toLowerCase() === name.toLowerCase()).length;
      return `Showing tasks assigned to "${name}" (${count} task${count !== 1 ? 's' : ''}).`;
    }

    // Filter by project
    const projectMatch = lower.match(/(?:show|filter)\s+(?:by\s+)?project\s+(.+?)(?:\s*\.?)?$/) || lower.match(/(?:project\s+)(.+?)(?:\s*\.?)?$/);
    if (projectMatch) {
      const query = projectMatch[1].trim();
      const proj = projects.find((p) => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
      if (proj) {
        setFilterProject(proj.id);
        const count = tasks.filter((t) => t.project_id === proj.id).length;
        return `Filtering by project "${proj.name}" (${count} task${count !== 1 ? 's' : ''}).`;
      }
      return `No project found matching "${query}". Try: ${projects.slice(0, 5).map((p) => p.name).join(', ')}${projects.length > 5 ? '…' : ''}`;
    }

    // Sprint summary / show sprint tasks
    if (lower.includes('sprint') && (lower.includes('summary') || lower.includes('show') || lower.includes('task') || lower.includes('list'))) {
      const withSprint = tasks.filter((t) => t.sprint_start);
      const bySprint = new Map<string, typeof tasks>();
      withSprint.forEach((t) => {
        const key = t.sprint_start!;
        if (!bySprint.has(key)) bySprint.set(key, []);
        bySprint.get(key)!.push(t);
      });
      const lines = [...bySprint.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([start, list]) => `**${formatSprintRange(start)}**: ${list.length} task(s) – ${list.map((t) => `#${t.display_id ?? t.task_id}`).join(', ')}`);
      if (lines.length === 0) return "No tasks have a sprint set. Assign a sprint when creating or editing a task.";
      return "Sprint tasks:\n" + lines.join("\n");
    }

    // Filter by sprint (e.g. "filter sprint Mar 2" - we'd need to match sprint option)
    const sprintOptions = [...new Set(tasks.map((t) => t.sprint_start).filter(Boolean))] as string[];
    if (lower.includes('filter') && lower.includes('sprint') && sprintOptions.length > 0) {
      // Use first sprint or could parse date; for simplicity set to first available
      const chosen = sprintOptions[0];
      setFilterSprint(chosen);
      const count = tasks.filter((t) => t.sprint_start === chosen).length;
      return `Showing sprint ${formatSprintRange(chosen)} (${count} task${count !== 1 ? 's' : ''}). Use the sprint filter in the toolbar to pick another week.`;
    }

    // Create task
    if (lower.includes('create') && (lower.includes('task') || lower.includes('new'))) {
      const firstCat = categories[0];
      if (firstCat) {
        setOpenCreateTaskCategoryId(firstCat.id);
        setOpen(false);
        return `Opening create task form in "${firstCat.name}".`;
      }
      return "Add a category first, then use the + button to create a task.";
    }

    // Clear filters
    if (lower.includes('clear') && (lower.includes('filter') || lower.includes('all'))) {
      setFilterAssignedTo('');
      setFilterProject('');
      setFilterSprint('');
      return "Cleared all filters. Showing all tasks.";
    }

    // Project status / summary
    if (lower.includes('project') && (lower.includes('status') || lower.includes('summary') || lower.includes('how many'))) {
      const lines = projects.map((p) => {
        const count = tasks.filter((t) => t.project_id === p.id).length;
        return `**${p.name}**: ${count} task(s)`;
      });
      if (lines.length === 0) return "You have no projects yet.";
      return "Project summary:\n" + lines.join("\n");
    }

    return DEFAULT_FALLBACK_REPLY;
  }

  async function sendMessage(content: string) {
    const toSend = content.trim();
    if (!toSend) return;
    setMessages((m) => [...m, { role: 'user', content: toSend }]);
    setInput('');
    processMessage(toSend);
    setIsLoading(true);
    try {
      const context = buildAppContext(tasks, projects, categories);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user' as const, content: toSend }],
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = data.error ?? '';
        const isQuota = res.status === 429 || /quota|billing|rate limit/i.test(raw);
        const friendly = isQuota
          ? 'Your OpenAI quota has been exceeded. Check your plan and billing at platform.openai.com. You can still use commands like "find AS-1" or "tasks assigned to Ana".'
          : raw || 'Chat is not configured. Add OPENAI_API_KEY (or openai_api_key) to .env.local.';
        setMessages((m) => [...m, { role: 'assistant', content: friendly }]);
        return;
      }
      setMessages((m) => [...m, { role: 'assistant', content: data.content ?? 'I couldn’t generate a response.' }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Could not reach the chat service. Check your connection and that the API key is set in .env.local.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickAction(value: string) {
    if (value === '__find_task__') {
      setInput('find ');
      setMessages((m) => [...m, { role: 'assistant', content: 'Type a task ID (e.g. AS-1 or GEN-2) and press Enter to find it on the canvas.' }]);
      return;
    }
    sendMessage(value);
  }

  return (
    <div data-ai-chat-root className="fixed bottom-4 right-16 z-[9998] flex flex-col items-end gap-2">
      {open && (
        <div
          ref={panelRef}
          className="flex h-[380px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-600">
            <span className="font-semibold text-slate-800 dark:text-slate-100">AI Assistant</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMessages([])}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                title="New chat"
                aria-label="New chat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'ml-8 bg-emerald-100 text-slate-900 dark:bg-emerald-900/40 dark:text-slate-100'
                      : 'mr-8 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content.split('**').map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mr-8 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  Thinking…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="shrink-0 space-y-2 border-t border-slate-200 p-2 dark:border-slate-600">
              <div className="hidden flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => handleQuickAction(a.value)}
                    className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                  placeholder="Ask or command..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  disabled={isLoading}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isLoading ? '…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white shadow-lg transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
        title="AI Assistant"
        aria-label="Open AI Assistant"
      >
        <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>
    </div>
  );
}
