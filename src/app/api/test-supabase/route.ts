import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase.from('charging_points').select('*').limit(5);
  return NextResponse.json({ 
    envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    envKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'exists' : 'missing',
    data, 
    error 
  });
}
