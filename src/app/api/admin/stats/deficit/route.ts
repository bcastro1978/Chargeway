import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ECUADOR_CHARGERS_FALLBACK } from '@/lib/data/ecuador-chargers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeConnectors(typeStr: string): string[] {
  const text = (typeStr || '').toLowerCase();
  const res: string[] = [];
  if (text.includes('cs2') || text.includes('ccs2') || text.includes('combo 2')) res.push('CCS2');
  if (text.includes('tipo 2') || text.includes('type 2') || text.includes('mennekes')) res.push('Type 2');
  if (text.includes('gb/t') || text.includes('gbt')) res.push('GB/T');
  if (text.includes('tipo 1') || text.includes('ccs1') || text.includes('combo 1') || text.includes('j1772')) res.push('CCS1');
  if (text.includes('chademo')) res.push('Chademo');
  if (res.length === 0) res.push('Type 2'); // default AC fallback
  return res;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch chargers
    let rawChargers: any[] = [];
    try {
      const { data: dbChargers } = await supabase
        .from('charging_points')
        .select('id, name, lat, lng, charger_type, speed, power, province');
      if (dbChargers && dbChargers.length > 0) {
        rawChargers = dbChargers;
      } else {
        rawChargers = ECUADOR_CHARGERS_FALLBACK;
      }
    } catch {
      rawChargers = ECUADOR_CHARGERS_FALLBACK;
    }

    const chargers = rawChargers.map(ch => {
      const lat = Number(ch.lat || ch.location?.lat);
      const lng = Number(ch.lng || ch.location?.lng);
      const connectors = normalizeConnectors(ch.charger_type || ch.charge_type_v || ch.type || '');
      return {
        id: ch.id,
        name: ch.name || ch.nombre || 'Punto de Carga',
        lat,
        lng,
        power: ch.power || '22kW',
        speed: ch.speed || 'Carga Normal',
        charger_type: ch.charger_type || 'Tipo 2',
        province: ch.province || ch.provincia || 'Pichincha',
        connectors
      };
    }).filter(ch => ch.lat && ch.lng && !isNaN(ch.lat) && !isNaN(ch.lng));

    // 2. Fetch trips with geometries
    const { data: rawTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, origin_name, destination_name, distance_km, consumption_kwh, vehicle_model, route_geometry, created_at')
      .limit(1000);

    if (tripsError) {
      console.error('Error fetching trips for deficit map:', tripsError);
    }

    const trips: any[] = [];
    const brandsSet = new Set<string>();

    (rawTrips || []).forEach(t => {
      const model = t.vehicle_model || 'BYD Seagull';
      const brand = model.split(' ')[0].trim();
      brandsSet.add(brand);

      let sampledCoords: [number, number][] = [];
      let startPoint: [number, number] | null = null;
      let endPoint: [number, number] | null = null;

      if (t.route_geometry) {
        try {
          const parsed = JSON.parse(t.route_geometry);
          const allCoords = parsed.coordinates as number[][];
          if (Array.isArray(allCoords) && allCoords.length > 0) {
            startPoint = [allCoords[0][0], allCoords[0][1]];
            endPoint = [allCoords[allCoords.length - 1][0], allCoords[allCoords.length - 1][1]];
            // Sample coordinates: take 1 every N points to keep payload snappy
            const step = Math.max(1, Math.floor(allCoords.length / 20));
            sampledCoords = allCoords
              .filter((_, idx) => idx % step === 0 || idx === allCoords.length - 1)
              .map(c => [c[0], c[1]]);
          }
        } catch {
          // ignore invalid geometry
        }
      }

      const origClean = (t.origin_name || '').split(',')[0].trim().replace(/\s+/g, ' ');
      const destClean = (t.destination_name || '').split(',')[0].trim().replace(/\s+/g, ' ');
      const fullText = `${t.origin_name || ''} ${t.destination_name || ''}`.toLowerCase();

      // Detect province for trip
      const provList = ['Pichincha', 'Guayas', 'Azuay', 'Tungurahua', 'Manabí', 'El Oro', 'Imbabura', 'Esmeraldas', 'Chimborazo', 'Loja', 'Santo Domingo', 'Cotopaxi', 'Carchi', 'Bolívar', 'Cañar'];
      let tripProvince = 'Pichincha';
      for (const p of provList) {
        if (fullText.includes(p.toLowerCase())) {
          tripProvince = p;
          break;
        }
      }

      trips.push({
        id: t.id,
        origin: origClean || 'Origen',
        destination: destClean || 'Destino',
        brand,
        model,
        province: tripProvince,
        distanceKm: Math.round(Number(t.distance_km) || 20),
        kwh: Number(Number(t.consumption_kwh || 3.5).toFixed(1)),
        coordinates: sampledCoords,
        startPoint,
        endPoint
      });
    });

    const provSet = ['Todas', 'Pichincha', 'Guayas', 'Azuay', 'Tungurahua', 'Manabí', 'El Oro', 'Imbabura', 'Esmeraldas', 'Chimborazo', 'Loja', 'Santo Domingo', 'Cotopaxi', 'Carchi'];

    return NextResponse.json({
      success: true,
      brands: Array.from(brandsSet).sort(),
      provinces: provSet,
      connectors: ['CCS2', 'Type 2', 'GB/T', 'CCS1', 'Chademo'],
      chargers,
      trips
    });
  } catch (err: any) {
    console.error('Deficit API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
