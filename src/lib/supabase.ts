import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmddylhyfgeplnxdauia.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_hzbCvSpczgaz6U-bx6PSNA_kqmlprsM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

