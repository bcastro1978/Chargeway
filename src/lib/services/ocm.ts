/**
 * Open Charge Map Service for ChargeWay
 * Fetches and normalizes OCM data for Ecuador.
 * Docs: https://openchargemap.org/site/develop/api
 */

import type { Charger } from './charging';

/** OCM connection type (compact mode) */
interface OCMConnection {
  ConnectionTypeID?: number;
  ConnectionType?: { Title: string };
  PowerKW?: number;
  Quantity?: number;
  StatusTypeID?: number;
  StatusType?: { IsOperational: boolean; Title: string };
  CurrentTypeID?: number;
}

/** OCM Point of Interest (compact mode) */
interface OCMPoi {
  ID: number;
  UUID: string;
  AddressInfo: {
    Title: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Latitude: number;
    Longitude: number;
    AccessComments?: string;
  };
  Connections?: OCMConnection[];
  StatusType?: { IsOperational: boolean; Title: string };
  UsageCost?: string;
  UsageType?: { Title: string };
  OperatorInfo?: { Title: string; WebsiteURL?: string };
  MediaItems?: Array<{ ItemURL: string }>;
  DateLastStatusUpdate?: string;
  NumberOfPoints?: number;
}

/**
 * Maps ConnectionType title → normalized label.
 */
function resolveConnectorType(conn: OCMConnection): string {
  const title = conn.ConnectionType?.Title ?? '';
  if (title.includes('CCS') && title.includes('2')) return 'CCS2';
  if (title.includes('CCS')) return 'CCS1';
  if (title.includes('CHAdeMO')) return 'CHAdeMO';
  if (title.includes('Type 2') || title.includes('Mennekes')) return 'Type 2';
  if (title.includes('Type 1') || title.includes('J1772')) return 'Type 1';
  if (title.includes('GB/T') || title.includes('GBT') || title.includes('Chinese')) return 'GBT';
  if (title.includes('Tesla')) return 'Tesla';
  if (title.includes('Schuko') || title.includes('CEE')) return 'Schuko';
  return title || 'Desconocido';
}

/** Derives speed label from max power kW */
function resolveVelocidad(maxPowerKw: number): string {
  if (maxPowerKw >= 50) return '🟢 RÁPIDO';
  if (maxPowerKw >= 11) return '🟡 SEMI-RÁPIDO';
  return '🟠 NORMAL';
}

export type OCMCharger = Charger & {
  powerKw: number;
  statusOperational: boolean;
  numPoints: number;
  lastVerified: string;
  connectorTypes: string[];
};

/**
 * Normalizes an OCM POI into ChargeWay's Charger interface,
 * extended with OCM-specific numeric fields.
 */
export function normalizeOCMPoi(poi: OCMPoi): OCMCharger {
  const connections = poi.Connections ?? [];
  const maxPowerKw = connections.length > 0
    ? Math.max(...connections.map(c => c.PowerKW ?? 0))
    : 0;
  const connectorTypes = [...new Set(connections.map(c => resolveConnectorType(c)))];
  const numPoints = poi.NumberOfPoints ??
    connections.reduce((s, c) => s + (c.Quantity ?? 1), 0);
  const isOperational = poi.StatusType?.IsOperational ?? true;

  return {
    id: `ocm-${poi.ID}`,
    uuid: poi.UUID,
    nombre: poi.AddressInfo.Title,
    provincia: poi.AddressInfo.StateOrProvince ?? '',
    canton: poi.AddressInfo.Town ?? '',
    city: poi.AddressInfo.Town ?? '',
    velocidad: resolveVelocidad(maxPowerKw),
    tipo_cargador: connectorTypes.join(' / ') || 'Desconocido',
    potencia: maxPowerKw > 0 ? `${maxPowerKw}kW` : 'N/D',
    horario: poi.AddressInfo.AccessComments ?? '24/7',
    costo: poi.UsageCost ?? 'Consultar',
    enlace_gps: `https://maps.google.com/?q=${poi.AddressInfo.Latitude},${poi.AddressInfo.Longitude}`,
    fuente: 'OpenChargeMap',
    address: poi.AddressInfo.AddressLine1,
    operator: poi.OperatorInfo?.Title,
    location: { lat: poi.AddressInfo.Latitude, lng: poi.AddressInfo.Longitude },
    // OCM-specific extensions
    powerKw: maxPowerKw,
    statusOperational: isOperational,
    numPoints,
    lastVerified: poi.DateLastStatusUpdate ?? '',
    connectorTypes,
    connections: connections.map(c => ({
      type: resolveConnectorType(c),
      power: c.PowerKW ?? 0,
      current: c.CurrentTypeID === 10 ? 'AC' : c.CurrentTypeID === 20 ? 'DC' : 'AC/DC',
    })),
  };
}

const OCM_BASE = 'https://api.openchargemap.io/v3/poi';

