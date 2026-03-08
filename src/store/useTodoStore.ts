import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Project, Category, Task, CategoryColorKey } from '@/lib/supabase';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Special filter value: show only tasks that have no project assigned */
export const NO_PROJECT_FILTER = '__none__';

type FilterState = {
  assignedTo: string;
  projectId: string;
  sprintStart: string;
};

type SearchState = {
  query: string;
};

type TodoStore = {
  // Data
  projects: Project[];
  categories: Category[];
  tasks: Task[];
  
  // Filters & Search
  filters: FilterState;
  search: SearchState;
  
  // Actions - Projects
  addProject: (project: Omit<Project, 'created_at'>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  
  // Actions - Categories
  addCategory: (category: Omit<Category, 'created_at'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; color?: import('@/lib/supabase').CategoryColorKey }) => Promise<void>;
  updateCategoryPosition: (id: string, position_x: number, position_y: number) => Promise<void>;
  updateCategoryWidth: (id: string, width: number) => Promise<void>;
  swapCategoryPositions: (idA: string, idB: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  
  // Actions - Tasks
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'display_id'>) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  updateTask: (taskId: number, updates: { title?: string; description?: string; assigned_to?: string; project_id?: string; sprint_start?: string | null; attachment_url?: string | null }) => Promise<void>;
  updateTaskPosition: (taskId: number, categoryId: string, position_x: number, position_y: number) => Promise<void>;
  updateTaskCategory: (taskId: number, newCategoryId: string) => Promise<void>;
  reorderTasksInCategory: (categoryId: string, taskIds: number[]) => Promise<void>;
  reorderTaskWithDirection: (
    categoryId: string,
    draggedTaskId: number,
    overTaskId: number,
    direction: 'vertical-above' | 'vertical-below' | 'horizontal-left' | 'horizontal-right'
  ) => Promise<void>;
  fetchTasks: () => Promise<void>;
  getNextTaskId: () => Promise<number>;
  getNextDisplayId: (projectId: string | undefined) => Promise<string>;
  
  // Actions - Filters & Search
  setFilterAssignedTo: (value: string) => void;
  setFilterProject: (value: string) => void;
  setFilterSprint: (value: string) => void;
  setSearchQuery: (query: string) => void;
  
  // Computed
  getFilteredTasks: () => Task[];

  // UI: open create-task form for a category (e.g. from AI chat)
  openCreateTaskCategoryId: string | null;
  setOpenCreateTaskCategoryId: (id: string | null) => void;
};

