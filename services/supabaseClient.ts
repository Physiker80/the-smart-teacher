/// <reference types="vite/client" />
// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// These should be in your .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables! Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
