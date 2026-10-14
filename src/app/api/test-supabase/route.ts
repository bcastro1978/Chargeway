import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
  }
  const { data, error } = await supabase.from('charging_points').select('id, name, lat, lng').limit(5);
  return NextResponse.json({ 
    ok: !error,
    sampleCount: data?.length || 0,
    error 
  });
}
