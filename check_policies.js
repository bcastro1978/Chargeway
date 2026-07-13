const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'vehicle_models' });
  console.log('Error:', error);
  console.log('Policies:', data);
}

check();
