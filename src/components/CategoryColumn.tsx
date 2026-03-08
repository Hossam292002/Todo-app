'use client';

import { memo, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { TaskFormModal } from './TaskFormModal';
import { CategoryEditModal } from './CategoryEditModal';
import { useTodoStore, NO_PROJECT_FILTER } from '@/store/useTodoStore';

const MIN_WIDTH = 200;
const TASK_WIDTH = 180;
const TASK_HEIGHT = 80;
const GAP = 16;
const PADDING = 24;
/** Extra width for the "add column" drop zone on the right */
const NEW_COLUMN_ZONE_WIDTH = 80;

type CategoryColumnProps = {
  categoryId: string;
  name: string;
  width: number;
};

export const CategoryColumn = memo(function CategoryColumn({ categoryId, name, width = 280 }: CategoryColumnProps) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { setNodeRef } = useDroppable({ id: `category-drop-${categoryId}` });
  const { setNodeRef: setNewColRef } = useDroppable({ id: `category-newcol-${categoryId}` });
  const updateCategoryWidth = useTodoStore((s) => s.updateCategoryWidth);
  const deleteCategory = useTodoStore((s) => s.deleteCategory);
  const tasks = useTodoStore((s) => s.tasks);
  const categories = useTodoStore((s) => s.categories);
  const category = categories.find((c) => c.id === categoryId);
  const categoryColor = category?.color;
  const categoryTasks = tasks.filter((t) => t.category_id === categoryId);
  const filters = useTodoStore((s) => s.filters);
  const search = useTodoStore((s) => s.search);
  const openCreateTaskCategoryId = useTodoStore((s) => s.openCreateTaskCategoryId);
  const setOpenCreateTaskCategoryId = useTodoStore((s) => s.setOpenCreateTaskCategoryId);

  const filteredTasks = tasks
    .filter((t) => t.category_id === categoryId)
    .filter((t) => !filters.assignedTo || t.assigned_to === filters.assignedTo)
    .filter((t) => {
      if (!filters.projectId) return true;
      if (filters.projectId === NO_PROJECT_FILTER) return !t.project_id;
      return t.project_id === filters.projectId;
    })
    .filter((t) => !filters.sprintStart || (t.sprint_start ?? '') === filters.sprintStart)
    .filter(
      (t) =>
        !search.query ||
        t.title.toLowerCase().includes(search.query.toLowerCase()) ||
        (t.description?.toLowerCase().includes(search.query.toLowerCase())) ||
        (t.display_id && t.display_id.toLowerCase().includes(search.query.toLowerCase())) ||
        String(t.task_id).includes(search.query)
    );

  const colSize = TASK_WIDTH + GAP;
  const columns = (() => {
    const byCol = new Map<number, typeof filteredTasks>();
    for (const t of filteredTasks) {
      const col = Math.round(t.position_x / colSize);
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col)!.push(t);
    }
    for (const col of byCol.values()) {
      col.sort((a, b) => a.position_y - b.position_y);
    }
    return [...byCol.entries()].sort((a, b) => a[0] - b[0]);
  })();

  const flatOrder = columns.flatMap(([, colTasks]) => colTasks);

  const handleDeleteCategory = () => {
    const taskCount = categoryTasks.length;
    if (confirm(`Delete category "${name}"?${taskCount > 0 ? ` This will also delete ${taskCount} task(s).` : ''}`)) {
      deleteCategory(categoryId);
    }
  };

  const colCount = columns.length || 1;
  const maxRows = columns.length > 0 ? Math.max(...columns.map(([, c]) => c.length)) : 0;
  const contentMinHeight = filteredTasks.length > 0 ? maxRows * (TASK_HEIGHT + GAP) + PADDING : 120;
  const sortableIds = flatOrder.map((t) => `task-${t.task_id}`);

  const neededWidth =
    filteredTasks.length > 0
      ? Math.max(MIN_WIDTH, colCount * colSize + PADDING + NEW_COLUMN_ZONE_WIDTH)
      : Math.max(MIN_WIDTH, 280 + NEW_COLUMN_ZONE_WIDTH);

  const displayWidth = neededWidth;

  useEffect(() => {
    if (Math.ceil(neededWidth) !== width) {
      updateCategoryWidth(categoryId, Math.ceil(neededWidth));
    }
  }, [categoryId, neededWidth, width, updateCategoryWidth]);

  useEffect(() => {
    if (openCreateTaskCategoryId === categoryId) {
      setShowTaskForm(true);
      setOpenCreateTaskCategoryId(null);
    }
  }, [openCreateTaskCategoryId, categoryId, setOpenCreateTaskCategoryId]);

  return (
    <>
      <div
        className="category-column relative flex shrink-0 flex-col rounded-xl border-2 border-dashed border-slate-400 bg-white pt-5 shadow-lg backdrop-blur-sm dark:border-slate-500 dark:bg-slate-800"
        style={{ width: displayWidth, minWidth: MIN_WIDTH }}
      >
        {/* Category name over the frame (straddles top border) */}
        <div className="absolute left-4 top-0 flex -translate-y-1/2 items-center gap-2">
          <span className="rounded-md border border-dashed border-slate-400 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100">
            {name}
          </span>
          <button
            onClick={() => setShowEditModal(true)}
            className="rounded p-1.5 text-slate-700 opacity-90 hover:bg-slate-200 hover:opacity-100 dark:text-slate-200 dark:hover:bg-slate-600"
            title="Edit category"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828L18.172 7.172z" />
            </svg>
          </button>
          <button
            onClick={handleDeleteCategory}
            className="rounded p-1.5 text-slate-700 opacity-90 hover:bg-slate-200 hover:opacity-100 dark:text-slate-200 dark:hover:bg-slate-600"
            title="Delete category"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div
            className="flex p-3"
            style={{ width: '100%', minHeight: contentMinHeight }}
          >
            <div
              ref={setNodeRef}
              className="flex gap-4 shrink-0"
              style={{ minHeight: contentMinHeight }}
            >
              {columns.map(([colIdx, colTasks]) => (
                <div
                  key={colIdx}
                  className="flex flex-col gap-4"
                  style={{ width: TASK_WIDTH }}
                >
                  {colTasks.map((task) => (
                    <TaskCard key={task.task_id} task={task} categoryId={categoryId} categoryColor={categoryColor} />
                  ))}
                </div>
              ))}
            </div>
            <div
              ref={setNewColRef}
              className="shrink-0"
              style={{ width: NEW_COLUMN_ZONE_WIDTH, minHeight: contentMinHeight }}
              title="Drop here to add a new column"
              aria-label="Drop here to add a new column"
            />
          </div>
        </SortableContext>
        <button
          onClick={() => setShowTaskForm(true)}
          className="add-task-btn absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600"
          title="Add task"
        >
          +
        </button>
      </div>
      <TaskFormModal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} categoryId={categoryId} />
      {category && (
        <CategoryEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          category={category}
        />
      )}
    </>
  );
});