export const useTodoStore = create<TodoStore>((set, get) => ({
  projects: [],
  categories: [],
  tasks: [],
  filters: { assignedTo: '', projectId: '', sprintStart: '' },
  search: { query: '' },
  openCreateTaskCategoryId: null,
  setOpenCreateTaskCategoryId: (id) => set({ openCreateTaskCategoryId: id }),

  addProject: async (project) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('projects').insert({ ...project, user_id: user.id });
    if (!error) await get().fetchProjects();
  },

  deleteProject: async (id) => {
    await supabase.from('tasks').update({ project_id: null }).eq('project_id', id);
    await supabase.from('projects').delete().eq('id', id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.map((t) => (t.project_id === id ? { ...t, project_id: undefined } : t)),
      filters: s.filters.projectId === id ? { ...s.filters, projectId: '' } : s.filters,
    }));
  },

  fetchProjects: async () => {
    const { data } = await supabase.from('projects').select('*');
    set({ projects: data || [] });
  },

  addCategory: async (category) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('categories').insert({ ...category, user_id: user.id });
    if (!error) await get().fetchCategories();
  },

  deleteCategory: async (id) => {
    await supabase.from('tasks').delete().eq('category_id', id);
    await supabase.from('categories').delete().eq('id', id);
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      tasks: s.tasks.filter((t) => t.category_id !== id),
    }));
  },

  updateCategory: async (id, updates) => {
    const { name, color } = updates;
    const payload: { name?: string; color?: CategoryColorKey } = {};
    if (name !== undefined) payload.name = name;
    if (color !== undefined) payload.color = color;
    if (Object.keys(payload).length === 0) return;
    await supabase.from('categories').update(payload).eq('id', id);
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, ...payload } : c
      ),
    }));
  },

  updateCategoryPosition: async (id, position_x, position_y) => {
    await supabase.from('categories').update({ position_x, position_y }).eq('id', id);
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, position_x, position_y } : c
      ),
    }));
  },

  swapCategoryPositions: async (idA, idB) => {
    if (idA === idB) return;
    const categories = get().categories;
    const catA = categories.find((c) => c.id === idA);
    const catB = categories.find((c) => c.id === idB);
    if (!catA || !catB) return;
    await supabase.from('categories').update({ position_x: catB.position_x, position_y: catB.position_y }).eq('id', idA);
    await supabase.from('categories').update({ position_x: catA.position_x, position_y: catA.position_y }).eq('id', idB);
    set((s) => ({
      categories: s.categories.map((c) => {
        if (c.id === idA) return { ...c, position_x: catB.position_x, position_y: catB.position_y };
        if (c.id === idB) return { ...c, position_x: catA.position_x, position_y: catA.position_y };
        return c;
      }),
    }));
  },

  updateCategoryWidth: async (id, width) => {
    await supabase.from('categories').update({ width }).eq('id', id);
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, width } : c)),
    }));
  },

  fetchCategories: async () => {
    const { data } = await supabase.from('categories').select('*');
    set({ categories: data || [] });
  },

  addTask: async (task) => {
    const TASK_WIDTH = 180;
    const TASK_HEIGHT = 80;
    const GAP = 16;
    const rowSize = TASK_HEIGHT + GAP;
    const categoryTasks = get().tasks
      .filter((t) => t.category_id === task.category_id)
      .sort((a, b) => a.position_y - b.position_y || a.position_x - b.position_x);
    const position_x = 0;
    const position_y =
      categoryTasks.length === 0 ? 0 : Math.max(...categoryTasks.map((t) => t.position_y)) + rowSize;
    const display_id = await get().getNextDisplayId(task.project_id);
    const taskWithPosition = { ...task, position_x, position_y, display_id };
    const tempTask: Task = {
      ...taskWithPosition,
      id: task.task_id,
      display_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((s) => ({ tasks: [...s.tasks, tempTask] }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('tasks').insert({ ...taskWithPosition, user_id: user.id });
    if (error) {
      set((s) => ({ tasks: s.tasks.filter((t) => t.task_id !== task.task_id) }));
      throw new Error(error.message);
    }
    await get().fetchTasks();
  },

  deleteTask: async (taskId) => {
    await supabase.from('tasks').delete().eq('task_id', taskId);
    set((s) => ({ tasks: s.tasks.filter((t) => t.task_id !== taskId) }));
  },

  updateTask: async (taskId, updates) => {
    const { title, description, assigned_to, project_id, sprint_start, attachment_url } = updates;
    const payload: { title?: string; description?: string; assigned_to?: string; project_id?: string; sprint_start?: string | null; attachment_url?: string | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (assigned_to !== undefined) payload.assigned_to = assigned_to;
    if (project_id !== undefined) payload.project_id = project_id;
    if (sprint_start !== undefined) payload.sprint_start = sprint_start;
    if (attachment_url !== undefined) payload.attachment_url = attachment_url;
    await supabase.from('tasks').update(payload).eq('task_id', taskId);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.task_id === taskId ? { ...t, ...payload } : t
      ),
    }));
  },

  updateTaskPosition: async (taskId, categoryId, position_x, position_y) => {
    await supabase
      .from('tasks')
      .update({ position_x, position_y, category_id: categoryId, updated_at: new Date().toISOString() })
      .eq('task_id', taskId);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.task_id === taskId ? { ...t, position_x, position_y, category_id: categoryId } : t
      ),
    }));
  },

  updateTaskCategory: async (taskId, newCategoryId) => {
    const task = get().tasks.find((t) => t.task_id === taskId);
    if (!task) return;
    await get().updateTaskPosition(taskId, newCategoryId, task.position_x, task.position_y);
  },

  reorderTasksInCategory: async (categoryId, taskIds) => {
    const TASK_WIDTH = 180;
    const TASK_HEIGHT = 80;
    const GAP = 16;
    const colSize = TASK_WIDTH + GAP;
    const rowSize = TASK_HEIGHT + GAP;
    const tasks = get().tasks.filter((t) => t.category_id === categoryId);
    const movedTaskId = taskIds[taskIds.length - 1];
    if (!tasks.find((t) => t.task_id === movedTaskId)) return;
    const otherTasks = tasks.filter((t) => t.task_id !== movedTaskId);
    const maxCol = otherTasks.length > 0
      ? Math.max(...otherTasks.map((t) => Math.round(t.position_x / colSize)))
      : 0;
    const maxYInCol =
      otherTasks.length > 0
        ? Math.max(
            0,
            ...otherTasks
              .filter((t) => Math.round(t.position_x / colSize) === maxCol)
              .map((t) => t.position_y)
          )
        : 0;
    const newX = maxCol * colSize;
    const newY = maxYInCol + rowSize;
    await supabase
      .from('tasks')
      .update({
        position_x: newX,
        position_y: newY,
        updated_at: new Date().toISOString(),
      })
      .eq('task_id', movedTaskId);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.task_id === movedTaskId ? { ...t, position_x: newX, position_y: newY } : t
      ),
    }));
  },

  reorderTaskWithDirection: async (categoryId, draggedTaskId, overTaskId, direction) => {
    const TASK_WIDTH = 180;
    const TASK_HEIGHT = 80;
    const GAP = 16;
    const PADDING = 24;
    const colSize = TASK_WIDTH + GAP;
    const rowSize = TASK_HEIGHT + GAP;
    const getCol = (x: number) => Math.round(x / colSize);
    const categoryTasks = get().tasks
      .filter((t) => t.category_id === categoryId)
      .sort((a, b) => a.position_x - b.position_x || a.position_y - b.position_y);
    const dragged = categoryTasks.find((t) => t.task_id === draggedTaskId);
    const overTask = categoryTasks.find((t) => t.task_id === overTaskId);
    if (!dragged || !overTask) return;

    if (direction === 'vertical-above' || direction === 'vertical-below') {
      // Insert dragged into over's column above or below over (works when dragged is from any column)
      const targetCol = getCol(overTask.position_x);
      const sameColTasks = categoryTasks
        .filter((t) => getCol(t.position_x) === targetCol)
        .sort((a, b) => a.position_y - b.position_y);
      const sameColWithoutDragged = sameColTasks.filter((t) => t.task_id !== draggedTaskId);
      const overColIdx = sameColWithoutDragged.findIndex((t) => t.task_id === overTaskId);
      if (overColIdx === -1) return;
      const insertAt = direction === 'vertical-below' ? overColIdx + 1 : overColIdx;
      const clamped = Math.min(Math.max(0, insertAt), sameColWithoutDragged.length);
      const newOrder = [
        ...sameColWithoutDragged.slice(0, clamped),
        dragged,
        ...sameColWithoutDragged.slice(clamped),
      ];
      const updates = newOrder.map((t, i) => ({
        taskId: t.task_id,
        position_x: targetCol * colSize,
        position_y: i * rowSize,
      }));
      for (const u of updates) {
        await supabase
          .from('tasks')
          .update({
            position_x: u.position_x,
            position_y: u.position_y,
            updated_at: new Date().toISOString(),
          })
          .eq('task_id', u.taskId);
      }
      set((s) => ({
        tasks: s.tasks.map((t) => {
          const u = updates.find((u) => u.taskId === t.task_id);
          return u ? { ...t, position_x: u.position_x, position_y: u.position_y } : t;
        }),
      }));
      return;
    }

    // Horizontal: create new column beside target
    const targetCol = getCol(overTask.position_x);
    const targetRowY = overTask.position_y;
    const newCol =
      direction === 'horizontal-right' ? targetCol + 1 : Math.max(0, targetCol - 1);
    const allCols = [...new Set(categoryTasks.map((t) => getCol(t.position_x)))].sort(
      (a, b) => a - b
    );
    const shiftFromCol = direction === 'horizontal-right' ? newCol : targetCol;
    const updates: { taskId: number; position_x: number; position_y: number }[] = [];
    for (const t of categoryTasks) {
      const col = getCol(t.position_x);
      if (t.task_id === draggedTaskId) {
        updates.push({
          taskId: t.task_id,
          position_x: newCol * colSize,
          position_y: targetRowY,
        });
      } else if (col >= shiftFromCol && direction === 'horizontal-right') {
        updates.push({
          taskId: t.task_id,
          position_x: (col + 1) * colSize,
          position_y: t.position_y,
        });
      } else if (col >= targetCol && direction === 'horizontal-left') {
        updates.push({
          taskId: t.task_id,
          position_x: (col + 1) * colSize,
          position_y: t.position_y,
        });
      }
    }
    for (const u of updates) {
      await supabase
        .from('tasks')
        .update({
          position_x: u.position_x,
          position_y: u.position_y,
          updated_at: new Date().toISOString(),
        })
        .eq('task_id', u.taskId);
    }
    const category = get().categories.find((c) => c.id === categoryId);
    const currentWidth = category?.width ?? 280;
    const maxCol = Math.max(
      ...categoryTasks.map((t) => {
        const u = updates.find((u) => u.taskId === t.task_id);
        return u ? getCol(u.position_x) : getCol(t.position_x);
      }),
      newCol
    );
    const neededWidth = (maxCol + 1) * colSize + PADDING;
    if (neededWidth > currentWidth) {
      await supabase.from('categories').update({ width: neededWidth }).eq('id', categoryId);
    }
    set((s) => {
      const updated = s.tasks.map((t) => {
        const u = updates.find((u) => u.taskId === t.task_id);
        return u ? { ...t, position_x: u.position_x, position_y: u.position_y } : t;
      });
      return {
        tasks: updated,
        categories: s.categories.map((c) =>
          c.id === categoryId ? { ...c, width: Math.max(c.width, neededWidth) } : c
        ),
      };
    });
  },

  fetchTasks: async () => {
    const { data } = await supabase.from('tasks').select('*');
    set({ tasks: data || [] });
  },

  getNextTaskId: async () => {
    const { data } = await supabase.from('tasks').select('task_id').order('task_id', { ascending: false }).limit(1);
    return (data?.[0]?.task_id ?? 0) + 1;
  },

  getNextDisplayId: async (projectId: string | undefined) => {
    const prefix =
      projectId && projectId.trim()
        ? (projectId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'GEN')
        : 'GEN';
    // Unique constraint is (user_id, display_id) — consider all user's tasks, not just same project
    const { data: tasks } = await supabase.from('tasks').select('display_id');
    const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, 'i');
    let maxN = 0;
    for (const t of tasks || []) {
      const m = (t.display_id || '').match(re);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    return `${prefix}-${maxN + 1}`;
  },

  setFilterAssignedTo: (value) => set((s) => ({ filters: { ...s.filters, assignedTo: value } })),
  setFilterProject: (value) => set((s) => ({ filters: { ...s.filters, projectId: value } })),
  setFilterSprint: (value) => set((s) => ({ filters: { ...s.filters, sprintStart: value } })),
  setSearchQuery: (query) => set({ search: { query } }),

  getFilteredTasks: () => {
    const { tasks, filters, search } = get();
    let result = [...tasks];
    if (filters.assignedTo) result = result.filter((t) => t.assigned_to === filters.assignedTo);
    if (filters.projectId) {
      if (filters.projectId === NO_PROJECT_FILTER) {
        result = result.filter((t) => !t.project_id);
      } else {
        result = result.filter((t) => t.project_id === filters.projectId);
      }
    }
    if (filters.sprintStart) {
      result = result.filter((t) => (t.sprint_start ?? '') === filters.sprintStart);
    }
    if (search.query) {
      const q = search.query.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q)) ||
          String(t.task_id).includes(q) ||
          (t.display_id && t.display_id.toLowerCase().includes(q))
      );
    }
    return result;
  },
}));
