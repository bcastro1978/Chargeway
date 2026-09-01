import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { ECUADOR_CHARGERS_FALLBACK } from '@/lib/data/ecuador-chargers';

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

    // 2. Fetch trips safely without statement timeouts
    const [tripsRes, geomRes] = await Promise.all([
      supabase
        .from('trips')
        .select('id, origin_name, destination_name, distance_km, consumption_kwh, vehicle_model, waypoints, created_at')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('trips')
        .select('id, route_geometry')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    const rawTrips = tripsRes.data || [];
    const geomMap = new Map<string, number[][]>();

    (geomRes.data || []).forEach(g => {
      if (g.route_geometry) {
        try {
          const parsed = JSON.parse(g.route_geometry);
          if (Array.isArray(parsed.coordinates) && parsed.coordinates.length > 0) {
            geomMap.set(g.id, parsed.coordinates);
          }
        } catch {
          // ignore
        }
      }
    });

    const trips: any[] = [];
    const brandsSet = new Set<string>();

    rawTrips.forEach(t => {
      const model = t.vehicle_model || 'BYD Seagull';
      const brand = model.split(' ')[0].trim();
      brandsSet.add(brand);

      let sampledCoords: [number, number][] = [];
      let startPoint: [number, number] | null = null;
      let endPoint: [number, number] | null = null;

      if (geomMap.has(t.id)) {
        const allCoords = geomMap.get(t.id)!;
        startPoint = [allCoords[0][0], allCoords[0][1]];
        endPoint = [allCoords[allCoords.length - 1][0], allCoords[allCoords.length - 1][1]];
        const step = Math.max(1, Math.floor(allCoords.length / 15));
        sampledCoords = allCoords
          .filter((_, idx) => idx % step === 0 || idx === allCoords.length - 1)
          .map(c => [c[0], c[1]]);
      } else if (Array.isArray(t.waypoints) && t.waypoints.length >= 2) {
        const w1 = t.waypoints[0];
        const w2 = t.waypoints[t.waypoints.length - 1];
        if (w1?.lng && w1?.lat && w2?.lng && w2?.lat) {
          startPoint = [Number(w1.lng), Number(w1.lat)];
          endPoint = [Number(w2.lng), Number(w2.lat)];
          // Generate realistic corridor trajectory points
          const steps = 8;
          for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const lng = startPoint[0] + (endPoint[0] - startPoint[0]) * ratio;
            const lat = startPoint[1] + (endPoint[1] - startPoint[1]) * ratio;
            sampledCoords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
          }
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
