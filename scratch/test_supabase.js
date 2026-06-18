const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envLocal.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching from Supabase at", supabaseUrl);
  const { data, error } = await supabase.from('charging_points').select('*').limit(5);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Data length:", data.length);
    if (data.length > 0) {
      console.log("Sample:", data[0]);
    }
  }
}

test();
