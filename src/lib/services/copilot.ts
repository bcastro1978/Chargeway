/**
 * Copiloto EV Inteligente para ChargeWay (Vertex AI / Gemini 2.5 Flash / Motor Experto)
 * Asistente especializado en autonomía eléctrica, consumo en los Andes ecuatorianos y electrolineras.
 */

export interface CopilotActiveTrip {
  originName?: string;
  destinationName?: string;
  destinationLat?: number;
  destinationLng?: number;
  isRoundTrip?: boolean;
  distanceKm: number;
  durationMin: number;
  consumptionKwh: number;
  arrivalSoc: number; // Porcentaje con el que llega a destino (ej. 14)
  arrivalRangeKm?: number;
  safetyMarginKm?: number;
  recommendedChargerName?: string;
  suggestedStop?: {
    name: string;
    lat: number;
    lng: number;
    power?: string;
    canton?: string;
    kwhToCharge?: number;
    estMinutes?: number;
    targetSocPct?: number;
    arrivalSocPct?: number;
  };
  suggestedStops?: Array<{
    name: string;
    lat: number;
    lng: number;
    power?: string;
    canton?: string;
    kwhToCharge?: number;
    estMinutes?: number;
    targetSocPct?: number;
    arrivalSocPct?: number;
    legIndex?: number;
    totalLegs?: number;
    posKm?: number;
  }>;
}

export interface CopilotContext {
  userId?: string;
  userEmail?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  batteryCapacityKwh?: number;
  currentSoC?: number; // Porcentaje actual de batería (ej. 68)
  wltpRangeKm?: number;
  estimatedRangeKm?: number; // Autonomía estimada mostrada en el panel (ej. 234 km)
  destinationCity?: string;
  currentLocationName?: string;
  ambientTempC?: number;
  activeTrip?: CopilotActiveTrip;
  preferences?: {
    minArrivalSocSafetyMargin?: number;
    preferredBrands?: string[];
    drivingStyle?: 'eco' | 'normal' | 'sport';
    voiceAlertsEnabled?: boolean;
    minPowerFilterKw?: number;
  };
  routeChargers?: Array<{
    id: string;
    name: string;
    power: string;
    speed: string;
    lat: number;
    lng: number;
    operator?: string;
    isBrandMatch?: boolean;
    isNecessaryStop?: boolean;
    legIndex?: number;
    totalLegs?: number;
    kwhToCharge?: number;
    estMinutes?: number;
  }>;
}

export type CopilotActionType =
  | 'set_destination'
  | 'add_waypoint'
  | 'plan_route'
  | 'filter_chargers'
  | 'change_vehicle'
  | 'remove_waypoint'
  | 'toggle_theme'
  | 'toggle_elevation'
  | 'report_charger'
  | 'update_preferences';

export interface CopilotDestination {
  name: string;
  lat: number;
  lng: number;
  distKm?: number;
  isRoundTrip?: boolean;
  origin?: { name: string; lat: number; lng: number };
  vehicleModel?: string;
  vehicleBrand?: string;
  waypoints?: Array<{ name: string; lat: number; lng: number }>;
}

export interface CopilotCharger {
  name: string;
  lat: number;
  lng: number;
  power?: string;
  speed?: string;
  operator?: string;
  isBrandMatch?: boolean;
  isNecessaryStop?: boolean;
  legIndex?: number;
  totalLegs?: number;
  kwhToCharge?: number;
  estMinutes?: number;
  posKm?: number;
  isInbound?: boolean;
  distKm?: number;
  statusBadge?: string;
}

export interface CopilotPlace {
  name: string;
  category: string;
  rating?: number;
  address?: string;
  isOpenNow?: boolean;
  mapsUri?: string;
}

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  destination?: CopilotDestination;
  chargers?: CopilotCharger[];
  places?: CopilotPlace[];
  action?: CopilotActionType;
  actionPayload?: Record<string, any>;
  waypoint?: {
    name: string;
    lat: number;
    lng: number;
    power?: string;
  };
}

export interface CopilotResponse {
  text: string;
  audioRecommended?: boolean;
  destination?: CopilotDestination;
  chargers?: CopilotCharger[];
  places?: CopilotPlace[];
  action?: CopilotActionType;
  actionPayload?: Record<string, any>;
  waypoint?: {
    name: string;
    lat: number;
    lng: number;
    power?: string;
  };
  quota?: {
    limit: number;
    remaining: number;
    used: number;
  };
}

export async function askEvCopilot(
  userQuery: string,
  context?: CopilotContext,
  history?: CopilotMessage[]
): Promise<CopilotResponse> {
  try {
    const res = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userQuery,
        context,
        history,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        text: data.reply || (res.status === 429
          ? 'Has alcanzado el límite de 20 consultas diarias. Por favor vuelve a intentarlo mañana.'
          : `Error en copiloto: ${res.statusText}`),
        quota: data.quota,
      };
    }

    return {
      text: data.reply || 'Lo siento, no pude procesar la consulta en este momento.',
      audioRecommended: true,
      destination: data.destination,
      chargers: data.chargers,
      places: data.places,
      action: data.action,
      waypoint: data.waypoint,
      quota: data.quota,
    };
  } catch (err) {
    console.error('Error invoking EV Copilot:', err);
    return {
      text: 'Error al conectar con el copiloto. Por favor verifica tu conexión a internet.',
    };
  }
}
