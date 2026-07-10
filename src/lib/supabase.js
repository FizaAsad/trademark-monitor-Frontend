import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://tbxkxcqwbipoapmipcba.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieGt4Y3F3Ymlwb2FwbWlwY2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDEwNTEsImV4cCI6MjA5ODExNzA1MX0.qNFRlw5VGyYFmFEaJFvWkTgcm5C8d3hZISpbf5Vf2Rw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
