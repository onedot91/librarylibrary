import { createClient } from '@supabase/supabase-js';
import type { School } from './types';

export type SchoolCountRow = {
  id: string;
  monthly_lending: Record<string, number>;
  updated_at?: string;
};

export type BookLoanInsert = {
  school_id: string;
  title: string;
  author: string;
};

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseUrl = rawSupabaseUrl?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

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

export const insertBookLoan = (loan: BookLoanInsert) => {
  if (!supabase) return Promise.resolve({ error: null });

  return supabase.from('book_loans').insert(loan);
};
