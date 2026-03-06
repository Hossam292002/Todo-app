import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Project = {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
};

export type Category = {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  width: number;
  created_at?: string;
};

export type Task = {
  id: number;
  task_id: number;
  title: string;
  description?: string;
  assigned_to?: string;
  project_id?: string;
  category_id: string;
  position_x: number;
  position_y: number;
  created_at?: string;
  updated_at?: string;
};
