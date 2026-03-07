'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTodoStore } from '@/store/useTodoStore';
import type { CategoryColorKey } from '@/lib/supabase';
import { CATEGORY_COLOR_OPTIONS } from './TaskCard';

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function generateId() {
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<CategoryColorKey>('emerald');
  const addCategory = useTodoStore((s) => s.addCategory);
  const categories = useTodoStore((s) => s.categories);

  const getNewPosition = () => {
    const sorted = [...categories].sort((a, b) => a.position_x - b.position_x);
    const rightmost = sorted[sorted.length - 1];
    const baseX = rightmost ? rightmost.position_x + 320 : 0;
    const baseY = rightmost ? rightmost.position_y : 0;
    return { x: baseX, y: baseY };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { x, y } = getNewPosition();
    await addCategory({
      id: generateId(),
      name: name.trim(),
      position_x: x,
      position_y: y,
      width: 280,
      color,
    });
    onClose();
    setName('');
    setColor('emerald');
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">Create Category</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="e.g. To Do, In Progress"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">Color (for all tasks in this category)</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setColor(opt.key)}
                  className={`h-9 w-9 rounded-full border-2 transition-all ${
                    color === opt.key ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 ' + opt.border : 'border-transparent opacity-80 hover:opacity-100'
                  } ${opt.bg}`}
                  title={opt.key}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
