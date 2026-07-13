const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log('Testing profiles query...');
  const { data: profile, error: err1 } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  console.log('Profiles error:', err1?.message);

  console.log('Testing user_vehicles query...');
  const { data: uv, error: err2 } = await supabase
    .from('user_vehicles')
    .select(`
      is_primary,
      photo_url,
      vehicle_models!user_vehicles_vehicle_model_id_fkey (
        id, name, slug, usable_battery_kwh, drag_coefficient, 
        frontal_area_m2, weight_kg, peak_charging_kw, wltp_range_km, charger_type,
        vehicle_brands ( id, name )
      )
    `)
    .limit(1);
  console.log('User vehicles error:', err2?.message);
}

check();
