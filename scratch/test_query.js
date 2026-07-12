const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmddylhyfgeplnxdauia.supabase.co',
  'sb_publishable_hzbCvSpczgaz6U-bx6PSNA_kqmlprsM'
);

async function test() {
  const { data, error } = await supabase.from('vehicle_brands').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
