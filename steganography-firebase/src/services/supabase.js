import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'; // The user did not provide the URL, we'll need them to add VITE_SUPABASE_URL to .env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eMrX9LuOkj_vHta-YSQp6w_F8ZeDDGg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
