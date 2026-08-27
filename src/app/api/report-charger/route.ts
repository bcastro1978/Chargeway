import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmddylhyfgeplnxdauia.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR5bGh5ZmdlcGxueGRhdWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3MTUyNSwiZXhwIjoyMDk1NzQ3NTI1fQ.Dd6lClvQ2imOMHVYDQECelOajQly5Q4M75vgqrWH7YU';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, region, province, city_or_canton, lat, lng, speed, charger_type, power, schedule, cost_type, photo_url } = body;

    if (!name || !lat || !lng) {
      return NextResponse.json({ error: 'Nombre y coordenadas son requeridos.' }, { status: 400 });
    }

    const rawGpsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const gpsLinkWithPhoto = photo_url ? `${rawGpsLink}#PHOTO#${photo_url}` : rawGpsLink;

    const payload = {
      name,
      region: region || 'Sierra',
      province: province || 'Pichincha',
      city_or_canton: city_or_canton || 'Quito',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: speed || '🟢 RÁPIDA',
      charger_type: charger_type || 'CCS2',
      power: power || '50 kW',
      schedule: schedule || '24/7',
      cost_type: cost_type || 'Gratuito',
      photo_url: photo_url || null,
      gps_link: gpsLinkWithPhoto,
      is_active: false // Inactive pending admin approval!
    };

    let { data, error } = await supabaseAdmin
      .from('charging_points')
      .insert([payload])
      .select();

    if (error && (error.message?.includes('photo_url') || error.code === 'PGRST204')) {
      console.warn('photo_url column missing in charging_points, retrying with photo embedded in gps_link...');
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as any).photo_url;

      const retryRes = await supabaseAdmin
        .from('charging_points')
        .insert([fallbackPayload])
        .select();

      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error('Error in API report-charger:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err: any) {
    console.error('Unexpected error in report-charger API:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}
