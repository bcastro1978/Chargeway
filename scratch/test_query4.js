const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmddylhyfgeplnxdauia.supabase.co',
  'sb_publishable_hzbCvSpczgaz6U-bx6PSNA_kqmlprsM'
);

async function test() {
  const { data, error } = await supabase
      .from('user_vehicles')
      .select(`
        id, user_id, alias, vehicle_model_id,
        vehicle_models!user_vehicles_vehicle_model_id_fkey (
          id, name
        )
      `)
  console.log('User Vehicles:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
