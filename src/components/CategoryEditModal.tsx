'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTodoStore } from '@/store/useTodoStore';
import type { Category } from '@/lib/supabase';
import type { CategoryColorKey } from '@/lib/supabase';
import { CATEGORY_COLOR_OPTIONS } from './TaskCard';

type CategoryEditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
};

export function CategoryEditModal({ isOpen, onClose, category }: CategoryEditModalProps) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState<CategoryColorKey>((category.color as CategoryColorKey) || 'emerald');
  const [switchWithId, setSwitchWithId] = useState<string>('');

  const categories = useTodoStore((s) => s.categories);
  const updateCategory = useTodoStore((s) => s.updateCategory);
  const swapCategoryPositions = useTodoStore((s) => s.swapCategoryPositions);

  useEffect(() => {
    if (isOpen) {
      setName(category.name);
      setColor((category.color as CategoryColorKey) || 'emerald');
      setSwitchWithId('');
    }
  }, [isOpen, category.id, category.name, category.color]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = name.trim();
    if (nameTrimmed !== category.name || color !== (category.color || 'emerald')) {
      await updateCategory(category.id, { name: nameTrimmed || category.name, color });
    }
    if (switchWithId && switchWithId !== category.id) {
      await swapCategoryPositions(category.id, switchWithId);
    }
    onClose();
  };

  const otherCategories = categories.filter((c) => c.id !== category.id).sort((a, b) => a.position_x - b.position_x);

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">Edit Category</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="e.g. To Do, In Progress"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-200">
              Color (for all tasks in this category)
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setColor(opt.key)}
                  className={`h-9 w-9 rounded-full border-2 transition-all ${
                    color === opt.key
                      ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 ' + opt.border
                      : 'border-transparent opacity-80 hover:opacity-100'
                  } ${opt.bg}`}
                  title={opt.key}
                />
              ))}
            </div>
          </div>
          {otherCategories.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-200">
                Switch place with another category
              </label>
              <select
                value={switchWithId}
                onChange={(e) => setSwitchWithId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="">— No change —</option>
                {otherCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
