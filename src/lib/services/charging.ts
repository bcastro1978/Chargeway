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
}

import { supabase } from '@/lib/supabase';
import { ECUADOR_CHARGERS_FALLBACK } from '@/lib/data/ecuador-chargers';
import corrections from '@/lib/data/chargers-corrections.json';

export async function fetchAllEcuadorChargers(): Promise<Charger[]> {
  try {
    const { data, error } = await supabase.from('charging_points').select('*');

    if (error || !data || data.length === 0) {
      return ECUADOR_CHARGERS_FALLBACK;
    }

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
        location: { lat, lng }
      };
    }).filter((c: Charger) => c.location.lat !== 0 && c.location.lng !== 0) as Charger[];
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
  distanceKm: number = 30,
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
