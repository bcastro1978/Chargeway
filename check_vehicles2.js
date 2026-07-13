const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
        .from('vehicle_models')
        .select(`
          id, name, usable_battery_kwh, drag_coefficient, frontal_area_m2, 
          weight_kg, peak_charging_kw, wltp_range_km, charger_type, slug, 
          commercial_range_km, commercial_standard, certificado_wltp,
          vehicle_brands(name, logo_url)
        `)
        .eq('is_active', true)
        .order('name');
  
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  if (data?.length > 0) {
    console.log(data[0]);
  }
}

check();
