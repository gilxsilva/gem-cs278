import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://mibrxhpjlipjtkcpqnmo.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pYnJ4aHBqbGlwanRrY3Bxbm1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjY5NjQsImV4cCI6MjA5NDEwMjk2NH0.fUOqyUC2E-HgsyCHpzgF7wLY-1TsL-Ys7z7MhCMG8to';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
