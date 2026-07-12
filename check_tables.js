const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.from('charging_points').select('*').limit(1);
  console.log('Sample row from charging_points:');
  console.log(data?.[0]);
}

check();
