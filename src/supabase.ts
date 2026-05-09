import { createClient } from '@supabase/supabase-js';
import type { School } from './types';

export type SchoolCountRow = {
  id: string;
  monthly_lending: Record<string, number>;
  updated_at?: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 8,
        },
      },
    })
  : null;

export const toSchoolCountRows = (schools: School[]): SchoolCountRow[] =>
  schools.map((school) => ({
    id: school.id,
    monthly_lending: school.monthlyLending,
  }));

