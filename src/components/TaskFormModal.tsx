'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTodoStore } from '@/store/useTodoStore';
import { SprintCalendar } from './SprintCalendar';

const MAX_PASTE_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

type TaskFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
};

export function TaskFormModal({ isOpen, onClose, categoryId }: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [sprintStart, setSprintStart] = useState<string | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addTask = useTodoStore((s) => s.addTask);
  const getNextTaskId = useTodoStore((s) => s.getNextTaskId);
  const projects = useTodoStore((s) => s.projects);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const blob = item.getAsFile();
    if (!blob || blob.size > MAX_PASTE_IMAGE_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => setPastedImage(reader.result as string);
    reader.readAsDataURL(blob);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setProjectId('');
      setSprintStart(null);
      setPastedImage(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen, handlePaste]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const taskId = await getNextTaskId();
      await addTask({
        task_id: taskId,
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedTo.trim() || undefined,
        project_id: projectId || undefined,
        sprint_start: sprintStart || undefined,
        attachment_url: pastedImage || undefined,
        category_id: categoryId,
        position_x: 0,
        position_y: 0,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      if (msg.toLowerCase().includes('user_id') || msg.toLowerCase().includes('schema cache')) {
        setError(
          'Database needs an update. From the project root run: npx supabase db push (or link the project first with npx supabase link).'
        );
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-slate-600">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create Task</h2>
          {error && (
            <div className="mt-2 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
              {error}
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="Task title"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">Assigned To</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="Assignee name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">Sprint</label>
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Select a day to choose its week (Mon–Sun)</p>
              <SprintCalendar value={sprintStart} onChange={setSprintStart} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">Image (paste)</label>
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Paste an image with Ctrl+V / Cmd+V (e.g. screenshot)</p>
              {pastedImage ? (
                <div className="relative inline-block">
                  <img src={pastedImage} alt="Pasted" className="max-h-24 rounded-lg border border-slate-300 dark:border-slate-500 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPastedImage(null)}
                    className="absolute -right-1 -top-1 rounded-full bg-slate-700 px-1.5 py-0.5 text-xs text-white hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">No image pasted yet</span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex gap-2 border-t border-slate-200 p-4 dark:border-slate-600">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
