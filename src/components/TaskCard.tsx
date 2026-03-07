'use client';

import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/supabase';
import type { CategoryColorKey } from '@/lib/supabase';
import { TaskEditModal } from './TaskEditModal';
import { useDropIndicator } from '@/context/DropIndicatorContext';
import { useTodoStore } from '@/store/useTodoStore';

export const CATEGORY_COLOR_OPTIONS: { key: CategoryColorKey; bg: string; border: string; accent: string }[] = [
  { key: 'amber', bg: 'bg-amber-100', border: 'border-amber-300', accent: 'text-amber-800' },
  { key: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', accent: 'text-blue-800' },
  { key: 'emerald', bg: 'bg-emerald-100', border: 'border-emerald-300', accent: 'text-emerald-800' },
  { key: 'violet', bg: 'bg-violet-100', border: 'border-violet-300', accent: 'text-violet-800' },
  { key: 'rose', bg: 'bg-rose-100', border: 'border-rose-300', accent: 'text-rose-800' },
  { key: 'cyan', bg: 'bg-cyan-100', border: 'border-cyan-300', accent: 'text-cyan-800' },
  { key: 'orange', bg: 'bg-orange-100', border: 'border-orange-300', accent: 'text-orange-800' },
  { key: 'fuchsia', bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', accent: 'text-fuchsia-800' },
];

const COLOR_BY_KEY = Object.fromEntries(CATEGORY_COLOR_OPTIONS.map((c) => [c.key, c]));

export function getTaskColor(taskId: number) {
  return CATEGORY_COLOR_OPTIONS[Math.abs(taskId - 1) % CATEGORY_COLOR_OPTIONS.length];
}

export function getTaskColorByKey(key: CategoryColorKey | undefined): { bg: string; border: string; accent: string } {
  if (!key || !COLOR_BY_KEY[key]) return CATEGORY_COLOR_OPTIONS[2]; // default emerald
  const c = COLOR_BY_KEY[key];
  return { bg: c.bg, border: c.border, accent: c.accent };
}

type TaskCardProps = {
  task: Task;
  categoryId: string;
  categoryColor?: CategoryColorKey;
};

export const TaskCard = memo(function TaskCard({ task, categoryId, categoryColor }: TaskCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const deleteTask = useTodoStore((s) => s.deleteTask);
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
        className={`task-card nodrag nopan group relative w-[180px] shrink-0 cursor-grab rounded-lg border-2 p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${color.bg} ${color.border} dark:bg-slate-800/50 ${
          isDragging ? 'opacity-0' : ''
        }`}
      >
        {isDropTarget && direction && (
          <div
            className={`absolute z-10 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.5)] ${indicatorStyle}`}
            aria-hidden
          />
        )}
        <div {...listeners} {...attributes} className="min-h-[2rem]">
          <div className={`text-xs font-mono ${color.accent}`}>{task.display_id ?? `#${task.task_id}`}</div>
          <div className={`font-medium ${color.accent}`}>{task.title}</div>
          {task.description && (
            <div className="mt-1 text-sm text-slate-600 line-clamp-2 dark:text-slate-400">{task.description}</div>
          )}
          {(task.assigned_to || task.project_id) && (
            <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-600 dark:text-slate-500">
              {task.assigned_to && <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-700">{task.assigned_to}</span>}
              {task.project_id && <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-700">{task.project_id}</span>}
            </div>
          )}
        </div>
        <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete task ${task.display_id ?? '#' + task.task_id} "${task.title}"?`)) {
                deleteTask(task.task_id);
              }
            }}
            className="rounded p-1 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
            title="Delete task"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
            className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-600"
            title="Move to another category"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>
      </div>
      <TaskEditModal isOpen={showEdit} onClose={() => setShowEdit(false)} task={task} />
    </>
  );
});