/**
 * Fetches all Ecuador chargers from Open Charge Map.
 * Server-side only (uses OPEN_CHARGE_MAP_KEY env var).
 * Uses Next.js fetch cache with 1-hour revalidation.
 */
export async function fetchOCMChargers(apiKey: string): Promise<OCMCharger[]> {
  const params = new URLSearchParams({
    output: 'json',
    countrycode: 'EC',
    maxresults: '500',
    compact: 'true',
    verbose: 'false',
    key: apiKey,
  });

  const res = await fetch(`${OCM_BASE}?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }, // Cache 1 hour
  });

  if (!res.ok) {
    throw new Error(`OCM API error: ${res.status} ${res.statusText}`);
  }

  const data: OCMPoi[] = await res.json();
  return data
    .filter(poi => poi.AddressInfo?.Latitude && poi.AddressInfo?.Longitude)
    .map(normalizeOCMPoi);
}

/**
 * Haversine distance in km between two points.
 */
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Merges local Supabase/JSON chargers with OCM chargers.
 *
 * Strategy:
 * - Keep ALL local chargers (they have curated Ecuador-specific data).
 * - For each local charger, if an OCM charger is within 100m, enrich it
 *   with powerKw and statusOperational from OCM.
 * - Add OCM chargers that have no local match (>100m from any local point).
 *
 * Result: union of both datasets, deduped by proximity.
 */
export function mergeChargers(
  local: Charger[],
  ocm: OCMCharger[]
): OCMCharger[] {
  const MATCH_RADIUS_KM = 0.1; // 100 meters

  // Track which OCM chargers were merged into a local record
  const usedOcmIds = new Set<string>();

  const merged: OCMCharger[] = local.map(localCharger => {
    // Find nearest OCM charger within 100m
    let nearestOcm: OCMCharger | null = null;
    let nearestDist = Infinity;

    for (const ocmCharger of ocm) {
      const d = distKm(
        localCharger.location.lat, localCharger.location.lng,
        ocmCharger.location.lat, ocmCharger.location.lng
      );
      if (d < nearestDist) {
        nearestDist = d;
        nearestOcm = ocmCharger;
      }
    }

    if (nearestOcm && nearestDist <= MATCH_RADIUS_KM) {
      usedOcmIds.add(nearestOcm.id);
      // Local record wins for editorial fields, OCM enriches with power/status
      return {
        ...localCharger,
        powerKw: nearestOcm.powerKw,
        statusOperational: nearestOcm.statusOperational,
        numPoints: nearestOcm.numPoints,
        lastVerified: nearestOcm.lastVerified,
        connectorTypes: nearestOcm.connectorTypes,
        connections: nearestOcm.connections,
        // Keep local potencia if OCM has no power data
        potencia: nearestOcm.powerKw > 0 ? `${nearestOcm.powerKw}kW` : localCharger.potencia,
        // Update velocidad based on real power
        velocidad: nearestOcm.powerKw > 0
          ? resolveVelocidad(nearestOcm.powerKw)
          : localCharger.velocidad,
      } as OCMCharger;
    }

    // Local only — no OCM match
    return {
      ...localCharger,
      powerKw: parsePowerKw(localCharger.potencia),
      statusOperational: true, // assume operational if no OCM data
      numPoints: 1,
      lastVerified: '',
      connectorTypes: [localCharger.tipo_cargador],
    } as OCMCharger;
  });

  // Add OCM-only chargers (not matched to any local record)
  for (const ocmCharger of ocm) {
    if (!usedOcmIds.has(ocmCharger.id)) {
      merged.push(ocmCharger);
    }
  }

  return merged;
}

/** Parses "50kW" → 50, "7.4 kW" → 7.4, "N/D" → 0 */
function parsePowerKw(potencia: string): number {
  const match = potencia?.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Calculates estimated charging time in minutes.
 * @param batteryKwh - Total usable battery (e.g. 60.4 for BYD Atto3)
 * @param currentSoc - Current state of charge (0-1)
 * @param targetSoc - Target state of charge (default 0.80 = 80%)
 * @param chargerPowerKw - Charger power in kW
 */
export function calcChargingTimeMin(
  batteryKwh: number,
  currentSoc: number,
  targetSoc: number = 0.80,
  chargerPowerKw: number
): number | null {
  if (chargerPowerKw <= 0) return null;
  // Charging curve: DC fast chargers slow above 80% — model as constant rate to 80%
  const effectiveSoc = Math.min(targetSoc, 0.80);
  const kwhNeeded = batteryKwh * Math.max(0, effectiveSoc - currentSoc);
  // Account for charging efficiency (~92% for DC, ~88% for AC)
  const efficiency = chargerPowerKw >= 50 ? 0.92 : 0.88;
  return Math.round((kwhNeeded / (chargerPowerKw * efficiency)) * 60);
}
