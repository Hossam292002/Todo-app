import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Project, Category, Task } from '@/lib/supabase';

type FilterState = {
  assignedTo: string;
  projectId: string;
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
  fetchProjects: () => Promise<void>;
  
  // Actions - Categories
  addCategory: (category: Omit<Category, 'created_at'>) => Promise<void>;
  updateCategoryPosition: (id: string, position_x: number, position_y: number) => Promise<void>;
  updateCategoryWidth: (id: string, width: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  
  // Actions - Tasks
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTaskPosition: (taskId: number, categoryId: string, position_x: number, position_y: number) => Promise<void>;
  updateTaskCategory: (taskId: number, newCategoryId: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  getNextTaskId: () => Promise<number>;
  
  // Actions - Filters & Search
  setFilterAssignedTo: (value: string) => void;
  setFilterProject: (value: string) => void;
  setSearchQuery: (query: string) => void;
  
  // Computed
  getFilteredTasks: () => Task[];
};

export const useTodoStore = create<TodoStore>((set, get) => ({
  projects: [],
  categories: [],
  tasks: [],
  filters: { assignedTo: '', projectId: '' },
  search: { query: '' },

  addProject: async (project) => {
    const { error } = await supabase.from('projects').insert(project);
    if (!error) await get().fetchProjects();
  },

  fetchProjects: async () => {
    const { data } = await supabase.from('projects').select('*');
    set({ projects: data || [] });
  },

  addCategory: async (category) => {
    const { error } = await supabase.from('categories').insert(category);
    if (!error) await get().fetchCategories();
  },

  updateCategoryPosition: async (id, position_x, position_y) => {
    await supabase.from('categories').update({ position_x, position_y }).eq('id', id);
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, position_x, position_y } : c
      ),
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
    const { error } = await supabase.from('tasks').insert(task);
    if (!error) await get().fetchTasks();
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

  fetchTasks: async () => {
    const { data } = await supabase.from('tasks').select('*');
    set({ tasks: data || [] });
  },

  getNextTaskId: async () => {
    const { data } = await supabase.from('tasks').select('task_id').order('task_id', { ascending: false }).limit(1);
    return (data?.[0]?.task_id ?? 0) + 1;
  },

  setFilterAssignedTo: (value) => set((s) => ({ filters: { ...s.filters, assignedTo: value } })),
  setFilterProject: (value) => set((s) => ({ filters: { ...s.filters, projectId: value } })),
  setSearchQuery: (query) => set({ search: { query } }),

  getFilteredTasks: () => {
    const { tasks, filters, search } = get();
    let result = [...tasks];
    if (filters.assignedTo) result = result.filter((t) => t.assigned_to === filters.assignedTo);
    if (filters.projectId) result = result.filter((t) => t.project_id === filters.projectId);
    if (search.query) {
      const q = search.query.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q)) ||
          String(t.task_id).includes(q)
      );
    }
    return result;
  },
}));
