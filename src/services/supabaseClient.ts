import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = supabaseUrl && 
                             supabaseAnonKey && 
                             supabaseUrl !== 'https://your-project-id.supabase.co' &&
                             !supabaseUrl.includes('placeholder');

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://wdbgobjphtypidcbcrwf.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'sb_publishable_NcGrS4G6S7VuDx_ZJvSlXw_YOWxzNh5',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      lock: (name, acquireTimeout, fn) => fn()
    }
  }
);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials not found in environment. Using provided defaults for this session.');
}
