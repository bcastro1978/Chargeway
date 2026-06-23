import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin === true;
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request.headers.get('Authorization'));
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ── Aggregate trips by vehicle_model ──────────────────────────────────────
  const { data: trips, error } = await supabase
    .from('trips')
    .select('vehicle_model, distance_km, consumption_kwh, start_soc, arrival_soc, duration_min');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Build per-model aggregates ─────────────────────────────────────────────
  const modelMap: Record<string, {
    trips: number;
    totalDistanceKm: number;
    totalConsumptionKwh: number;
    totalDurationMin: number;
    avgStartSoc: number;
    socSum: number;
    arrivalSocSum: number;
  }> = {};

  for (const t of (trips || [])) {
    const model = t.vehicle_model || 'Desconocido';
    if (!modelMap[model]) {
      modelMap[model] = {
        trips: 0,
        totalDistanceKm: 0,
        totalConsumptionKwh: 0,
        totalDurationMin: 0,
        avgStartSoc: 0,
        socSum: 0,
        arrivalSocSum: 0,
      };
    }
    const m = modelMap[model];
    m.trips += 1;
    m.totalDistanceKm += Number(t.distance_km) || 0;
    m.totalConsumptionKwh += Number(t.consumption_kwh) || 0;
    m.totalDurationMin += Number(t.duration_min) || 0;
    m.socSum += Number(t.start_soc) || 0;
    m.arrivalSocSum += Number(t.arrival_soc) || 0;
  }

  const byModel = Object.entries(modelMap)
    .map(([model, d]) => ({
      model,
      trips: d.trips,
      avgDistanceKm: d.trips > 0 ? Math.round(d.totalDistanceKm / d.trips) : 0,
      avgConsumptionKwh100km: d.totalDistanceKm > 0
        ? Math.round((d.totalConsumptionKwh / d.totalDistanceKm) * 100 * 10) / 10
        : 0,
      avgStartSocPct: d.trips > 0 ? Math.round((d.socSum / d.trips) * 100) : 0,
      avgArrivalSocPct: d.trips > 0 ? Math.round((d.arrivalSocSum / d.trips) * 100) : 0,
      totalDistanceKm: Math.round(d.totalDistanceKm),
      totalConsumptionKwh: Math.round(d.totalConsumptionKwh * 10) / 10,
    }))
    .sort((a, b) => b.trips - a.trips);

  // ── Global KPIs ───────────────────────────────────────────────────────────
  const totalTrips = trips?.length || 0;
  const totalModels = byModel.length;
  const totalDistanceKm = Math.round(byModel.reduce((s, m) => s + m.totalDistanceKm, 0));
  const avgConsumption = totalDistanceKm > 0
    ? Math.round(byModel.reduce((s, m) => s + m.totalConsumptionKwh, 0) / totalDistanceKm * 100 * 10) / 10
    : 0;

  // ── Brand aggregates ──────────────────────────────────────────────────────
  const brandMap: Record<string, number> = {};
  for (const m of byModel) {
    const brand = m.model.split(' ')[0];
    brandMap[brand] = (brandMap[brand] || 0) + m.trips;
  }
  const byBrand = Object.entries(brandMap)
    .map(([brand, trips]) => ({ brand, trips }))
    .sort((a, b) => b.trips - a.trips);

  return NextResponse.json({
    kpis: { totalTrips, totalModels, totalDistanceKm, avgConsumption },
    byModel,
    byBrand,
  });
}
