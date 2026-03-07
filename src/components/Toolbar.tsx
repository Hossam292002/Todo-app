'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTodoStore } from '@/store/useTodoStore';
import { supabase } from '@/lib/supabase';
import { ProjectModal } from './ProjectModal';
import { CategoryModal } from './CategoryModal';

export function Toolbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.push('/login');
    router.refresh();
  };

  const projects = useTodoStore((s) => s.projects);
  const setFilterAssignedTo = useTodoStore((s) => s.setFilterAssignedTo);
  const setFilterProject = useTodoStore((s) => s.setFilterProject);
  const setSearchQuery = useTodoStore((s) => s.setSearchQuery);
  const filters = useTodoStore((s) => s.filters);
  const search = useTodoStore((s) => s.search);

  const tasks = useTodoStore((s) => s.tasks);
  const assignedOptions = [...new Set(tasks.map((t) => t.assigned_to).filter(Boolean))] as string[];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-medium text-slate-600 shadow-md hover:bg-slate-50 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        title="Add & filter"
      >
        +
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-50 mt-2 min-w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-900"
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Add
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setShowProjectModal(true);
                setOpen(false);
              }}
              className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + Project
            </button>
            <button
              onClick={() => {
                setShowCategoryModal(true);
                setOpen(false);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Category
            </button>
          </div>

          <div className="my-3 h-px bg-slate-200 dark:bg-slate-600" />

          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Filter & search
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="search"
              placeholder="Search by title, description, ID..."
              value={search.query}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <select
              value={filters.assignedTo}
              onChange={(e) => setFilterAssignedTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All assignees</option>
              {assignedOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={filters.projectId}
              onChange={(e) => setFilterProject(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="my-3 h-px bg-slate-200 dark:bg-slate-600" />

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      )}

      <ProjectModal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} />
      <CategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
    </div>
  );
}
