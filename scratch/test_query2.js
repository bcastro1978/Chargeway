const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmddylhyfgeplnxdauia.supabase.co',
  'sb_publishable_hzbCvSpczgaz6U-bx6PSNA_kqmlprsM'
);

async function test() {
  const { data, error } = await supabase.from('user_vehicles').select('*');
  console.log('User Vehicles:', data);
  console.log('Error:', error);
}

test();
