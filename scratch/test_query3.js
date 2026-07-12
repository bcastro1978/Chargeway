const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmddylhyfgeplnxdauia.supabase.co',
  'sb_publishable_hzbCvSpczgaz6U-bx6PSNA_kqmlprsM'
);

async function test() {
  const { data, error } = await supabase
      .from('user_vehicles')
      .select(`
        id, alias, photo_url, is_primary,
        vehicle_models!user_vehicles_vehicle_model_id_fkey (
          id, name, wltp_range_km,
          vehicle_brands ( id, name )
        )
      `)
      .eq('user_id', 'fake-id')
      .order('created_at', { ascending: false });
  console.log('User Vehicles:', data);
  console.log('Error:', error);
}

test();
