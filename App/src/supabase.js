import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL_FALLBACK = 'https://jitsi.supabase.in8.com/';
const SUPABASE_ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU2MDUxNTkyLCJleHAiOjE5MTM3MzE1OTJ9.xvMrXW0aVYNWBXJr6XbNxvRhAogGfwM7fV2K_pzF0QY';

const supabaseUrl = (import.meta?.env?.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK).trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	persistSession: true,
	autoRefreshToken: true,
	detectSessionInUrl: true,
});


