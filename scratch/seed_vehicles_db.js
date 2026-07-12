const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf-8');
  const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  
  if (!urlMatch || !keyMatch) {
      console.log("Missing Supabase credentials in .env.local");
      return;
  }
  
  const url = urlMatch[1].trim();
  const key = keyMatch[1].trim();
  const sb = createClient(url, key);

  const vehicles = JSON.parse(fs.readFileSync('./src/lib/vehicles.json', 'utf8'));

  let insertedBrands = 0;
  let insertedModels = 0;

  for (const v of vehicles) {
    const { data: brandData } = await sb
      .from('vehicle_brands')
      .select('id')
      .eq('name', v.brand)
      .single();

    let brandId;

    if (!brandData) {
      const { data: newBrand, error: insertBrandError } = await sb
        .from('vehicle_brands')
        .insert({ name: v.brand })
        .select('id')
        .single();

      if (insertBrandError) {
          console.error("Error inserting brand:", insertBrandError);
          continue;
      }
      brandId = newBrand.id;
      insertedBrands++;
    } else {
      brandId = brandData.id;
    }

    const { error: modelError } = await sb
      .from('vehicle_models')
      .upsert({
        slug: v.id, 
        brand_id: brandId,
        name: v.model,
        usable_battery_kwh: v.specs.usable_battery_kwh,
        drag_coefficient: v.specs.drag_coefficient,
        frontal_area_m2: v.specs.frontal_area_m2,
        weight_kg: v.specs.weight_kg,
        peak_charging_kw: v.specs.peak_charging_kw,
        wltp_range_km: v.specs.wltp_range_km,
        charger_type: v.specs.charger_type,
        commercial_range_km: v.specs.commercial_range_km,
        commercial_standard: v.specs.commercial_standard,
        certificado_wltp: v.specs.certificado_wltp
      }, { onConflict: 'slug' });

    if (modelError) {
        console.error(`Error inserting model ${v.id}:`, modelError);
        continue;
    }
    insertedModels++;
  }
  console.log(`Seeded successfully: ${insertedBrands} new brands, ${insertedModels} models updated/inserted.`);
}

main().catch(console.error);
