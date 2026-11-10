/**
 * ChargeWay Cockpit Telematics Core (Capa 2)
 * Module: Domain Ontology, Canonical Intents & Slot Schemas
 * 
 * Formal specification of driver intent space and entity slots for EV navigation in Ecuador.
 */

export type CockpitIntent =
  | 'INTENT_PLAN_ROUTE'
  | 'INTENT_QUERY_RANGE'
  | 'INTENT_ADD_RECHARGE_STOP'
  | 'INTENT_QUERY_CHARGING_NETWORK'
  | 'INTENT_QUERY_VEHICLE_TELEMETRY'
  | 'INTENT_ABORT_NAVIGATION'
  | 'INTENT_GENERAL_QUERY';

export interface PlanRouteSlots {
  destination: string;
  origin?: string;
  isRoundTrip?: boolean;
  waypoints?: string[];
  startingSoc?: number; // 0 - 100
}

export interface QueryRangeSlots {
  destination: string;
  currentSoc?: number;
}

export interface AddRechargeStopSlots {
  stationNameOrId: string;
}

export interface QueryChargingNetworkSlots {
  location?: string;
  connectorType?: 'CCS2' | 'GBT' | 'TYPE2' | 'CHADEMO';
  fastOnly?: boolean;
}

export interface ExtractedDriverIntent {
  intent: CockpitIntent;
  confidence: number; // 0.0 to 1.0
  slots: {
    planRoute?: PlanRouteSlots;
    queryRange?: QueryRangeSlots;
    addStop?: AddRechargeStopSlots;
    chargingNetwork?: QueryChargingNetworkSlots;
    rawTopic?: string;
  };
}

export interface CanonicalLocationEntry {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  altitudeM: number;
  corridor: 'sierra_norte' | 'sierra_centro' | 'sierra_sur' | 'costa' | 'amazonia' | 'local';
}

/**
 * High-precision Ecuadorian toponym database with canonical altitudes.
 */
export const ECUADOR_CANONICAL_PLACES: CanonicalLocationEntry[] = [
  { name: 'Quito', aliases: ['uio', 'quito', 'carolina', 'cumbaya', 'tumbaco'], lat: -0.1807, lng: -78.4678, altitudeM: 2850, corridor: 'local' },
  { name: 'Guayaquil', aliases: ['gye', 'guayaquil', 'samborondon', 'durán', 'duran'], lat: -2.1894, lng: -79.8891, altitudeM: 10, corridor: 'costa' },
  { name: 'Cuenca', aliases: ['cue', 'cuenca', 'azuay'], lat: -2.9001, lng: -79.0059, altitudeM: 2560, corridor: 'sierra_sur' },
  { name: 'Santo Domingo', aliases: ['santo domingo', 'tsachilas', 'santo domingo de los tsachilas'], lat: -0.2530, lng: -79.1754, altitudeM: 625, corridor: 'costa' },
  { name: 'Ambato', aliases: ['ambato', 'tungurahua'], lat: -1.2491, lng: -78.6168, altitudeM: 2570, corridor: 'sierra_centro' },
  { name: 'Manta', aliases: ['manta', 'manabi', 'tarqui', 'barbasquillo'], lat: -0.9677, lng: -80.7089, altitudeM: 15, corridor: 'costa' },
  { name: 'Ibarra', aliases: ['ibarra', 'imbabura', 'yahuarcocha'], lat: 0.3517, lng: -78.1223, altitudeM: 2225, corridor: 'sierra_norte' },
  { name: 'Loja', aliases: ['loja', 'catamayo'], lat: -3.9931, lng: -79.2042, altitudeM: 2060, corridor: 'sierra_sur' },
  { name: 'Baños', aliases: ['banos', 'baños', 'baños de agua santa'], lat: -1.3964, lng: -78.4247, altitudeM: 1820, corridor: 'sierra_centro' },
  { name: 'Latacunga', aliases: ['latacunga', 'lasso', 'cotopaxi'], lat: -0.9316, lng: -78.6155, altitudeM: 2750, corridor: 'sierra_centro' },
  { name: 'Riobamba', aliases: ['riobamba', 'chimborazo'], lat: -1.6636, lng: -78.6546, altitudeM: 2750, corridor: 'sierra_centro' },
  { name: 'Machala', aliases: ['machala', 'el oro', 'puerto bolivar'], lat: -3.2581, lng: -79.9554, altitudeM: 6, corridor: 'costa' },
  { name: 'Papallacta', aliases: ['papallacta', 'termas de papallacta', 'paso de la virgen'], lat: -0.3789, lng: -78.1408, altitudeM: 3800, corridor: 'amazonia' },
  { name: 'Baeza', aliases: ['baeza', 'quijos'], lat: -0.4628, lng: -77.8906, altitudeM: 1914, corridor: 'amazonia' },
  { name: 'Tena', aliases: ['tena', 'napo', 'misahualli'], lat: -0.9938, lng: -77.8129, altitudeM: 518, corridor: 'amazonia' },
  { name: 'Puyo', aliases: ['puyo', 'pastaza'], lat: -1.4847, lng: -77.9986, altitudeM: 950, corridor: 'amazonia' },
  { name: 'Tulcán', aliases: ['tulcan', 'tulcán', 'rumichaca', 'carchi'], lat: 0.8116, lng: -77.7173, altitudeM: 2980, corridor: 'sierra_norte' },
  { name: 'Esmeraldas', aliases: ['esmeraldas', 'atacames', 'tonsupa', 'same'], lat: 0.9682, lng: -79.6517, altitudeM: 15, corridor: 'costa' },
];

export function resolveCanonicalPlace(rawText: string): CanonicalLocationEntry | undefined {
  if (!rawText) return undefined;
  const cleaned = rawText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  for (const entry of ECUADOR_CANONICAL_PLACES) {
    const normName = entry.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (cleaned === normName || entry.aliases.some(a => cleaned === a || cleaned.includes(a))) {
      return entry;
    }
  }

  // Substring match with minimum 4 chars
  if (cleaned.length >= 4) {
    for (const entry of ECUADOR_CANONICAL_PLACES) {
      const normName = entry.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normName.includes(cleaned) || cleaned.includes(normName)) {
        return entry;
      }
    }
  }

  return undefined;
}

