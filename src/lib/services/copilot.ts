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
}

export interface CopilotContext {
  vehicleModel?: string;
  batteryCapacityKwh?: number;
  currentSoC?: number; // Porcentaje actual de batería (ej. 68)
  wltpRangeKm?: number;
  estimatedRangeKm?: number; // Autonomía estimada mostrada en el panel (ej. 234 km)
  destinationCity?: string;
  currentLocationName?: string;
  ambientTempC?: number;
  activeTrip?: CopilotActiveTrip;
  routeChargers?: Array<{
    id: string;
    name: string;
    power: string;
    speed: string;
    lat: number;
    lng: number;
  }>;
}

export interface CopilotDestination {
  name: string;
  lat: number;
  lng: number;
  distKm?: number;
  isRoundTrip?: boolean;
}

export interface CopilotCharger {
  name: string;
  lat: number;
  lng: number;
  power?: string;
  speed?: string;
}

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  destination?: CopilotDestination;
  chargers?: CopilotCharger[];
  action?: 'set_destination' | 'add_waypoint';
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
  action?: 'set_destination' | 'add_waypoint';
  waypoint?: {
    name: string;
    lat: number;
    lng: number;
    power?: string;
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

    if (!res.ok) {
      throw new Error(`Copilot API error: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      text: data.reply || 'Lo siento, no pude procesar la consulta en este momento.',
      audioRecommended: true,
      destination: data.destination,
      chargers: data.chargers,
      action: data.action,
      waypoint: data.waypoint,
    };
  } catch (err) {
    console.error('Error invoking EV Copilot:', err);
    return {
      text: 'Error al conectar con el copiloto. Por favor verifica tu conexión a internet.',
    };
  }
}
