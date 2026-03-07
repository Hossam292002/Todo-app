import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export type Project = {
  id: string;
  name: string;
  description?: string;
  user_id?: string;
  created_at?: string;
};

export type CategoryColorKey =
  | 'amber'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'cyan'
  | 'orange'
  | 'fuchsia';

export type Category = {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  width: number;
  color?: CategoryColorKey;
  user_id?: string;
  created_at?: string;
};

export type Task = {
  id: number;
  task_id: number;
  display_id?: string; // e.g. "AS-1", "GEN-2" (project-based or GEN for no project)
  title: string;
  description?: string;
  assigned_to?: string;
  project_id?: string;
  category_id: string;
  position_x: number;
  position_y: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
};
