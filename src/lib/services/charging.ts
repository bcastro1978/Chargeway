/**
 * Charging Service for ChargeWay
 * Sources: Supabase DB → fallback to hardcoded Ecuador data
 */

export interface Charger {
  id: string;
  nombre: string;
  provincia: string;
  canton: string;
  velocidad: string;
  tipo_cargador: string;
  potencia: string;
  horario: string;
  costo: string;
  enlace_gps: string;
  fuente: string;
  location: { lat: number; lng: number };
  address?: string;
  operator?: string;
  points?: number;
  uuid?: string;
  city?: string;
  connections?: Array<{ type: string; power: number; current: string }>;
  exclusiveBrands?: string[];
  photo_url?: string;
}

export const EXCLUSIVE_CAR_BRANDS = ['BYD', 'KIA', 'JAC', 'TESLA', 'PORSCHE', 'AUDI', 'VOLVO', 'BMW'] as const;

/**
 * Detects if a charger belongs to a specific exclusive car brand network (e.g., BYD, KIA, JAC).
 */
export function getChargerExclusiveBrands(name?: string, operator?: string): string[] {
  const text = `${name || ''} ${operator || ''}`;
  if (!text.trim()) return [];
  const matched: string[] = [];
  for (const b of EXCLUSIVE_CAR_BRANDS) {
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${b}(?:$|[^a-zA-Z0-9])`, 'i');
    if (regex.test(text)) {
      matched.push(b);
    }
  }
  return matched;
}

/**
 * Checks whether a charger can be used by a given vehicle brand.
 * - Branded chargers (e.g., BYD, KIA, JAC) are exclusive to vehicles of that brand.
 * - Multi-brand chargers (e.g., BYD - KIA) can be used by either brand.
 * - Unbranded chargers (e.g., Pillajo, Primax, Terpel, Wayra Plaza) are public for all vehicles.
 */
export function isChargerBrandCompatible(
  charger: { nombre?: string; name?: string; operator?: string; fuente?: string; exclusiveBrands?: string[] },
  vehicleBrand?: string
): boolean {
  const brands = charger.exclusiveBrands && charger.exclusiveBrands.length > 0
    ? charger.exclusiveBrands
    : getChargerExclusiveBrands(charger.nombre || charger.name, charger.operator || charger.fuente);

  // If the charger is not exclusive to any car brand, it is open to all
  if (brands.length === 0) {
    return true;
  }

  // If the charger IS exclusive to one or more car brands, the vehicle brand must match
  if (!vehicleBrand || !vehicleBrand.trim()) {
    return false;
  }

  const vBrandClean = vehicleBrand.trim().toUpperCase();
  return brands.some(b => vBrandClean.includes(b) || b.includes(vBrandClean));
}


import { supabase } from '@/lib/supabase';
import { ECUADOR_CHARGERS_FALLBACK } from '@/lib/data/ecuador-chargers';
import corrections from '@/lib/data/chargers-corrections.json';

let memoryChargersCache: Charger[] | null = null;
let memoryChargersCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de validez fresca
const STORAGE_KEY = 'chargeway_chargers_cache_v1';

function parseRawChargerData(data: any[]): Charger[] {
  return data.map((item: any) => {
    let lat = Number(item.lat) || 0;
    let lng = Number(item.lng) || 0;

    // Apply automatic geocoded corrections from Google Maps links
    const correction = (corrections as Record<string, { lat: number; lng: number }>)[item.id];
    if (correction) {
      lat = correction.lat;
      lng = correction.lng;
    }

    // Fallback manual backups
    if (item.name === 'Plaza La Quadra' && lng < -81.5) {
      lat = -0.94552;
      lng = -80.75269;
    }
    if (item.name && item.name.includes('Valle de los Chillos') && lng < -78.5) {
      lat = -0.3046721;
      lng = -78.4518576;
    }

    return {
      id: item.id,
      nombre: item.name,
      provincia: item.province || '',
      canton: item.city_or_canton || '',
      velocidad: item.speed || '',
      tipo_cargador: item.charger_type || '',
      potencia: item.power || '',
      horario: item.schedule || '',
      costo: item.cost_type || '',
      enlace_gps: item.gps_link || '',
      fuente: 'Supabase',
      location: { lat, lng },
      exclusiveBrands: getChargerExclusiveBrands(item.name, item.operator),
      photo_url: item.photo_url || undefined
    };
  }).filter((c: Charger) => c.location.lat !== 0 && c.location.lng !== 0) as Charger[];
}

export async function fetchAllEcuadorChargers(): Promise<Charger[]> {
  const now = Date.now();

  // 1. Memoria RAM instantánea (0ms)
  if (memoryChargersCache && (now - memoryChargersCacheTime < CACHE_TTL_MS)) {
    return memoryChargersCache;
  }

  // 2. LocalStorage en navegador (persistente entre recargas de página)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.chargers) && parsed.chargers.length > 0) {
          memoryChargersCache = parsed.chargers;
          memoryChargersCacheTime = parsed.timestamp || now;

          // Si el caché tiene menos de 12 horas, retornamos inmediatamente y revalidamos en segundo plano
          if (now - (parsed.timestamp || 0) < 12 * 60 * 60 * 1000) {
            // SWR: Revalidación en segundo plano silenciosa
            setTimeout(() => {
              supabase.from('charging_points').select('*').then(({ data, error }) => {
                if (!error && data && data.length > 0) {
                  const updated = parseRawChargerData(data);
                  memoryChargersCache = updated;
                  memoryChargersCacheTime = Date.now();
                  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chargers: updated, timestamp: Date.now() }));
                }
              });
            }, 1000);

            return parsed.chargers;
          }
        }
      }
    } catch {
      // Fallback a red si localStorage falla
    }
  }

  // 3. Consulta directa a Supabase
  try {
    const { data, error } = await supabase.from('charging_points').select('*');

    if (error || !data || data.length === 0) {
      return ECUADOR_CHARGERS_FALLBACK;
    }

    const chargers = parseRawChargerData(data);
    memoryChargersCache = chargers;
    memoryChargersCacheTime = now;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ chargers, timestamp: now }));
      } catch {}
    }

    return chargers;
  } catch {
    return ECUADOR_CHARGERS_FALLBACK;
  }
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchChargersAlongRoute(
  _polyline: string,
  distanceKm: number = 12,
  routeCoordinates?: { lat: number; lng: number }[]
): Promise<Charger[]> {
  const all = await fetchAllEcuadorChargers();

  if (routeCoordinates && routeCoordinates.length > 0) {
    return all.filter(charger => {
      let minDist = Infinity;
      for (const rc of routeCoordinates) {
        const d = getDistanceKm(charger.location.lat, charger.location.lng, rc.lat, rc.lng);
        if (d < minDist) minDist = d;
      }
      return minDist <= distanceKm;
    });
  }

  return all;
}
