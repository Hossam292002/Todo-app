'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';
import { useTodoStore } from '@/store/useTodoStore';

type FindTaskContextValue = {
  findTask: (query: string) => { found: boolean; error?: string };
  highlightTaskId: number | null;
  registerTransformRef: (ref: ReactZoomPanPinchContentRef | null) => void;
};

const FindTaskContext = createContext<FindTaskContextValue | null>(null);

export function useFindTask() {
  const ctx = useContext(FindTaskContext);
  return ctx;
}

type FindTaskProviderProps = {
  children: React.ReactNode;
};

const HIGHLIGHT_DURATION_MS = 2000;

export function FindTaskProvider({ children }: FindTaskProviderProps) {
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const [highlightTaskId, setHighlightTaskId] = useState<number | null>(null);
  const tasks = useTodoStore((s) => s.tasks);

  const registerTransformRef = useCallback((ref: ReactZoomPanPinchContentRef | null) => {
    transformRef.current = ref;
  }, []);

  const getTasks = useCallback(
    () => tasks.map((t) => ({ task_id: t.task_id, display_id: t.display_id })),
    [tasks]
  );

  const findTask = useCallback(
    (query: string): { found: boolean; error?: string } => {
      const trimmed = query.trim();
      if (!trimmed) return { found: false, error: 'Enter a task ID' };

      const taskList = getTasks();
      const task = taskList.find((t) => {
        const id = (t.display_id ?? String(t.task_id)).toLowerCase();
        const q = trimmed.toLowerCase();
        return id === q || String(t.task_id) === trimmed;
      });

      if (!task) {
        return { found: false, error: `Task "${trimmed}" not found` };
      }

      const element = document.querySelector(`[data-find-task-id="${task.task_id}"]`);
      if (!element || !(element instanceof HTMLElement)) {
        return { found: false, error: 'Task not visible on canvas' };
      }

      const ref = transformRef.current;
      if (ref?.zoomToElement) {
        ref.zoomToElement(element, 1.2, 400, 'easeOut');
      }

      setHighlightTaskId(task.task_id);
      setTimeout(() => setHighlightTaskId(null), HIGHLIGHT_DURATION_MS);
      return { found: true };
    },
    [getTasks]
  );

  const value: FindTaskContextValue = {
    findTask,
    highlightTaskId,
    registerTransformRef,
  };

  return (
    <FindTaskContext.Provider value={value}>
      {children}
    </FindTaskContext.Provider>
  );
}
