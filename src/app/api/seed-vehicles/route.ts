import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import vehicles from '@/lib/vehicles.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass RLS

export async function GET() {
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let insertedBrands = 0;
    let insertedModels = 0;

    for (const v of vehicles) {
      // 1. Insert or get brand
      const { data: brandData, error: brandError } = await supabase
        .from('vehicle_brands')
        .select('id')
        .eq('name', v.brand)
        .single();

      let brandId;

      if (!brandData) {
        const { data: newBrand, error: insertBrandError } = await supabase
          .from('vehicle_brands')
          .insert({ name: v.brand })
          .select('id')
          .single();

        if (insertBrandError) throw insertBrandError;
        brandId = newBrand.id;
        insertedBrands++;
      } else {
        brandId = brandData.id;
      }

      // 2. Insert model
      const { error: modelError } = await supabase
        .from('vehicle_models')
        .upsert({
          slug: v.id, // Using slug as unique identifier
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

      if (modelError) throw modelError;
      insertedModels++;
    }

    return NextResponse.json({ success: true, insertedBrands, insertedModels });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
