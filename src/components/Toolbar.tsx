'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTodoStore, NO_PROJECT_FILTER } from '@/store/useTodoStore';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useFindTask } from '@/context/FindTaskContext';
import { ProjectModal } from './ProjectModal';
import { CategoryModal } from './CategoryModal';

export function Toolbar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
  const deleteProject = useTodoStore((s) => s.deleteProject);
  const setFilterAssignedTo = useTodoStore((s) => s.setFilterAssignedTo);
  const setFilterProject = useTodoStore((s) => s.setFilterProject);
  const setSearchQuery = useTodoStore((s) => s.setSearchQuery);
  const filters = useTodoStore((s) => s.filters);
  const search = useTodoStore((s) => s.search);

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete project "${projectName}"? Tasks in this project will be unassigned from the project.`)) return;
    await deleteProject(projectId);
  };

  const tasks = useTodoStore((s) => s.tasks);
  const assignedOptions = [...new Set(tasks.map((t) => t.assigned_to).filter(Boolean))] as string[];
  const findTaskApi = useFindTask();
  const [findTaskQuery, setFindTaskQuery] = useState('');
  const [findTaskError, setFindTaskError] = useState<string | null>(null);

  const handleFindTask = () => {
    setFindTaskError(null);
    const result = findTaskApi?.findTask(findTaskQuery);
    if (result?.found) {
      setFindTaskQuery('');
      setOpen(false);
    } else if (result?.error) {
      setFindTaskError(result.error);
    }
  };

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

  const inputClass = 'h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400';
  const selectClass = 'h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100';

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-md transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={findTaskQuery}
          onChange={(e) => { setFindTaskQuery(e.target.value); setFindTaskError(null); }}
          onKeyDown={(e) => e.key === 'Enter' && handleFindTask()}
          placeholder="Find task (e.g. AS-3)"
          className={`w-32 shrink-0 ${inputClass}`}
          title="Find task by ID"
        />
        <button
          type="button"
          onClick={handleFindTask}
          className="h-10 shrink-0 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          title="Go to task"
        >
          Go
        </button>
      </div>
      {findTaskError && (
        <p className="w-full text-xs text-rose-600 dark:text-rose-400 sm:w-auto">{findTaskError}</p>
      )}

      <input
        type="search"
        placeholder="Search..."
        value={search.query}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`min-w-[120px] max-w-[180px] ${inputClass}`}
        title="Search by title, description, ID"
      />

      <select
        value={filters.projectId}
        onChange={(e) => setFilterProject(e.target.value)}
        className={`min-w-[100px] max-w-[160px] ${selectClass}`}
        title="Filter by project"
      >
        <option value="">All projects</option>
        <option value={NO_PROJECT_FILTER}>No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-medium text-slate-800 shadow-md hover:bg-slate-50 hover:text-slate-900 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        title="Add & more"
      >
        +
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 min-w-[280px] rounded-xl border border-slate-300 bg-white p-3 shadow-xl dark:border-slate-500 dark:bg-slate-800"
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-200">
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

          <div className="my-3 h-px bg-slate-300 dark:bg-slate-500" />

          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-200">
            Filter by assignee
          </div>
          <select
            value={filters.assignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            className={`w-full ${selectClass}`}
          >
            <option value="">All assignees</option>
            {assignedOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {projects.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Delete project</div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg pr-0.5">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 dark:border-slate-500 dark:bg-slate-700"
                  >
                    <span className="truncate text-sm text-slate-900 dark:text-slate-100">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(p.id, p.name)}
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                      title={`Delete project ${p.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="my-3 h-px bg-slate-300 dark:bg-slate-500" />

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-700"
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
