'use client';

import { createPortal } from 'react-dom';
import { useTodoStore } from '@/store/useTodoStore';
import type { Task } from '@/lib/supabase';

type TaskEditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
};

export function TaskEditModal({ isOpen, onClose, task }: TaskEditModalProps) {
  const categories = useTodoStore((s) => s.categories);
  const updateTaskCategory = useTodoStore((s) => s.updateTaskCategory);
  const deleteTask = useTodoStore((s) => s.deleteTask);

  const handleChangeCategory = async (newCategoryId: string) => {
    if (newCategoryId === task.category_id) return;
    await updateTaskCategory(task.task_id, newCategoryId);
    onClose();
  };

  const handleDelete = async () => {
    if (confirm(`Delete task ${task.display_id ?? '#' + task.task_id} "${task.title}"?`)) {
      await deleteTask(task.task_id);
      onClose();
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-100">Task Options</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          {task.display_id ?? '#' + task.task_id} – {task.title}
        </p>
        <div className="space-y-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleChangeCategory(c.id)}
              disabled={c.id === task.category_id}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                c.id === task.category_id
                  ? 'cursor-default bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300'
              }`}
            >
              {c.name} {c.id === task.category_id && '(current)'}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDelete}
            className="flex-1 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
