import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase Config Check:', {
  hasUrl: !!supabaseUrl,
  urlStart: supabaseUrl?.substring(0, 10),
  hasKey: !!supabaseAnonKey,
  keyType: supabaseAnonKey?.startsWith('eyJ') ? 'JWT' : 'Other'
});

export const isSupabaseConfigured = supabaseUrl && 
                             supabaseAnonKey && 
                             supabaseUrl !== 'https://your-project-id.supabase.co' &&
                             !supabaseUrl.includes('placeholder');

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'deenly-auth-token',
      lock: (name, acquireTimeout, fn) => fn()
    }
  }
);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials not found or invalid. Please check your environment variables.');
}
