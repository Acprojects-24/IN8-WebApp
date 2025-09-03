import { createClient } from '@supabase/supabase-js';

// Fallback: hardcode your project credentials here if env vars are not loading
// Replace the placeholders with your actual values
// const SUPABASE_URL_FALLBACK = 'https://jxseoamokdxeasuptmth.supabase.co';
// const SUPABASE_ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4c2VvYW1va2R4ZWFzdXB0bXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjc2MTYsImV4cCI6MjA3MDc0MzYxNn0.-_UqBgn15u9xcb4dpfLbYYlot2yumjASCrsWV9Elh04';
const SUPABASE_URL_FALLBACK = ' https://jitsi.supabase.in8.com/';
const SUPABASE_ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU2MDUxNTkyLCJleHAiOjE5MTM3MzE1OTJ9.xvMrXW0aVYNWBXJr6XbNxvRhAogGfwM7fV2K_pzF0QY';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	persistSession: true,
	autoRefreshToken: true,
	detectSessionInUrl: true,
});


