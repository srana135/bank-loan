import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcxlbotlxwzcugsntjhq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BPJzdy9gmJ4NTfY1pTcqgw_mx5MeI6G';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
