const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmddylhyfgeplnxdauia.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR5bGh5ZmdlcGxueGRhdWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3MTUyNSwiZXhwIjoyMDk1NzQ3NTI1fQ.Dd6lClvQ2imOMHVYDQECelOajQly5Q4M75vgqrWH7YU'
);

async function test() {
  const { data, error } = await supabase
      .from('favorite_locations')
      .select('*')
  console.log('Locations:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
