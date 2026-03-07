'use client';

import { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/supabase';
import type { CategoryColorKey } from '@/lib/supabase';
import { TaskEditModal } from './TaskEditModal';
import { TaskUpdateModal } from './TaskUpdateModal';
import { formatSprintRange } from './SprintCalendar';
import { useDropIndicator } from '@/context/DropIndicatorContext';
import { useFindTask } from '@/context/FindTaskContext';
import { useTodoStore } from '@/store/useTodoStore';

/** Same colors in light and dark mode so task cards look consistent across themes */
export const CATEGORY_COLOR_OPTIONS: {
  key: CategoryColorKey;
  bg: string;
  border: string;
  accent: string;
}[] = [
  { key: 'slate', bg: 'bg-slate-100', border: 'border-slate-300', accent: 'text-slate-800' },
  { key: 'gray', bg: 'bg-gray-100', border: 'border-gray-300', accent: 'text-gray-800' },
  { key: 'zinc', bg: 'bg-zinc-100', border: 'border-zinc-300', accent: 'text-zinc-800' },
  { key: 'stone', bg: 'bg-stone-100', border: 'border-stone-300', accent: 'text-stone-800' },
  { key: 'neutral', bg: 'bg-neutral-100', border: 'border-neutral-300', accent: 'text-neutral-800' },
  { key: 'red', bg: 'bg-red-100', border: 'border-red-300', accent: 'text-red-800' },
  { key: 'orange', bg: 'bg-orange-100', border: 'border-orange-300', accent: 'text-orange-800' },
  { key: 'amber', bg: 'bg-amber-100', border: 'border-amber-300', accent: 'text-amber-800' },
  { key: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', accent: 'text-yellow-800' },
  { key: 'lime', bg: 'bg-lime-100', border: 'border-lime-300', accent: 'text-lime-800' },
  { key: 'green', bg: 'bg-green-100', border: 'border-green-300', accent: 'text-green-800' },
  { key: 'emerald', bg: 'bg-emerald-100', border: 'border-emerald-300', accent: 'text-emerald-800' },
  { key: 'teal', bg: 'bg-teal-100', border: 'border-teal-300', accent: 'text-teal-800' },
  { key: 'cyan', bg: 'bg-cyan-100', border: 'border-cyan-300', accent: 'text-cyan-800' },
  { key: 'sky', bg: 'bg-sky-100', border: 'border-sky-300', accent: 'text-sky-800' },
  { key: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', accent: 'text-blue-800' },
  { key: 'indigo', bg: 'bg-indigo-100', border: 'border-indigo-300', accent: 'text-indigo-800' },
  { key: 'violet', bg: 'bg-violet-100', border: 'border-violet-300', accent: 'text-violet-800' },
  { key: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', accent: 'text-purple-800' },
  { key: 'fuchsia', bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', accent: 'text-fuchsia-800' },
  { key: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', accent: 'text-pink-800' },
];

const COLOR_BY_KEY = Object.fromEntries(CATEGORY_COLOR_OPTIONS.map((c) => [c.key, c]));

export function getTaskColor(taskId: number) {
  return CATEGORY_COLOR_OPTIONS[Math.abs(taskId - 1) % CATEGORY_COLOR_OPTIONS.length];
}

export function getTaskColorByKey(key: CategoryColorKey | undefined): {
  bg: string;
  border: string;
  accent: string;
} {
  if (!key || !COLOR_BY_KEY[key]) return COLOR_BY_KEY['emerald'] ?? CATEGORY_COLOR_OPTIONS[0];
  const c = COLOR_BY_KEY[key];
  return { bg: c.bg, border: c.border, accent: c.accent };
}

export function getRelativeTime(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffMin < 90) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffDay < 2) return '1 day ago';
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 2) return '1 month ago';
  if (diffDay < 365) return `${diffMonth} months ago`;
  const diffYear = Math.floor(diffDay / 365);
  return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
}

function useRelativeTime(createdAt: string | undefined): string {
  const [relative, setRelative] = useState(() => getRelativeTime(createdAt));
  useEffect(() => {
    if (!createdAt) return;
    setRelative(getRelativeTime(createdAt));
    const interval = setInterval(() => setRelative(getRelativeTime(createdAt)), 30000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return relative;
}

type TaskCardProps = {
  task: Task;
  categoryId: string;
  categoryColor?: CategoryColorKey;
};

export const TaskCard = memo(function TaskCard({ task, categoryId, categoryColor }: TaskCardProps) {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const deleteTask = useTodoStore((s) => s.deleteTask);
  const relativeTime = useRelativeTime(task.created_at);
  const findTaskApi = useFindTask();
  const isHighlighted = findTaskApi?.highlightTaskId === task.task_id;
  const { overId, direction } = useDropIndicator();
  const isDropTarget = overId === `task-${task.task_id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.task_id}`,
    data: { task, categoryId },
  });
  const color = getTaskColorByKey(categoryColor) ?? getTaskColor(task.task_id);

  const style = isDragging
    ? { transform: 'none', transition: 'none' }
    : { transform: CSS.Transform.toString(transform), transition };

  const indicatorStyle =
    direction === 'vertical-above'
      ? 'top-0 left-0 right-0 h-1 -mt-px'
      : direction === 'vertical-below'
        ? 'bottom-0 left-0 right-0 h-1 -mb-px'
        : direction === 'horizontal-left'
          ? 'top-0 bottom-0 left-0 w-1 -ml-px'
          : direction === 'horizontal-right'
            ? 'top-0 bottom-0 right-0 w-1 -mr-px'
            : '';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        data-find-task-id={task.task_id}
        className={`task-card nodrag nopan group relative w-[180px] shrink-0 cursor-grab rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing ${
          isDragging ? 'opacity-0' : ''
        } ${isHighlighted ? 'ring-2 ring-emerald-400 animate-pulse dark:ring-emerald-500' : ''} ${color.bg} ${color.border} shadow-[0_2px_6px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)]`}
      >
        {isDropTarget && direction && (
          <div
            className={`absolute z-10 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.5)] ${indicatorStyle}`}
            aria-hidden
          />
        )}
        <div {...listeners} {...attributes} className={`min-h-[2rem] ${relativeTime ? 'pb-5' : ''}`}>
          <div className={`text-xs font-mono ${color.accent}`}>#{task.display_id ?? task.task_id}</div>
          <div className={`font-medium ${color.accent}`}>{task.title}</div>
          {task.description && (
            <div className="mt-1 text-sm text-slate-800 line-clamp-2">{task.description}</div>
          )}
          {(task.assigned_to || task.project_id || task.sprint_start || task.attachment_url) && (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-700">
              {task.assigned_to && <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-slate-800">{task.assigned_to}</span>}
              {task.project_id && <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-slate-800">{task.project_id}</span>}
              {task.sprint_start && (
                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-slate-800" title="Sprint">Sprint: {formatSprintRange(task.sprint_start)}</span>
              )}
              {task.attachment_url && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowImageModal(true); }}
                  className="flex items-center gap-0.5 rounded bg-slate-200/80 px-1.5 py-0.5 text-slate-800 hover:bg-slate-300/80"
                  title="View attachment"
                >
                  <span aria-hidden>📎</span> Attachment
                </button>
              )}
            </div>
          )}
        </div>
        {relativeTime ? (
          <div className="absolute bottom-2 right-2 text-right text-[10px] text-slate-600" title={task.created_at}>
            {relativeTime}
          </div>
        ) : null}
        <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); setShowUpdateModal(true); }}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-700 dark:hover:bg-slate-300 dark:hover:text-slate-900"
            title="Edit task"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828L18.172 7.172z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMoveModal(true); }}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-700 dark:hover:bg-slate-300"
            title="Move to another category"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete task #${task.display_id ?? task.task_id} "${task.title}"?`)) {
                deleteTask(task.task_id);
              }
            }}
            className="rounded p-1 text-slate-600 hover:bg-rose-100 hover:text-rose-700 dark:text-slate-700 dark:hover:bg-rose-200 dark:hover:text-rose-800"
            title="Delete task"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <TaskUpdateModal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} task={task} />
      <TaskEditModal isOpen={showMoveModal} onClose={() => setShowMoveModal(false)} task={task} />
      {showImageModal && task.attachment_url && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="View attachment"
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 backdrop-blur-xl"
          style={{ width: '100vw', height: '100vh', left: 0, top: 0, right: 0, bottom: 0 }}
          onClick={() => setShowImageModal(false)}
        >
          <img
            src={task.attachment_url}
            alt="Task attachment"
            className="max-h-[100vh] max-w-[100vw] w-auto h-auto object-contain"
            style={{ maxWidth: '100vw', maxHeight: '100vh' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setShowImageModal(false)}
            className="absolute right-4 top-4 rounded bg-black/60 px-3 py-2 text-sm font-medium text-white hover:bg-black/80"
            aria-label="Close"
          >
            Close
          </button>
        </div>,
        document.body
      )}
    </>
  );
});
