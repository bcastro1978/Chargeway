import { withTiming } from '@/lib/server-timing';
import { NextResponse } from 'next/server';
import vehiclesData from '@/lib/vehicles.json';
import {
  findEcuadorDestination,
  getRouteChargersFromSupabase,
  getPlacesRecommendationsFromGoogle,
} from '@/lib/services/ecuadorGuideAgent';
import { isChargerBrandCompatible, isChargerMultibrand, fetchAllEcuadorChargers, Charger } from '@/lib/services/charging';
import { orderRouteWithStops } from '@/lib/services/route-helpers';
import { geocodePlace } from '@/lib/services/mapbox';
import {
  CopilotChargerInfo,
  CityRouteInfo,
  ECUADOR_ROUTES,
  CORRIDOR_CHARGERS,
  isBrandMatch,
  prioritizeChargersByBrand,
} from '@/lib/data/ecuador-routes';

interface CopilotContext {
  vehicleBrand?: string;
  vehicleModel?: string;
  batteryCapacityKwh?: number;
  currentSoC?: number;
  destinationCity?: string;
  ambientTempC?: number;
  currentCoords?: [number, number]; // [lng, lat]
  estimatedRangeKm?: number;
  wltpRangeKm?: number;
  activeTrip?: any;
  routeChargers?: CopilotChargerInfo[];
}

interface MessageHistoryItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Catálogos y presets de corredores modularizados en @/lib/data/ecuador-routes

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (!a || !b) return (a || '').length + (b || '').length;
  const an = a.length;
  const bn = b.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

function isFuzzyWordMatch(target: string, candidate: string): boolean {
  const t = normalize(target);
  const c = normalize(candidate);
  if (t === c) return true;
  // Si target o candidate contienen espacios (nombres compuestos como "nueva loja"),
  // una sola palabra individual nunca debe considerarse coincidencia difusa para evitar falsos positivos
  if (t.includes(' ') || c.includes(' ')) return false;
  // La primera letra debe coincidir para evitar falsos positivos con rimas (ej. santa vs manta)
  if (!t || !c || t[0] !== c[0]) return false;
  const maxDist = t.length >= 7 ? 2 : (t.length >= 5 ? 1 : 0);
  return levenshtein(t, c) <= maxDist;
}

function extractBrandFromQuery(text: string): string | undefined {
  if (!text) return undefined;
  const norm = normalize(text);
  const brands = [
    'neta', 'byd', 'kia', 'jac', 'tesla', 'chevrolet', 'hyundai',
    'audi', 'bmw', 'volvo', 'porsche', 'renault', 'nissan',
    'leapmotor', 'geely', 'changan', 'mg', 'maxus', 'gwm', 'ora', 'dongfeng'
  ];
  for (const b of brands) {
    const regex = new RegExp(`\\b${b}\\b`, 'i');
    if (regex.test(norm)) {
      return b.toUpperCase();
    }
  }
  return undefined;
}

const DEST_TRIGGER_REGEX = /(?:quiero\s+ir\s+(?:hasta|al?|hacia)?|necesito\s+ir\s+(?:hasta|al?|hacia)?|voy\s+a\s+(?:viajar|ir)?\s*(?:hasta|al?|hacia)?|viajar\s+(?:hasta|al?|hacia)?|viaje\s+(?:hasta|al?|hacia)?|llegar\s+(?:hasta|al?|hacia)?|llego\s+(?:hasta|al?|hacia)?|ir\s+(?:hasta|al?|hacia)?|para\s+ir\s+(?:hasta|al?|hacia)?|cuanto\s+necesito\s+para\s+ir\s+(?:hasta|al?|hacia)?|como\s+lleg(?:o|ar)\s+(?:hasta|al?|hacia)?|vamos\s+(?:hasta|al?|hacia|para)?|traza(?:r|me)?\s+(?:la\s+|una\s+)?ruta\s+(?:hasta|al?|hacia)?|ruta\s+(?:hasta|al?|hacia)?|dirigirme\s+(?:hasta|al?|hacia)?|conducir\s+(?:hasta|al?|hacia)?|hacia|hasta)\s+([a-záéíóúñ\s]+)/i;

function findEcuadorRoute(text: string): CityRouteInfo | undefined {
  if (!text) return undefined;
  const norm = normalize(text);

  // 1. Coincidencia directa por nombre o alias exacto / contenido (priorizando el match más específico/largo)
  const directMatches: Array<{ route: CityRouteInfo; matchLength: number }> = [];
  for (const r of ECUADOR_ROUTES) {
    const rNameNorm = normalize(r.name);
    if (norm === rNameNorm || norm.includes(rNameNorm)) {
      directMatches.push({ route: r, matchLength: rNameNorm.length });
      continue;
    }
    for (const a of r.aliases) {
      const aNorm = normalize(a);
      if (norm === aNorm || norm.includes(aNorm) || (aNorm.length >= 4 && norm.split(/\s+/).includes(aNorm))) {
        directMatches.push({ route: r, matchLength: aNorm.length });
        break;
      }
    }
  }
  if (directMatches.length > 0) {
    directMatches.sort((a, b) => b.matchLength - a.matchLength);
    return directMatches[0].route;
  }

  // 2. Coincidencia difusa por palabras (tolerancia a errores ortográficos como 'riobamaba')
  const words = norm.split(/[\s,.-]+/).filter(w => w.length >= 4 && !['quiero', 'hasta', 'desde', 'para', 'volver', 'regresar', 'carga', 'cargador', 'bateria', 'auto', 'carro', 'hacer'].includes(w));
  for (const word of words) {
    for (const route of ECUADOR_ROUTES) {
      if (isFuzzyWordMatch(route.name, word)) return route;
      for (const alias of route.aliases) {
        if (isFuzzyWordMatch(alias, word)) return route;
      }
    }
  }

  return undefined;
}

/**
 * Cálculo Dinámico de Rutas usando Mapbox Geocoding & Directions
 */
async function calculateDynamicRoute(
  destinationName: string,
  originCoords: [number, number] = [-78.4678, -0.1807]
): Promise<{ placeName: string; distKm: number; durationText: string; corridor: string; coords: { lat: number; lng: number }; midpointCoords?: { lat: number; lng: number } } | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) return null;

  try {
    const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      destinationName + ' Ecuador'
    )}.json?country=EC&access_token=${mapboxToken}`;

    const geoRes = await fetch(geoUrl, { next: { revalidate: 86400 } });
    const geoData = await geoRes.json();
    const feature = geoData?.features?.[0];
    if (!feature) return null;

    const textNorm = normalize(feature.text || '');
    if (textNorm === 'ecuador' || feature.place_type?.includes('country')) {
      return null;
    }

    const [destLng, destLat] = feature.center;
    const placeName = feature.text || destinationName;

    // Determinar corredor según coordenadas
    let corridor = 'local';
    if (destLat > 0.1) corridor = 'norte';
    else if (destLat < -0.8) corridor = 'sur';
    else if (destLng < -78.8) corridor = 'costa';
    else if (destLng > -78.1) corridor = 'oriente';

    const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destLng},${destLat}?overview=simplified&geometries=geojson&access_token=${mapboxToken}`;
    const dirRes = await fetch(dirUrl);
    const dirData = await dirRes.json();
    const route = dirData?.routes?.[0];
    if (!route) return null;

    const distKm = Math.round(route.distance / 1000);
    const durationMin = Math.round(route.duration / 60);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationText = hours > 0 ? `${hours} horas y ${mins} minutos` : `${mins} minutos`;

    // Calcular el punto medio geográfico real a lo largo de la carretera
    const routeCoords = route.geometry?.coordinates as [number, number][] | undefined;
    let midpointCoords: { lat: number; lng: number } | undefined = undefined;
    if (routeCoords && routeCoords.length > 2) {
      const midIdx = Math.floor(routeCoords.length / 2);
      midpointCoords = { lat: routeCoords[midIdx][1], lng: routeCoords[midIdx][0] };
    }

    return {
      placeName,
      distKm,
      durationText,
      corridor,
      coords: { lat: destLat, lng: destLng },
      midpointCoords,
    };
  } catch (err) {
    console.error('Dynamic routing error:', err);
    return null;
  }
}

/**
 * Extraer destino previo e información de distancia de los mensajes anteriores o del viaje activo
 */
interface ConversationalTripState {
  destName: string;
  originName?: string;
  distKm: number;
  totalDistKm?: number;
  corridor: string;
  coords: { lat: number; lng: number };
  chargers: CopilotChargerInfo[];
  deficitKm: number;
  isRoundTrip?: boolean;
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
    isInbound?: boolean;
  };
  suggestedStops?: any[];
}

/**
 * Extraer estado y destino previo con persistencia de contexto entre turnos de conversación
 */
function extractConversationState(
  history: MessageHistoryItem[],
  activeTrip?: any,
  context?: any
): ConversationalTripState | null {
  // 1. Prioridad: Viaje activo en el mapa
  if (activeTrip && Number(activeTrip.distanceKm) > 0) {
    const destName = activeTrip.destinationName || 'Destino';
    const isRound = !!activeTrip.isRoundTrip;
    const totalDistKm = Math.round(Number(activeTrip.distanceKm));
    const distKm = isRound ? Math.round(totalDistKm / 2) : totalDistKm;
    const norm = normalize(destName);
    const routeMatch = ECUADOR_ROUTES.find(r => r.aliases.some(a => norm.includes(a)));

    let corridor = routeMatch ? routeMatch.corridor : 'local';
    let coords = routeMatch?.coords || { lat: -0.18, lng: -78.46 };
    let chargers = routeMatch?.chargers || [];

    if (!routeMatch) {
      const dLat = Number(activeTrip.destinationLat);
      const dLng = Number(activeTrip.destinationLng);
      const hasCoords = !isNaN(dLat) && !isNaN(dLng) && (Math.abs(dLat) > 0.001 || Math.abs(dLng) > 0.001);

      if (norm.includes('lago agrio') || norm.includes('sucumbios') || norm.includes('coca') || norm.includes('tena') || norm.includes('puyo') || norm.includes('baeza') || (hasCoords && dLng > -78.1)) {
        corridor = 'oriente';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: 0.0847, lng: -76.8828 };
        chargers = CORRIDOR_CHARGERS['oriente'].list;
      } else if (norm.includes('esmeraldas') || norm.includes('atacames') || norm.includes('manta') || norm.includes('guayaquil') || norm.includes('santo domingo') || norm.includes('quevedo') || norm.includes('pedernales') || norm.includes('cojimies') || norm.includes('manabi') || norm.includes('bahia') || norm.includes('portoviejo') || norm.includes('chone') || (hasCoords && dLng < -78.8)) {
        corridor = 'costa';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: 0.0698, lng: -80.0548 };
        chargers = CORRIDOR_CHARGERS['costa'].list;
      } else if (norm.includes('cuenca') || norm.includes('loja') || norm.includes('machala') || norm.includes('riobamba') || norm.includes('ambato') || (hasCoords && dLat < -0.6)) {
        corridor = 'sur';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: -1.2491, lng: -78.6168 };
        chargers = CORRIDOR_CHARGERS['sur'].list;
      } else if (norm.includes('ibarra') || norm.includes('tulcan') || norm.includes('otavalo') || norm.includes('cayambe') || norm.includes('bolivar') || norm.includes('carchi') || norm.includes('san gabriel') || norm.includes('mira') || (hasCoords && dLat > 0.05 && dLng >= -78.8 && dLng <= -77.5)) {
        corridor = 'norte';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: 0.3517, lng: -78.1223 };
        chargers = CORRIDOR_CHARGERS['norte'].list;
      } else {
        corridor = 'local';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: -0.18, lng: -78.46 };
        chargers = [];
      }
    }

    if ((!chargers || chargers.length === 0) && context?.routeChargers && context.routeChargers.length > 0) {
      chargers = context.routeChargers.filter((c: any) => {
        if (distKm > 80 && c.lat > -0.42 && c.lng > -78.52) return false;
        return true;
      });
      if (chargers.length === 0) chargers = context.routeChargers;
    }

    const deficitKm = Math.max(0, distKm - Number(context?.estimatedRangeKm || 200));
    const activeSuggestedStop = activeTrip.suggestedStop || (activeTrip.suggestedStops && activeTrip.suggestedStops[0]);
    const activeSuggestedStops = activeTrip.suggestedStops || (activeTrip.suggestedStop ? [activeTrip.suggestedStop] : []);

    return {
      destName,
      originName: activeTrip.originName,
      distKm,
      totalDistKm,
      corridor,
      coords,
      chargers,
      deficitKm,
      isRoundTrip: isRound,
      suggestedStop: activeSuggestedStop,
      suggestedStops: activeSuggestedStops,
    };
  }

  // 2. Prioridad: Mensajes previos en el historial (de más reciente a más antiguo)
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i] as any;
    if (msg.role === 'assistant') {
      const isMsgRoundTrip = !!msg.destination?.isRoundTrip || (msg.content && msg.content.toLowerCase().includes('ir y regresar'));
      if (msg.destination && msg.destination.name) {
        const destName = msg.destination.name;
        let distKm = msg.destination.distKm || 150;
        let totalDistKm = isMsgRoundTrip ? distKm * 2 : distKm;
        const routeCheck = ECUADOR_ROUTES.find(r => normalize(r.name) === normalize(destName) || r.aliases.some(a => normalize(destName).includes(a)));
        if (routeCheck && isMsgRoundTrip && distKm > routeCheck.distKm * 1.5) {
          totalDistKm = distKm;
          distKm = Math.round(totalDistKm / 2);
        }
        const coords = { lat: msg.destination.lat || 0, lng: msg.destination.lng || 0 };

        let corridor = 'costa';
        if (coords.lng > -78.1) corridor = 'oriente';
        else if (coords.lng < -78.8) corridor = 'costa';
        else if (coords.lat < -0.6) corridor = 'sur';
        else if (coords.lat > 0.1 && coords.lng >= -78.8 && coords.lng <= -77.8) corridor = 'norte';

        const routeMatch = ECUADOR_ROUTES.find(r => normalize(r.name) === normalize(destName) || r.aliases.some(a => normalize(destName).includes(a)));
        const catalogChargers = routeMatch?.chargers || CORRIDOR_CHARGERS[corridor]?.list || [];

        const rawChargers = msg.chargers && msg.chargers.length > 0 ? msg.chargers : catalogChargers;
        // Filtrar cargadores pegados al origen (ej. Pillajo en Quito) para viajes interurbanos
        const chargers = rawChargers.filter((c: any) => {
          if (distKm > 80 && c.lat > -0.42 && c.lng > -78.52) return false;
          return true;
        });
        const finalChargers = chargers.length > 0 ? chargers : rawChargers;
        const deficitKm = Math.max(0, distKm - Number(context?.estimatedRangeKm || 200));

        const necStop = (msg.chargers || []).find((c: any) => c.isNecessaryStop) || msg.chargers?.[0];
        const histSuggestedStop = necStop ? {
          name: necStop.name,
          lat: necStop.lat,
          lng: necStop.lng,
          power: necStop.power,
          canton: necStop.canton,
          kwhToCharge: necStop.kwhToCharge,
          estMinutes: necStop.estMinutes,
          targetSocPct: necStop.targetSocPct,
          arrivalSocPct: necStop.arrivalSocPct,
          isInbound: necStop.isInbound,
        } : undefined;

        return {
          destName,
          distKm,
          corridor,
          coords,
          chargers: finalChargers,
          deficitKm,
          isRoundTrip: isMsgRoundTrip,
          suggestedStop: histSuggestedStop,
          suggestedStops: msg.chargers,
        };
      }

      const text = msg.content || '';
      const match = text.match(/Para viajar a (.+?) son(?: aproximadamente)? (\d+) kilómetros/i) ||
                    text.match(/(?:he trazado la ruta a|ruta trazada a|viaje a)\s+([a-záéíóúñ\s]+?)(?:\s+de ida y vuelta|\s+\((\d+)\s*km\)|$)/i);
      if (match && match[1]) {
        const destName = match[1].trim();
        const distKm = match[2] ? parseInt(match[2], 10) : 150;
        const norm = normalize(destName);

        const routeMatch = ECUADOR_ROUTES.find(r => r.aliases.some(a => norm.includes(a)));
        let corridor = routeMatch ? routeMatch.corridor : 'local';
        let coords = routeMatch?.coords || { lat: 0, lng: 0 };
        let chargers = routeMatch?.chargers || [];

        if (!routeMatch) {
          if (norm.includes('lago agrio') || norm.includes('sucumbios') || norm.includes('coca') || norm.includes('tena') || norm.includes('puyo') || norm.includes('baeza')) {
            corridor = 'oriente';
            coords = { lat: 0.0847, lng: -76.8828 };
            chargers = CORRIDOR_CHARGERS['oriente'].list;
          } else if (norm.includes('esmeraldas') || norm.includes('atacames') || norm.includes('manta') || norm.includes('guayaquil') || norm.includes('santo domingo') || norm.includes('quevedo') || norm.includes('pedernales') || norm.includes('cojimies') || norm.includes('manabi')) {
            corridor = 'costa';
            coords = { lat: 0.0698, lng: -80.0548 };
            chargers = CORRIDOR_CHARGERS['costa'].list;
          } else if (norm.includes('cuenca') || norm.includes('loja') || norm.includes('machala') || norm.includes('riobamba') || norm.includes('ambato')) {
            corridor = 'sur';
            coords = { lat: -1.2491, lng: -78.6168 };
            chargers = CORRIDOR_CHARGERS['sur'].list;
          } else if (norm.includes('ibarra') || norm.includes('tulcan') || norm.includes('otavalo') || norm.includes('cayambe')) {
            corridor = 'norte';
            coords = { lat: 0.3517, lng: -78.1223 };
            chargers = CORRIDOR_CHARGERS['norte'].list;
          } else {
            corridor = 'local';
            coords = { lat: -0.18, lng: -78.46 };
            chargers = [];
          }
        }

        const deficitKm = Math.max(0, distKm - Number(context?.estimatedRangeKm || 200));

        // Extraer parada de recarga mencionada en el texto si la hubo
        let extractedStop: any = undefined;
        const stopMatch = text.match(/(?:paradas? de recarga necesarias?|parada de recarga estratégica|parada estratégica|recomienda recargar en)\s*(?:\(\d+\):?)?\s*([^\n\.\(]+)/i);
        if (stopMatch && stopMatch[1]) {
          const stopNameClean = stopMatch[1].trim();
          const isGarbage = stopNameClean.toLowerCase().startsWith('para que') || stopNameClean.toLowerCase().startsWith('para llegar') || stopNameClean.length > 50;
          if (!isGarbage) {
            const kwhMatch = text.match(/~?(\d+(?:\.\d+)?)\s*kWh/i);
            const minMatch = text.match(/~?(\d+)\s*min/i);
            extractedStop = {
              name: stopNameClean,
              lat: coords.lat,
              lng: coords.lng,
              kwhToCharge: kwhMatch ? parseFloat(kwhMatch[1]) : 22,
              estMinutes: minMatch ? parseInt(minMatch[1], 10) : 25,
            };
          }
        }

        // Si no se extrajo un nombre válido del texto, buscar en los cargadores de la ruta
        if (!extractedStop && chargers && chargers.length > 0) {
          const nec = chargers.find((c: any) => c.isNecessaryStop) || chargers[0];
          extractedStop = {
            name: nec.name,
            lat: nec.lat,
            lng: nec.lng,
            power: nec.power,
            kwhToCharge: (nec as any).kwhToCharge || 22,
            estMinutes: (nec as any).estMinutes || 25,
          };
        }

        return {
          destName,
          distKm,
          corridor,
          coords,
          chargers,
          deficitKm,
          isRoundTrip: text.toLowerCase().includes('ida y vuelta') || text.toLowerCase().includes('regres'),
          suggestedStop: extractedStop,
        };
      }
    }
  }

  return null;
}

interface MultiStopWaypoint {
  name: string;
  lat: number;
  lng: number;
}

interface MultiStopDetection {
  destName: string;
  totalKm: number;
  isRoundTrip: boolean;
  waypoints: MultiStopWaypoint[];
  chargers: CopilotChargerInfo[];
  recommendedStop: string;
  reply: string;
  waypointCharger?: { name: string; lat: number; lng: number };
  origin?: { name: string; lat: number; lng: number };
  vehicleModel?: string;
  vehicleBrand?: string;
}

const ECUADOR_CITIES_CATALOG = [
  { name: 'Quito', aliases: ['quito', 'uio', 'mariana de jesus', 'rumipamba'], lat: -0.1807, lng: -78.4678, corridor: 'local' },
  { name: 'Machachi', aliases: ['machachi', 'mejia', 'aloag', 'alóag'], lat: -0.5098, lng: -78.5675, corridor: 'sur' },
  { name: 'Volcán Cotopaxi', aliases: ['volcan cotopaxi', 'cotopaxi volcan', 'parque nacional cotopaxi', 'refugio cotopaxi', 'volcan cotopaxio', 'cotopaxio', 'cotopaxi'], lat: -0.6838, lng: -78.4372, corridor: 'sur' },
  { name: 'Latacunga', aliases: ['latacunga', 'ciudad de latacunga', 'lassoc', 'lasso'], lat: -0.9316, lng: -78.6155, corridor: 'sur' },
  { name: 'Salcedo', aliases: ['salcedo'], lat: -1.0450, lng: -78.5910, corridor: 'sur' },
  { name: 'Ambato', aliases: ['ambato', 'tungurahua'], lat: -1.2491, lng: -78.6168, corridor: 'sur' },
  { name: 'Pelileo', aliases: ['pelileo'], lat: -1.3300, lng: -78.5440, corridor: 'sur' },
  { name: 'Baños', aliases: ['banos', 'baños', 'banos de agua santa', 'baños de agua santa'], lat: -1.3964, lng: -78.4247, corridor: 'sur' },
  { name: 'Riobamba', aliases: ['riobamba', 'riobamaba', 'chimborazo', 'guano'], lat: -1.6636, lng: -78.6546, corridor: 'sur' },
  { name: 'Guaranda', aliases: ['guaranda', 'provincia de bolivar', 'bolivar guaranda'], lat: -1.5912, lng: -78.9991, corridor: 'sur' },
  { name: 'Alausí', aliases: ['alausi', 'alausí'], lat: -2.2040, lng: -78.8470, corridor: 'sur' },
  { name: 'Cuenca', aliases: ['cuenca', 'azuay'], lat: -2.9001, lng: -79.0059, corridor: 'sur' },
  { name: 'Loja', aliases: ['loja'], lat: -3.9931, lng: -79.2042, corridor: 'sur' },
  { name: 'Santo Domingo', aliases: ['santo domingo', 'tsachilas', 'santo domingo de los tsachilas'], lat: -0.2528, lng: -79.1724, corridor: 'costa' },
  { name: 'Quevedo', aliases: ['quevedo', 'los rios'], lat: -1.0286, lng: -79.4635, corridor: 'costa' },
  { name: 'Guayaquil', aliases: ['guayaquil', 'gye', 'samborondon'], lat: -2.1894, lng: -79.8891, corridor: 'costa' },
  { name: 'Manta', aliases: ['manta', 'tarqui', 'murcielago'], lat: -0.9677, lng: -80.7089, corridor: 'costa' },
  { name: 'Portoviejo', aliases: ['portoviejo', 'manabi'], lat: -1.0544, lng: -80.4545, corridor: 'costa' },
  { name: 'Esmeraldas', aliases: ['esmeraldas'], lat: 0.9682, lng: -79.6517, corridor: 'costa' },
  { name: 'Atacames', aliases: ['atacames', 'tonsupa'], lat: 0.8698, lng: -79.8459, corridor: 'costa' },
  { name: 'Pedernales', aliases: ['pedernales', 'cojimies'], lat: 0.0698, lng: -80.0548, corridor: 'costa' },
  { name: 'Cayambe', aliases: ['cayambe'], lat: 0.0468, lng: -78.2009, corridor: 'norte' },
  { name: 'Otavalo', aliases: ['otavalo'], lat: 0.2337, lng: -78.2625, corridor: 'norte' },
  { name: 'Cotacachi', aliases: ['cotacachi', 'cuicocha'], lat: 0.2992, lng: -78.2669, corridor: 'norte' },
  { name: 'Ibarra', aliases: ['ibarra', 'yahuarcocha'], lat: 0.3517, lng: -78.1223, corridor: 'norte' },
  { name: 'Bolívar (Carchi)', aliases: ['bolivar carchi', 'bolívar carchi', 'bolivar del carchi', 'bolívar del carchi', 'carchi bolivar', 'canton bolivar carchi', 'canton bolivar'], lat: 0.5011, lng: -77.9042, corridor: 'norte' },
  { name: 'San Gabriel', aliases: ['san gabriel', 'montufar', 'montúfar'], lat: 0.5985, lng: -77.8353, corridor: 'norte' },
  { name: 'Tulcán', aliases: ['tulcan', 'tulcán', 'rumichaca'], lat: 0.8123, lng: -77.7170, corridor: 'norte' },
  { name: 'Papallacta', aliases: ['papallacta'], lat: -0.3789, lng: -78.1408, corridor: 'oriente' },
  { name: 'Baeza', aliases: ['baeza'], lat: -0.4610, lng: -77.8890, corridor: 'oriente' },
  { name: 'Tena', aliases: ['tena', 'archidona'], lat: -0.9938, lng: -77.8129, corridor: 'oriente' },
  { name: 'Puyo', aliases: ['puyo'], lat: -1.4883, lng: -77.9984, corridor: 'oriente' },
  { name: 'Macas', aliases: ['macas', 'morona santiago', 'morona'], lat: -2.3087, lng: -78.1114, corridor: 'sur' },
  { name: 'Lago Agrio', aliases: ['lago agrio', 'nueva loja'], lat: 0.0847, lng: -76.8828, corridor: 'oriente' },
  { name: 'Coca', aliases: ['coca', 'el coca', 'orellana'], lat: -0.4664, lng: -76.9878, corridor: 'oriente' },
];

const HIGHWAY_DISTANCE_CACHE: Record<string, number> = {
  'pelileo-volcan cotopaxi': 119,
  'volcan cotopaxi-pelileo': 119,
  'quito-volcan cotopaxi': 75,
  'volcan cotopaxi-quito': 75,
  'ambato-volcan cotopaxi': 88,
  'volcan cotopaxi-ambato': 88,
  'latacunga-volcan cotopaxi': 45,
  'volcan cotopaxi-latacunga': 45,
  'quito-macas': 371,
  'macas-quito': 371,
  'riobamba-macas': 184,
  'macas-riobamba': 184,
  'ambato-macas': 236,
  'macas-ambato': 236,
  'quito-latacunga': 89,
  'latacunga-quito': 89,
  'latacunga-ambato': 44,
  'ambato-latacunga': 44,
  'ambato-riobamba': 54,
  'riobamba-ambato': 54,
  'latacunga-riobamba': 98,
  'riobamba-latacunga': 98,
  'riobamba-quito': 187,
  'quito-riobamba': 187,
  'quito-ambato': 135,
  'ambato-quito': 135,
  'ambato-banos': 40,
  'banos-ambato': 40,
  'banos-quito': 175,
  'quito-banos': 175,
  'quito-otavalo': 95,
  'otavalo-quito': 95,
  'otavalo-ibarra': 25,
  'ibarra-otavalo': 25,
  'ibarra-quito': 115,
  'quito-ibarra': 115,
  'quito-santodomingo': 140,
  'santodomingo-quito': 140,
  'santodomingo-quevedo': 105,
  'quevedo-santodomingo': 105,
  'quevedo-quito': 245,
  'quito-quevedo': 245,
  'quito-guaranda': 235,
  'guaranda-quito': 235,
  'latacunga-guaranda': 144,
  'guaranda-latacunga': 144,
  'ambato-guaranda': 100,
  'guaranda-ambato': 100,
  'riobamba-guaranda': 60,
  'guaranda-riobamba': 60,
  'quito-bolivar(carchi)': 185,
  'bolivar(carchi)-quito': 185,
  'ibarra-bolivar(carchi)': 70,
  'bolivar(carchi)-ibarra': 70,
  'quito-sangabriel': 200,
  'sangabriel-quito': 200,
  'ibarra-sangabriel': 85,
  'sangabriel-ibarra': 85,
  'quito-loja': 650,
  'loja-quito': 650,
  'quito-cuenca': 460,
  'cuenca-quito': 460,
  'cuenca-loja': 210,
  'loja-cuenca': 210,
  'riobamba-cuenca': 255,
  'cuenca-riobamba': 255,
  'quito-guayaquil': 420,
  'guayaquil-quito': 420,
  'quito-manta': 396,
  'manta-quito': 396,
  'quito-salinas': 540,
  'salinas-quito': 540,
  'quito-esmeraldas': 320,
  'esmeraldas-quito': 320,
  'quito-pedernales': 288,
  'pedernales-quito': 288,
  'quito-atacames': 350,
  'atacames-quito': 350,
  'quito-lagoagrio': 276,
};

function detectVehicleFromQuery(normQuery: string): { brand: string; model: string; batteryKwh: number; wltpRangeKm: number; fullName: string } | null {
  try {
    // Solo detectar vehículo si el usuario explícitamente expresa viajar en/con un vehículo o cambiarlo
    // Ej: "en un dolphin", "con mi yuan pro", "a bordo de un tesla", "cambiar a byd seal", "usando un gac"
    const vehicleIntentRegex = /\b(?:en|con|a bordo de|manejando|conducir en|cambiar a|cambia a|en un|en una|con un|con una|usando|en el|en la)\s+([a-z0-9\s]+)/i;
    const match = normQuery.match(vehicleIntentRegex);
    if (!match || !match[1]) {
      return null; // El usuario NO está pidiendo cambiar ni especificar un vehículo diferente
    }

    const queryTarget = match[1];

    for (const v of (vehiclesData as any[])) {
      const baseModel = v.model.replace(/\(.*?\)/g, '').trim();
      const fullNorm = normalize(`${v.brand} ${baseModel}`);
      const modelNorm = normalize(baseModel);

      const escapedFull = fullNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fullRegex = new RegExp(`(^|\\s)${escapedFull}($|\\s)`, 'i');
      if (fullRegex.test(queryTarget)) {
        return {
          brand: v.brand,
          model: v.model,
          batteryKwh: Number(v.specs?.usable_battery_kwh) || 45,
          wltpRangeKm: Number(v.specs?.wltp_range_km) || 320,
          fullName: `${v.brand} ${baseModel}`,
        };
      }

      if (modelNorm.length >= 3) {
        const escapedModel = modelNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const modelRegex = new RegExp(`(^|\\s)${escapedModel}($|\\s)`, 'i');
        if (modelRegex.test(queryTarget)) {
          return {
            brand: v.brand,
            model: v.model,
            batteryKwh: Number(v.specs?.usable_battery_kwh) || 45,
            wltpRangeKm: Number(v.specs?.wltp_range_km) || 320,
            fullName: `${v.brand} ${baseModel}`,
          };
        }
      }
    }
  } catch (e) {
    console.warn('Error detecting vehicle in query:', e);
  }
  return null;
}

function getHighwayDistKm(fromName: string, toName: string, lat1: number, lng1: number, lat2: number, lng2: number): number {
  const normFrom = normalize(fromName).replace(/\s+/g, '');
  const normTo = normalize(toName).replace(/\s+/g, '');
  const key = `${normFrom}-${normTo}`;
  if (HIGHWAY_DISTANCE_CACHE[key]) return HIGHWAY_DISTANCE_CACHE[key];

  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const straightKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(10, Math.round(straightKm * 1.26));
}

function simplifyPlaceName(name?: string): string {
  if (!name) return 'Quito';
  const lower = name.toLowerCase();
  if (
    lower.includes('pichincha') ||
    lower.includes('quito') ||
    lower.includes('rumiñahui') ||
    lower.includes('mariana de jesús') ||
    lower.includes('mariana de jesus')
  ) {
    return 'Quito';
  }
  if (name.includes(',')) {
    const part = name.split(',')[0].trim();
    return part.length > 20 ? 'Origen' : part;
  }
  return name.length > 25 ? 'Origen' : name;
}

const ECUADOR_CHARGERS_BY_ZONE: Array<{
  zoneNames: string[];
  corridor: string;
  chargers: CopilotChargerInfo[];
}> = [
  {
    zoneNames: ['latacunga', 'salcedo', 'cotopaxi', 'lasso'],
    corridor: 'sur',
    chargers: [
      { name: 'Maltería Plaza Latacunga (22 kW)', lat: -0.9250, lng: -78.6100, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    zoneNames: ['ambato', 'pelileo', 'banos', 'baños', 'tungurahua'],
    corridor: 'sur',
    chargers: [
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
      { name: 'BYD - Mall de los Andes (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    zoneNames: ['riobamba', 'guano', 'chimborazo'],
    corridor: 'sur',
    chargers: [
      { name: 'Megamaxi Multiplaza — CONDOR CHARGE (60 kW)', lat: -1.6635, lng: -78.6543, power: '60 kW', speed: 'Rápida' },
      { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    zoneNames: ['cuenca', 'azuay'],
    corridor: 'sur',
    chargers: [
      { name: 'Mall del Río Cuenca (50 kW)', lat: -2.9150, lng: -79.0150, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    zoneNames: ['loja'],
    corridor: 'sur',
    chargers: [
      { name: 'Estación Loja Mall (50 kW)', lat: -3.9931, lng: -79.2042, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    zoneNames: ['santo domingo', 'tsachilas', 'alluriquin'],
    corridor: 'costa',
    chargers: [
      { name: 'KIA - Primax Servi Ruiz Carga Ultrarrápida (100 kW)', lat: -0.2518, lng: -79.1758, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD Bomboli Shopping — CONDOR CHARGE (60 kW)', lat: -0.2544, lng: -79.1922, power: '60 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    zoneNames: ['quevedo', 'los rios'],
    corridor: 'costa',
    chargers: [
      { name: 'Paseo Shopping Quevedo (50 kW)', lat: -1.0286, lng: -79.4635, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    zoneNames: ['guayaquil', 'samborondon', 'durán', 'duran'],
    corridor: 'costa',
    chargers: [
      { name: 'Mall del Sol Guayaquil (50 kW)', lat: -2.1550, lng: -79.8920, power: '50 kW', speed: 'Rápida' },
      { name: 'San Marino Shopping Guayaquil (50 kW)', lat: -2.1740, lng: -79.9000, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    zoneNames: ['ibarra', 'yahuarcocha', 'piman'],
    corridor: 'norte',
    chargers: [
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.1250, power: '50 kW', speed: 'Rápida' },
      { name: 'BYD - Ibarra (50 kW)', lat: 0.3550, lng: -78.1230, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    zoneNames: ['cayambe', 'otavalo', 'cotacachi'],
    corridor: 'norte',
    chargers: [
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
      { name: 'Plaza de Ponchos Otavalo (22 kW)', lat: 0.2337, lng: -78.2625, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    zoneNames: ['san gabriel', 'carchi', 'bolivar carchi', 'tulcan', 'tulcán'],
    corridor: 'norte',
    chargers: [
      { name: 'KIA - Peaje Panavial San Gabriel Carga Ultrarrápida (100 kW)', lat: 0.5980, lng: -77.8340, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD - Supermaxi San Gabriel (50 kW)', lat: 0.5975, lng: -77.8325, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    zoneNames: ['baeza', 'pifo', 'papallacta', 'tena', 'puyo', 'coca', 'lago agrio'],
    corridor: 'oriente',
    chargers: [
      { name: 'Estación Pifo Ruta Viva (22 kW)', lat: -0.2330, lng: -78.3410, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Estación Baeza Panamericana (22 kW)', lat: -0.4610, lng: -77.8890, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Estación Tena Malecón (22 kW)', lat: -0.9938, lng: -77.8129, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    zoneNames: ['machachi', 'mejia', 'aloag', 'alóag'],
    corridor: 'sur',
    chargers: [
      { name: 'Estación Primax Alóag (50 kW)', lat: -0.5098, lng: -78.5675, power: '50 kW', speed: 'Rápida' },
    ],
  },
];

function getAvailableChargersForPoints(
  points: Array<{ name: string; lat: number; lng: number }>,
  vehicleBrand?: string
): CopilotChargerInfo[] {
  const result: CopilotChargerInfo[] = [];
  const seen = new Set<string>();

  for (const pt of points) {
    const pName = normalize(pt.name);
    for (const zone of ECUADOR_CHARGERS_BY_ZONE) {
      const matchesZone = zone.zoneNames.some(z => pName.includes(z) || z.includes(pName));
      if (matchesZone) {
        for (const c of zone.chargers) {
          if (!seen.has(c.name)) {
            if (isChargerBrandCompatible({ name: c.name, operator: c.operator }, vehicleBrand)) {
              result.push({ ...c, isBrandMatch: isBrandMatch(c, vehicleBrand) });
              seen.add(c.name);
            }
          }
        }
      }
    }
  }

  if (result.length === 0) {
    for (const pt of points) {
      const city = ECUADOR_CITIES_CATALOG.find(c => normalize(c.name) === normalize(pt.name));
      const corridor = city?.corridor || 'sur';
      for (const zone of ECUADOR_CHARGERS_BY_ZONE) {
        if (zone.corridor === corridor) {
          for (const c of zone.chargers) {
            if (!seen.has(c.name) && isChargerBrandCompatible({ name: c.name, operator: c.operator }, vehicleBrand)) {
              result.push({ ...c, isBrandMatch: isBrandMatch(c, vehicleBrand) });
              seen.add(c.name);
            }
          }
        }
      }
    }
  }

  return result;
}

interface MapboxDistResult {
  totalKm: number;
  legsKm: number[];
}

// In-memory cache for Mapbox driving distances (key: rounded coords; TTL 1h; bounded size).
const MAPBOX_DIST_CACHE = new Map<string, { data: MapboxDistResult; at: number }>();
const MAPBOX_DIST_TTL_MS = 60 * 60 * 1000;

async function fetchMapboxRouteDistance(routePoints: Array<{ lat: number; lng: number }>): Promise<MapboxDistResult | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken || !routePoints || routePoints.length < 2) return null;
  try {
    const validPoints = routePoints.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && p.lat !== 0 && p.lng !== 0);
    if (validPoints.length < 2) return null;
    const coordsStr = validPoints.map(p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');

    const cached = MAPBOX_DIST_CACHE.get(coordsStr);
    if (cached && Date.now() - cached.at < MAPBOX_DIST_TTL_MS) return cached.data;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?overview=false&access_token=${mapboxToken}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route && typeof route.distance === 'number' && route.distance > 0) {
        const totalKm = Math.round(route.distance / 1000);
        const legsKm = Array.isArray(route.legs)
          ? route.legs.map((l: any) => Math.round(l.distance / 1000))
          : [totalKm];
        const result: MapboxDistResult = { totalKm, legsKm };

        if (MAPBOX_DIST_CACHE.size > 500) {
          const oldest = MAPBOX_DIST_CACHE.keys().next().value;
          if (oldest) MAPBOX_DIST_CACHE.delete(oldest);
        }
        MAPBOX_DIST_CACHE.set(coordsStr, { data: result, at: Date.now() });
        return result;
      }
    }
  } catch (e) {
    console.warn('Error fetching Mapbox route distance:', e);
  }
  return null;
}

async function detectMultiStopItinerary(
  normQuery: string,
  context?: any,
  baseRangeKm: number = 344,
  soc: number = 100,
  vehicle: string = 'tu auto eléctrico',
  vehicleBrand?: string
): Promise<MultiStopDetection | null> {
  const foundCities: Array<{ city: typeof ECUADOR_CITIES_CATALOG[0]; index: number; alias: string; isExact: boolean }> = [];

  for (const city of ECUADOR_CITIES_CATALOG) {
    let matched = false;
    for (const alias of city.aliases) {
      const aNorm = normalize(alias);
      const regex = new RegExp(`(?:^|\\b)${aNorm}(?:\\b|$)`, 'i');
      const match = normQuery.match(regex);
      if (match && match.index !== undefined) {
        const existing = foundCities.find(c => c.city.name === city.name);
        if (!existing) {
          foundCities.push({ city, index: match.index, alias: aNorm, isExact: true });
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Búsqueda difusa por palabras en la consulta
      const tokens = normQuery.split(/[\s,.-]+/);
      for (const token of tokens) {
        if (token.length >= 4 && !['quiero', 'hasta', 'desde', 'para', 'volver', 'regresar', 'carga'].includes(token)) {
          if (isFuzzyWordMatch(city.name, token) || city.aliases.some(a => isFuzzyWordMatch(a, token))) {
            const matchIndex = normQuery.indexOf(token);
            const existing = foundCities.find(c => c.city.name === city.name);
            if (!existing) {
              foundCities.push({ city, index: matchIndex >= 0 ? matchIndex : 0, alias: token, isExact: false });
            }
            break;
          }
        }
      }
    }
  }

  // Filtrar coincidencias solapadas priorizando coincidencias exactas sobre difusas y el alias más específico
  const nonOverlappingCities = foundCities.filter((itemA, i) => {
    const endA = itemA.index + itemA.alias.length;
    return !foundCities.some((itemB, j) => {
      if (i === j) return false;
      const endB = itemB.index + itemB.alias.length;
      const overlaps = Math.max(itemA.index, itemB.index) < Math.min(endA, endB);
      if (overlaps) {
        // Coincidencia exacta SIEMPRE vence a coincidencia difusa
        if (itemA.isExact && !itemB.isExact) return false;
        if (!itemA.isExact && itemB.isExact) return true;
        return itemB.alias.length > itemA.alias.length;
      }
      return false;
    });
  });

  nonOverlappingCities.sort((a, b) => a.index - b.index);
  const foundCitiesFinal = nonOverlappingCities;

  const isReturnRequested =
    normQuery.includes('regresar') ||
    normQuery.includes('volver') ||
    normQuery.includes('retornar') ||
    normQuery.includes('regreso') ||
    normQuery.includes('retorno') ||
    normQuery.includes('de vuelta') ||
    normQuery.includes('y vuelta') ||
    normQuery.includes('redondo');

  const hasSequenceKeywords =
    normQuery.includes('despues') ||
    normQuery.includes('luego') ||
    normQuery.includes('posteriormente') ||
    normQuery.includes('hasta') ||
    normQuery.includes('primero') ||
    normQuery.includes('segundo') ||
    normQuery.includes('parada') ||
    normQuery.includes('paradas') ||
    normQuery.includes('tramo') ||
    normQuery.includes('tramos') ||
    normQuery.includes('escala') ||
    normQuery.includes('desayun') ||
    normQuery.includes('almorz') ||
    normQuery.includes('itinerario');

  // 1. Detectar si el usuario especificó un origen explícito (ej: "desde pelileo", "partiendo de ambato", "saliendo de riobamba", "iniciando en...")
  const originRegex = /(?:desde|partiendo de|saliendo de|arrancando en|iniciando en|salgo de|parto de)\s+([a-záéíóúñ\s]+?)(?:\s+(?:hasta|hacia|al?|para ir a|con destino a|a la|al)|$)/i;
  const originMatch = normQuery.match(originRegex);
  let explicitOriginCity: typeof ECUADOR_CITIES_CATALOG[0] | null = null;
  if (originMatch && originMatch[1]) {
    const rawOrigin = normalize(originMatch[1]);
    explicitOriginCity = ECUADOR_CITIES_CATALOG.find(c =>
      c.aliases.some(a => rawOrigin.includes(normalize(a)) || normalize(a).includes(rawOrigin))
    ) || null;
  }

  // 2. Detectar si el usuario especificó un destino explícito (ej: "hasta el volcan cotopaxio", "hacia banos", "con destino a...")
  const explicitDestRegex = /(?:hasta|hacia|con destino a|para ir a)\s+([a-záéíóúñ\s]+?)(?:\s+(?:ida y vuelta|redondo|de ida|y vuelta|y volver|y regresar|en un|en una)|$)/i;
  const explicitDestMatch = normQuery.match(explicitDestRegex);
  let explicitDestCity: typeof ECUADOR_CITIES_CATALOG[0] | null = null;
  if (explicitDestMatch && explicitDestMatch[1]) {
    const rawDest = normalize(explicitDestMatch[1]);
    explicitDestCity = ECUADOR_CITIES_CATALOG.find(c =>
      c.aliases.some(a => rawDest.includes(normalize(a)) || normalize(a).includes(rawDest))
    ) || null;
  }

  // 3. Detectar si se especificó modelo de auto eléctrico en la consulta (ej. "en un yuan pro")
  const detectedVehicle = detectVehicleFromQuery(normQuery);

  let originLat: number;
  let originLng: number;
  let originName: string;

  if (explicitOriginCity) {
    originLat = explicitOriginCity.lat;
    originLng = explicitOriginCity.lng;
    originName = explicitOriginCity.name;
  } else {
    const currentCoords = context?.currentCoords;
    originLat = currentCoords ? currentCoords[1] : -0.1807;
    originLng = currentCoords ? currentCoords[0] : -78.4678;
    originName = simplifyPlaceName(context?.activeTrip?.originName || 'Quito');
  }

  if (foundCitiesFinal.length < 2 && !(foundCitiesFinal.length === 1 && (isReturnRequested || explicitOriginCity))) {
    return null;
  }

  const distinctCitiesOutsideOrigin = foundCitiesFinal.filter(c => c.city.name !== originName);
  if (distinctCitiesOutsideOrigin.length < 1 && !isReturnRequested) {
    return null;
  }
  if (!explicitOriginCity && distinctCitiesOutsideOrigin.length < 2 && !isReturnRequested) {
    return null;
  }

  // Detectar si alguna ciudad fue mencionada explícitamente como parada intermedia o actividad de paso
  // Ej: "haciendo una parada para desayunar en latacunga", "con parada en latacunga", "pasando por ambato", "quedarme en cayambe desayunando"
  const enRouteRegex = /(?:haciendo (?:una )?parada(?: para \w+)? en|con parada en|parando en|pasando por|pasar por|previamente (?:pasar por|en|por)?|escala en|desayunar en|almorzar en|comer en|visitar en|visitar|quedarme en|quedarnos en|desayunando en)\s+([a-záéíóúñ]+)/i;
  const enRouteReverseRegex = /en\s+([a-záéíóúñ]+)\s+(?:desayun(?:ar|ando)|almorz(?:ar|ando)|com(?:er|iendo)|quedar(?:me|nos))/i;
  const enRouteMatch = normQuery.match(enRouteRegex) || normQuery.match(enRouteReverseRegex);
  let explicitEnRouteCityName: string | null = null;
  if (enRouteMatch && enRouteMatch[1]) {
    const rawEnRoute = normalize(enRouteMatch[1]);
    const matched = ECUADOR_CITIES_CATALOG.find(c => c.aliases.some(a => rawEnRoute.includes(normalize(a))));
    if (matched) explicitEnRouteCityName = matched.name;
  }

  let intermediateStops: typeof ECUADOR_CITIES_CATALOG = [];
  for (const item of foundCitiesFinal) {
    if (item.city.name === originName) {
      continue;
    }
    if (!explicitOriginCity && item.city.name === 'Quito' && isReturnRequested) {
      continue;
    }
    if (!intermediateStops.some(s => s.name === item.city.name)) {
      intermediateStops.push(item.city);
    }
  }

  if (intermediateStops.length === 0) return null;

  // Si se detectó un destino principal explícito ("hasta el volcan cotopaxi"):
  // asegurar que ese destino sea el último punto de ida
  if (explicitDestCity && intermediateStops.some(s => s.name === explicitDestCity!.name)) {
    const destIdx = intermediateStops.findIndex(s => s.name === explicitDestCity!.name);
    if (destIdx >= 0 && destIdx !== intermediateStops.length - 1) {
      const [destStop] = intermediateStops.splice(destIdx, 1);
      intermediateStops.push(destStop);
    }
  } else if (explicitEnRouteCityName && intermediateStops.length >= 2) {
    const enRouteIndex = intermediateStops.findIndex(s => s.name === explicitEnRouteCityName);
    if (enRouteIndex > 0) {
      // Reordenar para que la parada en ruta vaya primero
      const [enRouteStop] = intermediateStops.splice(enRouteIndex, 1);
      intermediateStops.unshift(enRouteStop);
    }
  } else if (!explicitOriginCity && intermediateStops.length >= 2) {
    // Si no hubo origen explícito ni destino explícito, ordenar en orden creciente de distancia desde Quito a la ida
    const s1 = intermediateStops[0];
    const s2 = intermediateStops[1];
    if (s1.corridor === s2.corridor && s1.corridor !== 'local') {
      const d1 = getHighwayDistKm(originName, s1.name, originLat, originLng, s1.lat, s1.lng);
      const d2 = getHighwayDistKm(originName, s2.name, originLat, originLng, s2.lat, s2.lng);
      if (hasSequenceKeywords && d1 > d2) {
        intermediateStops = [s2, s1];
      }
    }
  }

  const routePoints: Array<{ name: string; lat: number; lng: number }> = [
    { name: originName, lat: originLat, lng: originLng },
    ...intermediateStops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
  ];

  if (isReturnRequested) {
    routePoints.push({ name: originName, lat: originLat, lng: originLng });
  }

  const waypoints = intermediateStops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng }));

  const usableBatteryKwh = detectedVehicle
    ? detectedVehicle.batteryKwh
    : Math.max(20, Number(context?.batteryCapacityKwh) || 60);
  const startSocRatio = Math.max(0.05, Math.min(1.0, soc / 100));
  const effectiveRangeKm = detectedVehicle
    ? detectedVehicle.wltpRangeKm
    : Math.max(120, baseRangeKm || (usableBatteryKwh * 5.8));
  const safeReserveKwh = usableBatteryKwh * 0.12; // 12% reserva obligatoria
  const effectiveBrand = detectedVehicle ? detectedVehicle.brand : vehicleBrand;
  const effectiveModel = detectedVehicle ? detectedVehicle.fullName : vehicle;

  // Consultar la ruta Mapbox real con sus tramos exactos de conducción
  const mapboxData = await fetchMapboxRouteDistance(routePoints.map(p => ({ lat: p.lat, lng: p.lng })));

  let curKwh = usableBatteryKwh * startSocRatio;
  let totalKm = 0;
  const legReports: Array<{
    from: string;
    to: string;
    distKm: number;
    kwh: number;
    arrivalSoc: number;
    rechargeNeeded: boolean;
  }> = [];

  const necessaryStops: CopilotChargerInfo[] = [];
  const candidatePool = getAvailableChargersForPoints(routePoints, effectiveBrand);

  for (let i = 0; i < routePoints.length - 1; i++) {
    const fromP = routePoints[i];
    const toP = routePoints[i + 1];
    const dist = (mapboxData?.legsKm && mapboxData.legsKm[i] !== undefined && mapboxData.legsKm[i] > 0)
      ? mapboxData.legsKm[i]
      : getHighwayDistKm(fromP.name, toP.name, fromP.lat, fromP.lng, toP.lat, toP.lng);
    totalKm += dist;

    // Resistencia aerodinámica real a 75-90 km/h en autopista andina
    const realHighwayDrag = 1.35;
    // Ajuste físico de pendiente: las subidas andinas (Sierra, puertos de montaña) consumen ~25% adicional
    const isAndeanElevated = (fromP.lat > -3.0 && fromP.lat < 1.0) || (toP.lat > -3.0 && toP.lat < 1.0);
    const slopeFactor = isAndeanElevated ? 1.25 : 1.0;
    const legKwh = Math.round(dist * (usableBatteryKwh / effectiveRangeKm) * realHighwayDrag * slopeFactor * 10) / 10;

    // Verificar si la batería restante alcanza para completar este tramo con margen seguro
    if (curKwh - legKwh < safeReserveKwh) {
      // Buscar cargadores disponibles que aún no hayan sido elegidos
      const availableNear = candidatePool.filter(c => !necessaryStops.some(s => s.name === c.name));
      const chosenCharger = availableNear.find(c => {
        const normC = normalize(c.name);
        return normC.includes(normalize(fromP.name)) || (c as any).operator?.toLowerCase().includes(effectiveBrand?.toLowerCase() || '');
      }) || availableNear[0];

      if (chosenCharger) {
        // Carga al 85% para garantizar llegada segura al siguiente destino
        const targetKwh = usableBatteryKwh * 0.85;
        const kwhToCharge = Math.max(5, Math.round((targetKwh - curKwh) * 10) / 10);
        const pKwMatch = chosenCharger.power?.match(/(\d+)/);
        const cKw = pKwMatch ? Number(pKwMatch[1]) : (chosenCharger.speed?.toLowerCase().includes('semi') ? 22 : (chosenCharger.speed?.toLowerCase().includes('ultra') ? 100 : 50));
        const estMins = Math.max(12, Math.round((kwhToCharge / Math.min(60, cKw * 0.85)) * 60));

        necessaryStops.push({
          ...chosenCharger,
          isNecessaryStop: true,
          legIndex: necessaryStops.length + 1,
          kwhToCharge,
          estMinutes: estMins,
          posKm: Math.round(Math.max(20, totalKm - (dist * 0.5))),
          isInbound: isReturnRequested && i >= Math.floor((routePoints.length - 1) / 2),
        });

        // La batería se recarga al 85% para acometer el tramo
        curKwh = targetKwh;
      }
    }

    curKwh = Math.max(0, curKwh - legKwh);
    const arrivalSoc = Math.round((curKwh / usableBatteryKwh) * 100);

    legReports.push({
      from: fromP.name,
      to: toP.name,
      distKm: dist,
      kwh: legKwh,
      arrivalSoc,
      rechargeNeeded: necessaryStops.length > 0 && necessaryStops[necessaryStops.length - 1].legIndex === necessaryStops.length,
    });
  }

  // Actualizar totalLegs en cada parada necesaria
  necessaryStops.forEach(s => {
    s.totalLegs = necessaryStops.length;
  });

  const itineraryTitle = routePoints.map(p => p.name).join(' ➔ ');
  let replyText = `🚗 **Ruta trazada:** ${itineraryTitle} (${totalKm} km en total).\n\n`;

  for (let idx = 0; idx < legReports.length; idx++) {
    const leg = legReports[idx];
    const isLastLeg = idx === legReports.length - 1;
    if (!isLastLeg || !isReturnRequested) {
      replyText += `• **${leg.to}:** Llegas con **${leg.arrivalSoc}%** de batería.\n`;
    }
  }

  if (necessaryStops.length > 0) {
    replyText += `\n⚡ **Plan de recarga necesario (${necessaryStops.length} ${necessaryStops.length === 1 ? 'parada' : 'paradas'}):**\n`;
    necessaryStops.forEach((stop, sIdx) => {
      const dirText = stop.isInbound ? 'al regreso' : 'de ida';
      replyText += `• **Parada ${sIdx + 1} (${dirText}):** ${stop.name} (${stop.power || 'Carga disponible'}). Recarga ~${stop.kwhToCharge} kWh (~${stop.estMinutes} min) para continuar con margen seguro.\n`;
    });
    replyText += `\nHe configurado tu ruta y ${necessaryStops.length === 1 ? 'la parada de recarga' : 'las paradas de recarga'} en el mapa.`;
  } else {
    const finalSoc = legReports[legReports.length - 1]?.arrivalSoc ?? 20;
    replyText += `\n✨ Tu vehículo cuenta con autonomía suficiente para completar todo el itinerario sin recargas obligatorias (llegas con ~${finalSoc}% de reserva). Mapa actualizado.`;
  }

  const destSummaryName = intermediateStops.length > 1
    ? `${intermediateStops[intermediateStops.length - 1].name} (Vía ${intermediateStops.slice(0, -1).map(s => s.name).join(', ')})`
    : intermediateStops[0].name;

  return {
    destName: destSummaryName,
    totalKm,
    isRoundTrip: isReturnRequested,
    waypoints,
    chargers: necessaryStops,
    recommendedStop: necessaryStops[0]?.name || '',
    reply: replyText.trim(),
    waypointCharger: necessaryStops[0] ? { name: necessaryStops[0].name, lat: necessaryStops[0].lat, lng: necessaryStops[0].lng } : undefined,
    origin: { name: originName, lat: originLat, lng: originLng },
    vehicleModel: detectedVehicle?.model,
    vehicleBrand: detectedVehicle?.brand,
  };
}

// Resolución ultrarrápida de destino para sincronización previa en mapa (Caso B -> Caso A)
function extractDestinationCandidate(query: string): { candidate: string; isRoundTrip: boolean } {
  const norm = normalize(query);
  const isRoundTrip =
    norm.includes('ida y vuelta') ||
    norm.includes('de ida y vuelta') ||
    norm.includes('y regresar') ||
    norm.includes('y regreso') ||
    norm.includes('y volver') ||
    norm.includes('regresar de') ||
    norm.includes('volver de') ||
    norm.includes('redondo');

  let cleaned = norm
    .replace(/\b(quiero|necesito|deseo|vamos a|voy a|favor|por favor)\b/gi, '')
    .replace(/\b(viajar|viaje|ir|conducir|llegar|dirigirme|trazar|traza|trazame|ruta)\b/gi, '')
    .replace(/\b(de\s+)?ida\s+y\s+vuelta\b/gi, '')
    .replace(/\by\s+regres(ar|o)(\s+de)?\b/gi, '')
    .replace(/\by\s+volver(\s+de)?\b/gi, '')
    .replace(/\bregres(ar|o)\s+de\b/gi, '')
    .replace(/\bvolver\s+de\b/gi, '')
    .replace(/\bredondo\b/gi, '')
    .replace(/\b(hasta|hacia|para|al?|del?|en)\b/gi, '')
    .trim();

  cleaned = cleaned.replace(/^(el|la|los|las)\s+/i, '').trim();
  return { candidate: cleaned, isRoundTrip };
}

// Resolución ultrarrápida de destino para sincronización previa en mapa (Caso B -> Caso A)
async function resolveDestinationFromQuery(
  normQuery: string,
  originCoords?: [number, number],
  context?: any
): Promise<{
  name: string;
  lat: number;
  lng: number;
  distKm: number;
  isRoundTrip: boolean;
  chargers?: any[];
  corridor?: string;
  recommendedStop?: string;
  waypoints?: Array<{ name: string; lat: number; lng: number }>;
  midpointCoords?: { lat: number; lng: number };
  origin?: { name: string; lat: number; lng: number };
  vehicleModel?: string;
  vehicleBrand?: string;
} | null> {
  const originLat = originCoords ? originCoords[1] : -0.1807;
  const originLng = originCoords ? originCoords[0] : -78.4678;

  const baseRangeKm = Number(context?.estimatedRangeKm || context?.wltpRangeKm || 344);
  const soc = Number(context?.currentSoC ?? 100);
  const vehicle = context?.vehicleModel || 'tu auto eléctrico';
  const vehicleBrand = (context?.vehicleBrand || (vehicle !== 'tu auto eléctrico' ? vehicle.split(' ')[0] : '')).trim();

  // 0. Detectar itinerario multiparada con física tramo a tramo
  const multiStop = await detectMultiStopItinerary(normQuery, context, baseRangeKm, soc, vehicle, vehicleBrand);
  if (multiStop) {
    return {
      name: multiStop.destName,
      lat: multiStop.waypoints[multiStop.waypoints.length - 1].lat,
      lng: multiStop.waypoints[multiStop.waypoints.length - 1].lng,
      distKm: multiStop.totalKm,
      isRoundTrip: multiStop.isRoundTrip,
      waypoints: multiStop.waypoints,
      chargers: multiStop.chargers,
      corridor: 'sur',
      recommendedStop: multiStop.recommendedStop,
      origin: multiStop.origin,
      vehicleModel: multiStop.vehicleModel,
      vehicleBrand: multiStop.vehicleBrand,
    };
  }

  const { candidate: cleanCandidate, isRoundTrip } = extractDestinationCandidate(normQuery);

  // 1. Buscar en catálogo ECUADOR_ROUTES (con soporte difuso y alias)
  const foundRoute = findEcuadorRoute(cleanCandidate || normQuery);

  if (foundRoute) {
    let rawRoutePoints = isRoundTrip
      ? [
          { id: 'origin', name: 'Origen', lat: originLat, lng: originLng },
          { id: 'dest', name: foundRoute.name, lat: foundRoute.coords.lat, lng: foundRoute.coords.lng },
          { id: 'return', name: 'Retorno', lat: originLat, lng: originLng }
        ]
      : [
          { id: 'origin', name: 'Origen', lat: originLat, lng: originLng },
          { id: 'dest', name: foundRoute.name, lat: foundRoute.coords.lat, lng: foundRoute.coords.lng }
        ];

    const necessaryChargers = (foundRoute.chargers || []).filter(c => c.isNecessaryStop);
    if (necessaryChargers.length > 0) {
      const stopsToInsert = necessaryChargers.map((ch, i) => ({
        id: `nec_${i}`,
        name: ch.name,
        lat: ch.lat,
        lng: ch.lng,
        posKm: ch.posKm,
        isInbound: ch.isInbound
      }));
      rawRoutePoints = orderRouteWithStops(rawRoutePoints, stopsToInsert, foundRoute.distKm * (isRoundTrip ? 2 : 1));
    }

    const mapboxDist = await fetchMapboxRouteDistance(rawRoutePoints.map(p => ({ lat: p.lat, lng: p.lng })));
    const totalDist = (mapboxDist?.totalKm && mapboxDist.totalKm > 0) ? mapboxDist.totalKm : (isRoundTrip ? foundRoute.distKm * 2 : foundRoute.distKm);
    return {
      name: foundRoute.name,
      lat: foundRoute.coords.lat,
      lng: foundRoute.coords.lng,
      distKm: totalDist,
      isRoundTrip,
      chargers: foundRoute.chargers,
      corridor: foundRoute.corridor,
      recommendedStop: foundRoute.recommendedStop,
    };
  }

  // 1b. Buscar en catálogo enciclopédico de destinos ECUADOR_DESTINATIONS
  const ecGuideDest = findEcuadorDestination(cleanCandidate || normQuery);
  if (ecGuideDest) {
    const mapboxDist = await fetchMapboxRouteDistance(
      isRoundTrip
        ? [{ lat: originLat, lng: originLng }, ecGuideDest.coords, { lat: originLat, lng: originLng }]
        : [{ lat: originLat, lng: originLng }, ecGuideDest.coords]
    );
    const totalDist = (mapboxDist?.totalKm && mapboxDist.totalKm > 0) ? mapboxDist.totalKm : (isRoundTrip ? ecGuideDest.distFromQuitoKm * 2 : ecGuideDest.distFromQuitoKm);
    const routeInfo = findEcuadorRoute(ecGuideDest.name);
    return {
      name: ecGuideDest.name,
      lat: ecGuideDest.coords.lat,
      lng: ecGuideDest.coords.lng,
      distKm: totalDist,
      isRoundTrip,
      chargers: routeInfo?.chargers || [],
      corridor: ecGuideDest.corridor,
      recommendedStop: routeInfo?.recommendedStop || 'Riobamba (Megamaxi Multiplaza)',
    };
  }

  // 2. Si hay candidato no en catálogo, geocodificar dinámicamente con Mapbox
  let extractedDest: string | null = null;
  if (cleanCandidate && cleanCandidate.length >= 3) {
    const stopWords = ['regresar', 'volver', 'carga', 'cargador', 'bateria', 'ecuador', 'donde', 'como', 'cuanto', 'kilometros', 'autonomia'];
    if (!stopWords.some(w => cleanCandidate.includes(w))) {
      extractedDest = cleanCandidate;
    }
  } else if (
    normQuery.split(/\s+/).length <= 5 &&
    !normQuery.includes('bateria') &&
    !normQuery.includes('autonomia') &&
    !normQuery.includes('carga') &&
    !normQuery.includes('hola') &&
    !normQuery.includes('gracias')
  ) {
    extractedDest = normQuery.trim();
  }

  if (extractedDest && normalize(extractedDest) !== 'ecuador') {
    try {
      const dynamicRoute = await calculateDynamicRoute(extractedDest, originCoords);
      if (dynamicRoute && dynamicRoute.distKm > 0) {
        let totalDist = dynamicRoute.distKm;
        if (isRoundTrip) {
          const mapboxRound = await fetchMapboxRouteDistance([
            { lat: originLat, lng: originLng },
            { lat: dynamicRoute.coords.lat, lng: dynamicRoute.coords.lng },
            { lat: originLat, lng: originLng },
          ]);
          totalDist = (mapboxRound?.totalKm && mapboxRound.totalKm > 0) ? mapboxRound.totalKm : dynamicRoute.distKm * 2;
        }
        return {
          name: dynamicRoute.placeName,
          lat: dynamicRoute.coords.lat,
          lng: dynamicRoute.coords.lng,
          distKm: totalDist,
          isRoundTrip,
          corridor: dynamicRoute.corridor,
          midpointCoords: dynamicRoute.midpointCoords,
        };
      }
    } catch (err) {
      console.warn('Error en geocodificación dinámica pre-resolve:', err);
    }
  }

  return null;
}

function resolveBestChargingCandidate({
  chargerArg,
  activeTrip,
  context,
  vehicleBrand,
  prevTrip,
  normQuery,
  replyText,
}: {
  chargerArg?: string;
  activeTrip?: any;
  context?: any;
  vehicleBrand?: string;
  prevTrip?: any;
  normQuery?: string;
  replyText?: string;
}) {
  const normArg = normalize(chargerArg || '');
  const activeSuggested = (context?.activeTrip as any)?.suggestedStops ||
    (activeTrip as any)?.suggestedStops ||
    (context?.activeTrip?.suggestedStop ? [context.activeTrip.suggestedStop] : []) ||
    (activeTrip?.suggestedStop ? [activeTrip.suggestedStop] : []);

  const routeChargers = (context?.routeChargers || []).map((c: any) => ({
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    power: c.power || '50 kW',
    speed: c.speed || 'Rápida',
    operator: c.operator || undefined,
    isNecessaryStop: Boolean(c.isNecessaryStop),

    posKm: c.posKm,
    isInbound: c.isInbound,
  }));

  const corridorChargers = Object.values(CORRIDOR_CHARGERS).flatMap(c => c.list);

  // Filtrar cargadores por compatibilidad de marca (ej. evitar cargador exclusivo BYD si maneja otra marca)
  const filterCompatible = (list: any[]) => list.filter(c => isChargerBrandCompatible({ name: c.name || c.nombre, operator: c.operator }, vehicleBrand));
  const compSuggested = filterCompatible(activeSuggested);
  const compRoute = filterCompatible(routeChargers);
  const compPrev = filterCompatible(prevTrip?.chargers || []);
  const compCorridor = filterCompatible(corridorChargers);

  const pool: any[] = [
    ...compSuggested,
    ...compRoute,
    ...compPrev,
    ...compCorridor,
  ];

  let candidate: any = null;
  const genericTerms = ['si', 'agregala', 'si agregala', 'la parada', 'la estacion', 'agregar', 'ok', 'si ponla', 'agregala a la ruta', 'carga', 'recarga'];
  if (normArg.length > 2 && !genericTerms.includes(normArg)) {
    candidate = pool.find((c: any) => {
      const cNorm = normalize(c.name || c.nombre || '');
      return cNorm.includes(normArg) || normArg.includes(cNorm);
    });
  }

  // Si aún no hay candidato pero el query menciona una ciudad o cargador (ej. Ambato, Mall de los Andes)
  if (!candidate && normQuery) {
    const qNorm = normalize(normQuery);
    candidate = pool.find((c: any) => {
      const cNorm = normalize(c.name || c.nombre || '');
      return qNorm.includes(cNorm) || (c.canton && qNorm.includes(normalize(c.canton))) || (cNorm.includes('mall de los andes') && qNorm.includes('ambato'));
    });
  }

  // Si no hubo coincidencia por nombre, tomar la primera parada calculada necesaria
  if (!candidate) {
    if (compSuggested.length > 0) {
      candidate = compSuggested[0];
    } else {
      candidate = compRoute.find((c: any) => c.isNecessaryStop) ||
        compRoute[0] ||
        compPrev[0] ||
        compCorridor[0];
    }
  }

  if (!candidate) return null;

  const candidateName = candidate.name || candidate.nombre || 'Estación de Carga';
  const normQ = normQuery ? normalize(normQuery) : '';
  const normReply = replyText ? normalize(replyText) : '';
  const isCandidateInbound = candidate.isInbound ?? (
    normQ.includes('regres') ||
    normQ.includes('vuelta') ||
    normReply.includes('regres') ||
    normReply.includes('vuelta') ||
    (Boolean(activeTrip?.isRoundTrip) && (candidate.posKm ? candidate.posKm > (Number(activeTrip.distanceKm) / 2) : true))
  );

  return {
    name: candidateName,
    lat: candidate.lat ?? candidate.location?.lat,
    lng: candidate.lng ?? candidate.location?.lng,
    power: candidate.power || candidate.potencia || '50 kW',
    posKm: candidate.posKm,
    isInbound: isCandidateInbound,
  };
}

// Limitador de tasa (Sliding-window Rate Limiter) en memoria para evitar saturación de consultas
interface CopilotRateLimit {
  count: number;
  resetAt: number;
}
const copilotRateLimits = new Map<string, CopilotRateLimit>();

// Limpieza periódica de claves expiradas cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of copilotRateLimits.entries()) {
      if (now > val.resetAt) copilotRateLimits.delete(key);
    }
  }, 300_000);
}

function checkCopilotRateLimit(clientIp: string, maxRequests = 30, windowMs = 60_000): { allowed: boolean; retryAfterS: number } {
  const now = Date.now();
  const record = copilotRateLimits.get(clientIp);
  if (!record || now > record.resetAt) {
    copilotRateLimits.set(clientIp, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterS: 0 };
  }
  if (record.count >= maxRequests) {
    const retryAfterS = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, retryAfterS };
  }
  record.count += 1;
  return { allowed: true, retryAfterS: 0 };
}

// Control de Cuota Diaria (Máximo 20 consultas diarias por usuario)
interface DailyQuotaRecord {
  count: number;
  dateKey: string;
}
const userDailyQuotaMap = new Map<string, DailyQuotaRecord>();

function getEcuadorDateKey(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
  } catch {
    const d = new Date(Date.now() - 5 * 3600 * 1000);
    return d.toISOString().split('T')[0];
  }
}

function checkUserDailyQuota(identifier: string, maxDaily = 20): { allowed: boolean; remaining: number; used: number; dateKey: string } {
  const dateKey = getEcuadorDateKey();
  const storageKey = `${identifier}:${dateKey}`;
  const record = userDailyQuotaMap.get(storageKey);

  if (!record || record.dateKey !== dateKey) {
    userDailyQuotaMap.set(storageKey, { count: 1, dateKey });
    return { allowed: true, remaining: maxDaily - 1, used: 1, dateKey };
  }

  if (record.count >= maxDaily) {
    return { allowed: false, remaining: 0, used: record.count, dateKey };
  }

  record.count += 1;
  return { allowed: true, remaining: maxDaily - record.count, used: record.count, dateKey };
}

async function handlePOST(request: Request) {
  try {
    // 1. Control de Saturación por Ráfaga: Máximo 30 consultas por minuto por cliente IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     'anonymous-client';
    const rateCheck = checkCopilotRateLimit(clientIp, 30, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        reply: `Has enviado varias consultas seguidas. Por seguridad, por favor espera ${rateCheck.retryAfterS} segundos antes de continuar.`,
        error: 'Too many requests',
      }, {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfterS) },
      });
    }

    const { query, context, history, resolveOnly, originCoords: reqOriginCoords } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const effectiveOriginCoords: [number, number] | undefined =
      reqOriginCoords ||
      context?.currentCoords ||
      (context?.activeTrip?.originLat && context?.activeTrip?.originLng
        ? [context.activeTrip.originLng, context.activeTrip.originLat]
        : undefined);

    if (resolveOnly) {
      const normQuery = normalize(query);
      const dest = await resolveDestinationFromQuery(normQuery, effectiveOriginCoords, context);
      return NextResponse.json({ destination: dest });
    }

    // 2. Control de Límite Diario: Máximo 20 consultas por día por usuario/dispositivo
    const userIdentifier = context?.userId || context?.userEmail || clientIp;
    const dailyQuota = checkUserDailyQuota(userIdentifier, 20);

    if (!dailyQuota.allowed) {
      return NextResponse.json({
        reply: 'Has alcanzado el límite diario de 20 consultas de tu asistente ChargeWay. Tu cuota se renovará automáticamente a la medianoche.',
        error: 'Daily quota exceeded',
        quota: {
          limit: 20,
          remaining: 0,
          used: dailyQuota.used,
          date: dailyQuota.dateKey,
        }
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': dailyQuota.dateKey,
        },
      });
    }

    const queryBrand = extractBrandFromQuery(query);
    const vehicle = queryBrand ? `auto marca ${queryBrand}` : (context?.vehicleModel || 'tu auto eléctrico');
    const vehicleBrand = (queryBrand || context?.vehicleBrand || (vehicle !== 'tu auto eléctrico' ? vehicle.split(' ')[0] : '')).trim();
    const battery = Number(context?.batteryCapacityKwh || 38.8);
    const soc = Number(context?.currentSoC ?? 68);
    const availableKwh = battery * (soc / 100);

    // Autonomía estimada exacta
    const baseRangeKm = Number(
      context?.estimatedRangeKm ||
      (context?.wltpRangeKm ? Math.round(context.wltpRangeKm * (soc / 100)) : Math.round(availableKwh / 0.16))
    );

    const activeTrip = context?.activeTrip;
    const normQuery = normalize(query);
    const historyList: MessageHistoryItem[] = Array.isArray(history) ? history : [];
    const prevTrip = extractConversationState(historyList, activeTrip, context);

    // =========================================================================
    // AGENTE INTELIGENTE GEMINI AI (ORQUESTADOR PRINCIPAL CON FUNCTION CALLING)
    // =========================================================================
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const tools = [
          {
            functionDeclarations: [
              {
                name: 'plan_trip',
                description: 'Calcula y traza una NUEVA ruta hacia un destino final en Ecuador en el mapa interactivo. Úsalo cuando el conductor pida ir a una ciudad o lugar, armar una ruta, o pregunte si le alcanza la batería para llegar o para viaje de ida y vuelta. NO lo uses si el usuario pide agregar o añadir una parada intermedia a una ruta ya activa.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    origin: { type: 'STRING', description: 'Ciudad o punto de partida explícito si el conductor lo menciona (ej. Pelileo, Ambato, Quito)' },
                    destination: { type: 'STRING', description: 'Nombre de la ciudad, pueblo o atractivo en Ecuador (ej. Volcán Cotopaxi, Baños, Ibarra, Riobamba, Manta, Cuenca)' },
                    isRoundTrip: { type: 'BOOLEAN', description: 'Indica si el conductor solicita viaje de ida y vuelta o ida y retorno' },
                    vehicleModel: { type: 'STRING', description: 'Modelo o nombre del vehículo eléctrico si el conductor lo menciona (ej. Yuan Pro, Dolphin, EV6)' },
                    waypoints: {
                      type: 'ARRAY',
                      items: { type: 'STRING' },
                      description: 'Paradas intermedias opcionales (ej. Latacunga, Ambato)',
                    },
                  },
                  required: ['destination'],
                },
              },
              {
                name: 'search_chargers',
                description: 'Consulta y busca en la base de datos oficial de estaciones de recarga en Ecuador. Permite consultar por ciudad, sector, provincia o a nivel nacional, y filtrar por tipo de conector (gbt, ccs2, tipo2), potencia (carga rápida DC >= 40-50 kW) o acceso multimarca.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    location: { type: 'STRING', description: 'Ciudad, cantón, provincia, sector o "nacional"/"Ecuador" si la consulta abarca todo el país.' },
                    connectorType: { type: 'STRING', enum: ['gbt', 'ccs2', 'tipo2', 'chademo', 'todos'], description: 'Tipo de conector solicitado: gbt (estándar chino/BYD), ccs2 (estándar europeo DC), tipo2 (AC Mennekes/Wallbox), chademo o todos.' },
                    fastOnly: { type: 'BOOLEAN', description: 'True si el conductor solicita específicamente estaciones de carga rápida DC (>= 40-50 kW).' },
                    multibrandOnly: { type: 'BOOLEAN', description: 'True si el conductor solicita cargador multimarca universal abierto a todas las marcas (excluyendo concesionarios exclusivos de marcas como BYD, Kia, etc.).' },
                    query: { type: 'STRING', description: 'Término de búsqueda opcional por nombre de estación, operador o centro comercial (ej. BYD, Condor Charge, Mall del Sol).' },
                  },
                },
              },
              {
                name: 'add_charging_stop',
                description: 'Añade una estación de recarga o ciudad de paso como parada intermedia en la ruta de navegación activa. Úsalo cuando el conductor pida agregar, añadir, incluir o poner una parada (ej. "agrega la parada en Ambato", "añade Mall de los Andes a mi ruta", "pon una parada de carga").',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    chargerName: { type: 'STRING', description: 'Nombre de la estación, sector o ciudad a añadir como parada intermedia en la ruta' },
                  },
                  required: ['chargerName'],
                },
              },
              {
                name: 'search_places_amenities',
                description: 'Busca recomendaciones de comida, cafeterías o turismo cercano a una estación o destino para aprovechar mientras el auto recarga.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    category: { type: 'STRING', enum: ['restaurant', 'cafe', 'attraction'], description: 'Tipo de lugar a recomendar' },
                    location: { type: 'STRING', description: 'Lugar o ciudad' },
                  },
                  required: ['category'],
                },
              },
            ],
          },
        ];

        const activePlannedStops = activeTrip?.suggestedStops || (activeTrip?.suggestedStop ? [activeTrip.suggestedStop] : (prevTrip?.suggestedStop ? [prevTrip.suggestedStop] : []));
        const plannedStopsPrompt = activePlannedStops.length > 0 ? `
PARADAS DE RECARGA PLANIFICADAS EN LA RUTA:
${activePlannedStops.map((s: any, idx: number) => `- Parada ${idx + 1}: ${s.name || s.nombre} (${s.power || '50 kW'}) en ${s.canton || 'la ruta'}.
  * Tiempo de recarga estimado: ${s.estMinutes || 25} minutos
  * Energía requerida a cargar: ~${s.kwhToCharge || 20} kWh
  * Coordenadas: lat ${s.lat}, lng ${s.lng}
  * Sentido: ${s.isInbound ? 'al regreso / retorno' : 'de ida'}`).join('\n')}
` : '';

        const systemInstructionText = `Eres el Copiloto Inteligente de ChargeWay, el asistente de voz y navegación para conductores de vehículos eléctricos en Ecuador. Eres un verdadero agente experto en movilidad eléctrica, topografía andina y la red nacional de recarga.

CONOCIMIENTO EXPERTO DE LA RED DE CARGA Y CONECTORES EN ECUADOR:
1. Conectores en Ecuador:
   - GB/T (Guobiao): Estándar nacional chino (DC y AC). Utilizado ampliamente por BYD (Yuan Pro, Dolphin, Tang, Han, Song Plus), JAC, Dongfeng, Leapmotor y marcas chinas. Existen cerca de 100 puntos en el país (red oficial BYD y estaciones multiconector en Pichincha, Guayas, Manabí, Azuay, Imbabura, etc.).
   - CCS2 (Combo 2): Estándar europeo de carga rápida DC (Kia, Hyundai, Porsche, BMW, Mercedes, Tesla con adaptador, Audi). Redes: Condor Charge, centros comerciales y estaciones públicas.
   - Tipo 2 (Mennekes / Wallbox): Corriente alterna AC de 7.4 kW a 22 kW ampliamente disponible en centros comerciales, hoteles, restaurantes y domicilios.
   - CHAdeMO: Disponible en algunos puntos para Nissan Leaf o autos japoneses de importación.
2. Topografía y Física Energética Andina:
   - En ascensos andinos (Papallacta a 4,000 msnm, El Chasqui / Cotopaxi a 3,600 msnm), el consumo se eleva notablemente.
   - En descensos hacia la Costa o Amazonía, la regeneración gravitatoria recupera energía útil para la batería.
3. Consultas de Información vs. Órdenes de Navegación:
   - Si el usuario formula preguntas informativas (ej: "¿cuáles son los puntos de carga...", "¿dónde puedo cargar...", "¿cuántos cargadores hay en...", "¿qué estaciones tienen conector GB/T?"), invoca OBLIGATORIAMENTE la herramienta 'search_chargers' para consultar la base de datos real y responder con datos precisos.
   - NUNCA agregues paradas a la ruta ni invoques 'add_charging_stop' cuando el usuario solo hace una pregunta informativa. Solo invoca 'add_charging_stop' si el conductor dice explícitamente "agrega la parada", "añade esta estación a mi ruta" o "pon esta parada".
4. Estilo de Comunicación:
   - Sintetiza la información devuelta por la base de datos de manera clara, autoritativa, conversacional y experta, ideal para escuchar o leer en cabina.

TELEMETRÍA REAL DEL VEHÍCULO ACTUAL:
- Vehículo: ${vehicle} (${battery} kWh de batería)
- Marca del vehículo: ${vehicleBrand || 'Genérica'}
- Estado de carga actual (SoC): ${soc}% (~${availableKwh.toFixed(1)} kWh disponibles)
- Autonomía disponible estimada: ${baseRangeKm} km (WLTP: ${context?.wltpRangeKm || 305} km)
- Temperatura exterior: ${context?.ambientTempC ?? 17}°C
- Origen de viaje: Quito, Ecuador
${activeTrip ? `- Viaje activo en mapa: De ${activeTrip.originName} a ${activeTrip.destinationName} (${activeTrip.distanceKm} km, consumo estimado ${activeTrip.consumptionKwh} kWh, llegada con ${activeTrip.arrivalSoc}% / ${activeTrip.arrivalRangeKm} km de margen). ${activeTrip.isRoundTrip ? 'Es viaje de ida y vuelta.' : ''}` : '- No hay ruta activa en el mapa actualmente.'}
${plannedStopsPrompt}
`;

        // Limpiar y estructurar historial asegurando alternancia estricta user <-> model
        // y eliminando duplicados de la consulta actual al final
        const cleanHistory: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
        for (const h of historyList.slice(-8)) {
          if (!h.content || !h.content.trim()) continue;
          const role: 'user' | 'model' = h.role === 'assistant' ? 'model' : 'user';
          if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === role) {
            cleanHistory[cleanHistory.length - 1] = { role, parts: [{ text: h.content.trim() }] };
          } else {
            cleanHistory.push({ role, parts: [{ text: h.content.trim() }] });
          }
        }

        // Si el último mensaje es del usuario (ej. si el frontend ya envió la consulta actual en history),
        // quitarlo para que la consulta actual 'query' sea el único turno final de usuario
        if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
          cleanHistory.pop();
        }

        const messages = [
          ...cleanHistory,
          { role: 'user', parts: [{ text: query }] },
        ];

        const targetModels = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];
        let candidateContent: any = null;
        let candidatePart: any = null;
        let usedModel = 'gemini-3.8-flash';

        for (const modelName of targetModels) {
          try {
            const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: messages,
                tools,
                systemInstruction: { parts: [{ text: systemInstructionText }] },
              }),
              signal: AbortSignal.timeout(4500),
            });

            if (apiRes.ok) {
              const resData = await apiRes.json();
              const content = resData.candidates?.[0]?.content;
              const part = content?.parts?.[0];
              if (part) {
                candidateContent = content;
                candidatePart = part;
                usedModel = modelName;
                break;
              }
            } else if (apiRes.status === 400 || apiRes.status === 403) {
              // Si la llave o parámetros son inválidos, cortar de inmediato al fallback sin retrasar al usuario
              break;
            } else {
              continue;
            }
          } catch (_) {
            continue;
          }
        }

        if (candidatePart) {
          // Si el modelo respondió directamente con texto (preguntas conceptuales, clima, consejos, etc.)
          if (!candidatePart.functionCall && candidatePart.text) {
            return NextResponse.json({
              reply: candidatePart.text.trim(),
              provider: usedModel,
            });
          }

          // Si el modelo invocó una herramienta (Tool Calling)
          if (candidatePart.functionCall) {
            const call = candidatePart.functionCall;
            let toolResponseData: any = {};
            let returnDestination: any = undefined;
            let returnChargers: any = undefined;
            let returnAction: string | undefined = undefined;
            let returnWaypoint: any = undefined;
            let returnPlaces: any = undefined;

            if (call.name === 'plan_trip') {
              const destArg = call.args?.destination || query;
              const isRoundArg = Boolean(call.args?.isRoundTrip || normQuery.includes('ida y vuelta') || normQuery.includes('regres'));

              // Resolver UNA sola vez: la consulta completa si parece multi-parada (Gemini suele reducirla a un destino),
              // si no, el destino extraído por Gemini. Solo se intenta la otra variante si la primera no resuelve.
              const isMultiStopQuery = normQuery.includes('pasar') || normQuery.includes('previamente') || normQuery.includes('despues') || normQuery.includes('luego') || normQuery.includes('parada') || normQuery.includes('desde') || normQuery.split(/\s+/).length > 6;
              const primaryQuery = isMultiStopQuery ? normQuery : destArg;
              const secondaryQuery = isMultiStopQuery ? destArg : normQuery;
              const resolved = await resolveDestinationFromQuery(primaryQuery, effectiveOriginCoords, context)
                || (secondaryQuery !== primaryQuery ? await resolveDestinationFromQuery(secondaryQuery, effectiveOriginCoords, context) : null);

              if (resolved) {
                const matchesActiveTrip = activeTrip && Number(activeTrip.distanceKm) > 0 && (
                  normQuery.includes(normalize(activeTrip.destinationName || '')) ||
                  normalize(resolved.name).includes(normalize(activeTrip.destinationName || '')) ||
                  normalize(activeTrip.destinationName || '').includes(normalize(resolved.name)) ||
                  (isRoundArg && Boolean(activeTrip.isRoundTrip)) ||
                  (activeTrip.waypoints && activeTrip.waypoints.some((w: any) => normQuery.includes(normalize(w.name || '')))) ||
                  normQuery.includes('ruta') || normQuery.includes('viaje') || normQuery.includes('llegar') || normQuery.includes('bateria') || normQuery.includes('autonomia')
                );

                const totalKm = (matchesActiveTrip && Number(activeTrip.distanceKm) > 0)
                  ? Math.round(Number(activeTrip.distanceKm))
                  : ((isRoundArg && !resolved.isRoundTrip) ? resolved.distKm * 2 : resolved.distKm);

                const effectiveBaseRange = Math.max(120, Number(context?.estimatedRangeKm || context?.wltpRangeKm || 344));
                const kwhRequired = (matchesActiveTrip && activeTrip?.consumptionKwh !== undefined && Number(activeTrip.consumptionKwh) > 0)
                  ? Math.round(Number(activeTrip.consumptionKwh) * 10) / 10
                  : Math.round((totalKm * (battery / effectiveBaseRange) * 1.05) * 10) / 10;

                const rawArrivalSoc = (matchesActiveTrip && activeTrip?.arrivalSoc !== undefined) ? activeTrip.arrivalSoc : undefined;
                const arrivalSoc = (rawArrivalSoc !== undefined && !isNaN(Number(rawArrivalSoc)))
                  ? (Math.abs(Number(rawArrivalSoc)) <= 1.0 ? Math.round(Number(rawArrivalSoc) * 100) : Math.round(Number(rawArrivalSoc)))
                  : Math.round(soc - (kwhRequired / battery) * 100);

                const canReach = arrivalSoc >= 15;

                // 1. Obtener cargadores del contexto de ruta viva (calculados por simulación física) o de Supabase
                let combinedChargers: CopilotChargerInfo[] = [];

                if (context?.routeChargers && context.routeChargers.length > 0) {
                  combinedChargers = context.routeChargers.map((c: any) => ({
                    name: c.name,
                    lat: c.lat,
                    lng: c.lng,
                    power: c.power || '50 kW',
                    speed: c.speed || 'Rápida',
                    operator: c.operator || undefined,
                    isBrandMatch: isBrandMatch({ name: c.name, operator: c.operator }, vehicleBrand),

                    isNecessaryStop: Boolean(c.isNecessaryStop),
                  }));
                } else {
                  // Si no hay contexto de ruta viva y la batería no alcanza directo,
                  // buscamos estaciones en el punto intermedio de la carretera antes de agotarse
                  let searchCoords = { lat: resolved.lat, lng: resolved.lng };
                  let isHighwayMidpoint = false;

                  if (!canReach) {
                    if ((resolved as any).midpointCoords) {
                      // Punto medio real dinámico calculado a lo largo de la carretera Mapbox
                      searchCoords = (resolved as any).midpointCoords;
                      isHighwayMidpoint = true;
                    } else {
                      const normDest = normalize(resolved.name);
                      if (resolved.lng < -78.8 || normDest.includes('same') || normDest.includes('mompiche') || normDest.includes('atacames') || normDest.includes('esmeraldas') || normDest.includes('pedernales') || normDest.includes('manta') || normDest.includes('guayaquil') || normDest.includes('quevedo')) {
                        searchCoords = { lat: -0.2528, lng: -79.1724 }; // Santo Domingo de los Tsáchilas
                        isHighwayMidpoint = true;
                      } else if (normDest.includes('macas') || normDest.includes('morona') || resolved.lat < -1.8 || normDest.includes('cuenca') || normDest.includes('loja')) {
                        // Hacia Macas (Morona Santiago) o el Sur profundo, la parada de recarga estratégica es Riobamba (Km 183, Megamaxi Multiplaza / Paseo Shopping)
                        searchCoords = { lat: -1.6636, lng: -78.6546 }; // Riobamba
                        isHighwayMidpoint = true;
                      } else if (resolved.lat < -0.8 || normDest.includes('riobamba') || normDest.includes('ambato') || normDest.includes('banos')) {
                        searchCoords = { lat: -1.2491, lng: -78.6168 }; // Ambato / Sierra Centro
                        isHighwayMidpoint = true;
                      } else if (normDest.includes('tulcan') || normDest.includes('carchi') || normDest.includes('san gabriel') || normDest.includes('bolivar')) {
                        searchCoords = { lat: 0.3517, lng: -78.1223 }; // Ibarra centro
                        isHighwayMidpoint = true;
                      } else if (resolved.lng > -78.1 || normDest.includes('tena') || normDest.includes('puyo') || normDest.includes('coca')) {
                        searchCoords = { lat: -0.46, lng: -77.89 }; // Baeza / Napo
                        isHighwayMidpoint = true;
                      }
                    }
                  }

                  const supabaseChargers = await getRouteChargersFromSupabase(resolved.corridor || 'sur', searchCoords);
                  const brandPrioritized = prioritizeChargersByBrand(
                    supabaseChargers.length > 0 ? supabaseChargers.map(c => ({
                      name: c.name,
                      lat: c.location.lat,
                      lng: c.location.lng,
                      power: c.power,
                      speed: c.speed,
                      operator: c.operator,
                      isNecessaryStop: isHighwayMidpoint,
                    })) : (resolved.chargers || []),
                    vehicleBrand
                  );
                  combinedChargers = brandPrioritized.list;
                  if (isHighwayMidpoint && combinedChargers.length > 0) {
                    combinedChargers[0].isNecessaryStop = true;
                  }
                }

                // 2. Comprobar si existen paradas necesarias calculadas físicamente (ej. multi-paradas para 1090 km)
                const rawNecStops = (activeTrip as any)?.suggestedStops || (context?.activeTrip as any)?.suggestedStops || (activeTrip?.suggestedStop ? [activeTrip.suggestedStop] : context?.activeTrip?.suggestedStop ? [context.activeTrip.suggestedStop] : []);
                const necessaryStopName = activeTrip?.recommendedChargerName || context?.activeTrip?.recommendedChargerName || resolved.recommendedStop;

                if (rawNecStops.length > 0) {
                  const brandCompatibleNecStops = rawNecStops.filter((s: any) =>
                    isChargerBrandCompatible({ name: s.name, operator: s.operator }, vehicleBrand)
                  );
                  const necessaryItems: CopilotChargerInfo[] = (brandCompatibleNecStops.length > 0 ? brandCompatibleNecStops : rawNecStops).map((s: any, idx: number) => ({
                    name: s.name,
                    lat: s.lat,
                    lng: s.lng,
                    power: s.power || '50 kW',
                    speed: 'Rápida',
                    operator: s.operator || undefined,
                    isBrandMatch: isBrandMatch({ name: s.name }, vehicleBrand),

                    isNecessaryStop: true,
                    legIndex: s.legIndex ?? (idx + 1),
                    totalLegs: s.totalLegs ?? rawNecStops.length,
                    kwhToCharge: s.kwhToCharge,
                    estMinutes: s.estMinutes,
                    posKm: s.posKm,
                    isInbound: s.isInbound !== undefined ? s.isInbound : (isRoundArg ? (s.posKm ? s.posKm > (totalKm * 0.5) : idx > 0) : false),
                  }));

                  // El copiloto manos libres presenta ÚNICAMENTE las paradas necesarias calculadas.
                  // El resto de cargadores en ruta se consultan en 'Cargadores en Tramo del Vehículo'.
                  combinedChargers = necessaryItems;
                } else if (!canReach) {
                  // Si aún no hay paradas físicas calculadas en el mapa (ej. ruta nueva recién consultada):
                  // Usamos los cargadores estratégicos disponibles respetando la compatibilidad de marca
                  const rawCandidates: CopilotChargerInfo[] = (resolved.chargers && resolved.chargers.length > 0)
                    ? resolved.chargers
                    : combinedChargers;
                  const candidateChargers: CopilotChargerInfo[] = prioritizeChargersByBrand(rawCandidates, vehicleBrand).list;

                  if (candidateChargers.length > 0) {
                    // CÁLCULO FÍSICO PURO BASADO EN EL DÉFICIT REAL DE ENERGÍA Y CAPACIDAD DEL VEHÍCULO
                    const usableBatteryKwh = Math.max(20, battery);
                    const currentKwhAtStart = usableBatteryKwh * (soc / 100);
                    const safeReserveKwh = usableBatteryKwh * 0.12; // 12% reserva obligatoria de seguridad
                    const availableKwh = Math.max(0, currentKwhAtStart - safeReserveKwh);
                    const kwhDeficit = Math.max(0, kwhRequired - availableKwh);

                    // Si no hay déficit físico real (batería grande o trayecto dentro de rango), 0 paradas necesarias
                    let stopsNeeded = 0;
                    if (kwhDeficit > 0) {
                      // Cada recarga útil típica en ruta (al 80-85%) aporta ~60%-65% de la capacidad de la batería
                      const kwhGainPerStop = Math.max(12, usableBatteryKwh * 0.65);
                      stopsNeeded = Math.min(candidateChargers.length, Math.max(1, Math.ceil(kwhDeficit / kwhGainPerStop)));
                    }

                    // Evaluación física del tramo de ida
                    const oneWayKm = isRoundArg ? Math.round(totalKm / 2) : totalKm;
                    const estOutboundKwh = Math.round((oneWayKm * (battery / effectiveBaseRange) * 1.15) * 10) / 10;
                    const canReachOutboundDirectly = availableKwh >= estOutboundKwh;

                    // Si la ida se completa directamente con la carga inicial, el tramo de ida NO requiere paradas
                    let chosen: Array<CopilotChargerInfo & { isOutbound?: boolean; isInbound?: boolean }> = [];

                    if (kwhDeficit > 0) {
                      const oLat = effectiveOriginCoords ? effectiveOriginCoords[1] : -0.1807;
                      const oLng = effectiveOriginCoords ? effectiveOriginCoords[0] : -78.4678;
                      // Filtrar cargadores urbanos adyacentes al punto de partida (< 35 km) que no aportan avance real
                      const highwayCandidates = candidateChargers.filter(c => {
                        const distFromOrigin = Math.hypot((c.lat - oLat) * 111, (c.lng - oLng) * 111);
                        return distFromOrigin >= 35 || candidateChargers.length <= 1;
                      });

                      const availablePool = highwayCandidates.length > 0 ? highwayCandidates : candidateChargers;

                      if (isRoundArg && canReachOutboundDirectly) {
                        // La ida es directa sin paradas. El déficit es exclusivamente en el tramo de retorno (subida/distancia)
                        if (availablePool.length > 0 && availablePool[0]) {
                          chosen = [{ ...availablePool[0], isInbound: true }];
                        } else {
                          // Si no hay electrolinera en la carretera, la parada física obligatoria es en destino
                          chosen = [{
                            name: `Recarga en destino (${resolved.name})`,
                            lat: resolved.lat,
                            lng: resolved.lng,
                            power: '22 kW AC / 220V',
                            speed: 'Semirrápida',
                            isInbound: true,
                          }];
                        }
                      } else if (isRoundArg && !canReachOutboundDirectly && availablePool.length >= 2) {
                        chosen = [
                          { ...availablePool[0], isInbound: false },
                          { ...availablePool[1], isInbound: true },
                        ];
                      } else if (availablePool.length > 0) {
                        chosen = [availablePool[0]];
                      }

                      combinedChargers = chosen.map((c, idx) => {
                        const pKwMatch = c.power?.match(/(\d+)/);
                        const cKw = pKwMatch ? Number(pKwMatch[1]) : (c.speed?.toLowerCase().includes('semi') ? 22 : (c.speed?.toLowerCase().includes('ultra') ? 100 : 50));
                        const kwhToCharge = Math.max(6, Math.round((kwhDeficit / chosen.length) * 10) / 10);
                        const estMinutes = Math.max(12, Math.round((kwhToCharge / Math.min(60, cKw * 0.85)) * 60));

                        const assignedIsInbound = c.isInbound !== undefined
                          ? c.isInbound
                          : (isRoundArg ? (idx >= Math.ceil(chosen.length / 2)) : false);

                        const assignedPosKm = isRoundArg
                          ? (chosen.length === 1
                              ? Math.round(totalKm * 0.5)
                              : (idx === 0 ? Math.round(totalKm * 0.24) : (idx === 1 ? Math.round(totalKm * 0.76) : Math.round((totalKm / (chosen.length + 1)) * (idx + 1)))))
                          : Math.round((totalKm / (chosen.length + 1)) * (idx + 1));

                        return {
                          ...c,
                          isNecessaryStop: true,
                          legIndex: idx + 1,
                          totalLegs: chosen.length,
                          kwhToCharge,
                          estMinutes,
                          isInbound: assignedIsInbound,
                          posKm: assignedPosKm,
                        };
                      });
                    } else {
                      combinedChargers = [];
                    }
                  } else if (necessaryStopName) {
                    const existingMatch = combinedChargers.find(c => c.name.toLowerCase().includes(necessaryStopName.toLowerCase()) || necessaryStopName.toLowerCase().includes(c.name.toLowerCase()));
                    if (existingMatch) {
                      existingMatch.isNecessaryStop = true;
                      combinedChargers = [existingMatch];
                    } else {
                      combinedChargers = [];
                    }
                  } else {
                    combinedChargers = [];
                  }
                } else {
                  // Si llega con batería sin requerir recarga obligatoria, no presenta paradas
                  combinedChargers = [];
                }

                returnDestination = {
                  name: resolved.name,
                  lat: resolved.lat,
                  lng: resolved.lng,
                  distKm: totalKm,
                  isRoundTrip: isRoundArg,
                  origin: (resolved as any).origin,
                  vehicleModel: (resolved as any).vehicleModel || call.args?.vehicleModel,
                  vehicleBrand: (resolved as any).vehicleBrand,
                  waypoints: resolved.waypoints,
                };
                returnChargers = combinedChargers;

                const primaryStopName = rawNecStops[0]?.name || combinedChargers[0]?.name || necessaryStopName || 'Riobamba';

                toolResponseData = {
                  destination: resolved.name,
                  distanceKm: totalKm,
                  isRoundTrip: isRoundArg,
                  estimatedArrivalSoc: arrivalSoc,
                  canReachWithoutRecharge: canReach,
                  recommendedStop: primaryStopName,
                  recommendedCity: resolved.name.toLowerCase().includes('macas') ? 'Riobamba' : undefined,
                  necessaryStopsCount: rawNecStops.length > 0 ? rawNecStops.length : combinedChargers.length,
                  necessaryStops: rawNecStops.length > 0
                    ? rawNecStops.map((s: any, idx: number) => ({
                        step: idx + 1,
                        name: s.name,
                        city: s.canton || '',
                        kwhToCharge: s.kwhToCharge,
                        estMinutes: s.estMinutes,
                        targetSocPct: s.targetSocPct,
                        arrivalSocPct: s.arrivalSocPct,
                      }))
                    : combinedChargers.map((c, idx) => ({
                        step: idx + 1,
                        name: c.name,
                        city: c.name.includes('Riobamba') ? 'Riobamba' : '',
                        power: c.power,
                      })),
                  recommendedStopsSummary: rawNecStops.length > 1
                    ? `Para completar este viaje de ${totalKm} km requieres ${rawNecStops.length} paradas obligatorias de recarga: ${rawNecStops.map((s: any, i: number) => `${i + 1}. ${s.name}${s.canton ? ` en ${s.canton}` : ''}`).join(', ')}.`
                    : (combinedChargers.length > 1
                        ? (isRoundArg && combinedChargers.length === 2
                            ? `recargar en ${combinedChargers[0].name} a la ida y en ${combinedChargers[1].name} al regreso`
                            : `recargar en ${combinedChargers.map((c, i) => `${i + 1}. ${c.name}`).join(' y ')}`)
                        : primaryStopName),
                  availableChargersCount: combinedChargers.length,
                };
              } else {
                toolResponseData = { error: `No se encontraron coordenadas para ${destArg} en Ecuador` };
              }
            } else if (call.name === 'search_chargers') {
              const locArg = (call.args?.location || '').trim();
              const connArg = normalize(call.args?.connectorType || '');
              const normLoc = normalize(locArg);
              const isNational = !locArg || ['nacional', 'ecuador', 'pais', 'todo el pais', 'todo', 'nacion'].includes(normLoc) || /en el pais|en ecuador|a nivel nacional|en todo ecuador/i.test(normQuery);

              const isFastRequested = Boolean(
                call.args?.fastOnly ||
                /r[aá]pid[oa]|dc|alta potencia|fast|50\s*kw|90\s*kw/i.test(normQuery) ||
                /r[aá]pid[oa]|dc|alta potencia|fast|50\s*kw|90\s*kw/i.test(query)
              );

              const isMultibrandRequested = Boolean(
                call.args?.multibrandOnly ||
                /multi\s*marca|universal|todas las marcas|cualquier marca|public/i.test(normQuery) ||
                /multi\s*marca|universal|todas las marcas|cualquier marca|public/i.test(query)
              );

              // 1. Consultar la base de datos oficial completa de 332 puntos de recarga
              const allChargers = await fetchAllEcuadorChargers();

              let filtered = allChargers;

              // 2. Filtrado preciso por tipo de conector
              const isGbtQuery = connArg.includes('gbt') || connArg.includes('gb/t') || /gbt|gb\/t|gb-t/i.test(normQuery);
              const isCcsQuery = connArg.includes('ccs') || connArg.includes('cs2') || /ccs2|combo/i.test(normQuery);
              const isTipo2Query = connArg.includes('tipo2') || connArg.includes('tipo 2') || /tipo 2|mennekes|wallbox/i.test(normQuery);
              const isChademoQuery = connArg.includes('chademo') || /chademo/i.test(normQuery);

              if (isGbtQuery) {
                filtered = filtered.filter(c => {
                  const s = ((c.tipo_cargador || '') + ' ' + (c.nombre || '')).toLowerCase();
                  return s.includes('gbt') || s.includes('gb/t') || s.includes('gb-t') || s.includes('byd');
                });
              } else if (isCcsQuery) {
                filtered = filtered.filter(c => {
                  const s = ((c.tipo_cargador || '') + ' ' + (c.nombre || '')).toLowerCase();
                  return s.includes('ccs2') || s.includes('cs2') || s.includes('combo');
                });
              } else if (isTipo2Query) {
                filtered = filtered.filter(c => {
                  const s = ((c.tipo_cargador || '') + ' ' + (c.nombre || '')).toLowerCase();
                  return s.includes('tipo 2') || s.includes('mennekes') || s.includes('wallbox');
                });
              } else if (isChademoQuery) {
                filtered = filtered.filter(c => {
                  const s = ((c.tipo_cargador || '') + ' ' + (c.nombre || '')).toLowerCase();
                  return s.includes('chademo');
                });
              }

              // 3. Filtrado multimarca vs exclusividad de marca
              if (isMultibrandRequested) {
                filtered = filtered.filter(c => isChargerMultibrand(c));
              } else if (vehicleBrand && !isGbtQuery) {
                filtered = filtered.filter(c => isChargerBrandCompatible(c, vehicleBrand));
              }

              // 4. Filtrado de carga rápida
              if (isFastRequested) {
                const fastList = filtered.filter(c => {
                  const p = (c.potencia || '').match(/(\d+)/);
                  const kw = p ? parseInt(p[1], 10) : 0;
                  const s = normalize(c.velocidad || '');
                  return kw >= 40 || s.includes('rap');
                });
                if (fastList.length > 0) {
                  filtered = fastList;
                }
              }

              // 5. Filtrado por ubicación si la consulta es local a una ciudad o sector
              if (!isNational && locArg) {
                const localMatch = filtered.filter(c => {
                  const p = normalize(c.provincia || '');
                  const ct = normalize(c.canton || '');
                  const n = normalize(c.nombre || '');
                  return p.includes(normLoc) || ct.includes(normLoc) || n.includes(normLoc);
                });
                if (localMatch.length > 0) {
                  filtered = localMatch;
                }
              }

              // Desglose por provincias
              const provCounts: Record<string, number> = {};
              for (const c of filtered) {
                const prov = c.provincia || 'Otras';
                provCounts[prov] = (provCounts[prov] || 0) + 1;
              }

              const fastCount = filtered.filter(c => {
                const p = (c.potencia || '').match(/(\d+)/);
                const kw = p ? parseInt(p[1], 10) : 0;
                return kw >= 40 || normalize(c.velocidad || '').includes('rap');
              }).length;

              // Estaciones destacadas para el copiloto
              const sampleStations = filtered.slice(0, 6).map(c => ({
                name: c.nombre,
                canton: c.canton,
                provincia: c.provincia,
                power: c.potencia || 'Normal',
                speed: c.velocidad,
                charger_type: c.tipo_cargador,
                cost: c.costo,
                lat: c.location.lat,
                lng: c.location.lng,
              }));

              // Estaciones para pintar en el mapa y tarjetas interactivas del frontend
              returnChargers = filtered
                .filter(c => c.location.lat !== 0 && c.location.lng !== 0)
                .slice(0, 6)
                .map(c => ({
                  name: c.nombre,
                  lat: c.location.lat,
                  lng: c.location.lng,
                  power: c.potencia,
                  speed: c.velocidad,
                  operator: c.fuente || c.provincia,
                  connector: c.tipo_cargador,
                }));

              toolResponseData = {
                totalFound: filtered.length,
                scope: isNational ? 'Ecuador (Nacional)' : (locArg || 'Zona consultada'),
                connectorType: isGbtQuery ? 'GB/T' : isCcsQuery ? 'CCS2' : isTipo2Query ? 'Tipo 2' : 'Todos',
                fastStationsCount: fastCount,
                provincesBreakdown: provCounts,
                notableStations: sampleStations,
              };
            } else if (call.name === 'add_charging_stop') {
              const chargerArg = call.args?.chargerName || '';
              const resolvedWaypoint = resolveBestChargingCandidate({
                chargerArg,
                activeTrip,
                context,
                vehicleBrand,
                prevTrip,
                normQuery,
              });

              if (resolvedWaypoint) {
                returnAction = 'add_waypoint';
                returnWaypoint = resolvedWaypoint;
                returnChargers = undefined;
                toolResponseData = {
                  added: true,
                  chargerName: resolvedWaypoint.name,
                  power: resolvedWaypoint.power,
                  isInbound: resolvedWaypoint.isInbound,
                };
              } else {
                toolResponseData = { added: false, message: 'Estación de recarga no identificada en la ruta' };
              }
            } else if (call.name === 'search_places_amenities') {
              const cat = call.args?.category || 'restaurant';
              const locArg = call.args?.location;
              const activeStop = activeTrip?.suggestedStop || activeTrip?.suggestedStops?.[0] || prevTrip?.suggestedStop;
              
              let targetCoords: { lat: number; lng: number } = (activeStop?.lat && activeStop?.lng)
                ? { lat: activeStop.lat, lng: activeStop.lng }
                : (prevTrip?.coords || { lat: -0.1807, lng: -78.4678 });

              if (locArg && (!activeStop || !normalize(locArg).includes(normalize(activeStop.name || '')))) {
                try {
                  const geo = await geocodePlace(locArg.toLowerCase().includes('ecuador') ? locArg : `${locArg}, Ecuador`);
                  if (geo) targetCoords = geo;
                } catch (_) {}
              }

              const places = await getPlacesRecommendationsFromGoogle(targetCoords, cat);
              returnPlaces = places;
              toolResponseData = {
                category: cat,
                location: locArg || activeStop?.name || 'la estación de recarga',
                places: places.map(p => `${p.name} (${p.category})`),
              };
            }

            // ─── C) Segundo Turno de IA Generativa: El LLM Genera la Respuesta Experta ───
            let spokenReply = '';
            try {
              const turn2Messages = [
                ...messages,
                candidateContent,
                {
                  role: 'user',
                  parts: [{
                    functionResponse: {
                      name: call.name,
                      response: toolResponseData,
                    },
                  }],
                },
              ];

              const turn2Res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: turn2Messages,
                  systemInstruction: { parts: [{ text: systemInstructionText }] },
                }),
                signal: AbortSignal.timeout(5000),
              });

              if (turn2Res.ok) {
                const turn2Data = await turn2Res.json();
                const textReply = turn2Data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textReply && textReply.trim()) {
                  spokenReply = textReply.trim();
                }
              }
            } catch (t2Error) {
              console.warn('Turn 2 Gemini response error, using structured fallback:', t2Error);
            }

            // Fallback elegante solo si el segundo turno de Gemini falla o expira
            if (!spokenReply) {
              if (toolResponseData.destination) {
                const dest = toolResponseData.destination;
                const km = toolResponseData.distanceKm;
                const arrivalSoc = toolResponseData.estimatedArrivalSoc;
                spokenReply = `Ruta calculada a ${dest} (${km} km). Llegarás con aproximadamente un ${arrivalSoc}% de batería.`;
              } else if (returnAction === 'add_waypoint' && returnWaypoint) {
                spokenReply = `He añadido la parada en ${returnWaypoint.name} a tu ruta activa.`;
              } else if (toolResponseData.totalFound !== undefined) {
                spokenReply = `Encontré ${toolResponseData.totalFound} puntos de recarga ${toolResponseData.connectorType ? `con conector ${toolResponseData.connectorType}` : ''} en ${toolResponseData.scope}. Puedes ver las opciones principales en el mapa.`;
              } else {
                spokenReply = `He procesado tu consulta sobre la red de recarga en Ecuador.`;
              }
            }

            return NextResponse.json({
              reply: spokenReply,
              destination: returnDestination,
              chargers: returnChargers,
              action: returnAction,
              waypoint: returnWaypoint,
              places: returnPlaces,
              provider: `${usedModel}-agent`,
            });
          }
        }
      } catch (geminiError) {
        console.warn('Gemini Agent error, using fallback:', geminiError);
      }
    }

    // =========================================================================
    // FALLBACK DE SEGURIDAD CONTEXTUAL (Si Gemini está offline o sin conexión)
    // =========================================================================

    const activePlannedStop = activeTrip?.suggestedStop || activeTrip?.suggestedStops?.[0] || prevTrip?.suggestedStop || prevTrip?.chargers?.find((c: any) => c.isNecessaryStop) || prevTrip?.chargers?.[0];

    // 0. Manejo contextual de preguntas sobre si la batería alcanza o abastece para el retorno / regreso
    const isReturnBatteryQuery = (
      (normQuery.includes('regreso') || normQuery.includes('retorno') || normQuery.includes('volver') || normQuery.includes('vuelta')) &&
      (normQuery.includes('abastece') || normQuery.includes('alcanza') || normQuery.includes('bateria') || normQuery.includes('carga') || normQuery.includes('autonomia') || normQuery.includes('llego') || normQuery.includes('llegar') || normQuery.includes('rinde') || normQuery.includes('aguanta'))
    );

    if (isReturnBatteryQuery) {
      const destName = activeTrip?.destinationName || prevTrip?.destName || (normQuery.includes('tulcan') ? 'Tulcán' : 'tu destino');
      const isRound = activeTrip?.isRoundTrip ?? prevTrip?.isRoundTrip ?? true;
      const totalKm = activeTrip?.distanceKm || (prevTrip?.distKm ? prevTrip.distKm * 2 : (normQuery.includes('tulcan') ? 480 : 300));
      const oneWayKm = Math.round(totalKm / 2);

      const isLongOrMountain = oneWayKm > 150 || (activeTrip?.arrivalSoc !== undefined && activeTrip.arrivalSoc < 20);

      let targetStop = (activePlannedStop?.name && !activePlannedStop.name.includes('para que'))
        ? activePlannedStop.name
        : (normQuery.includes('tulcan') ? 'BYD - Supermaxi San Gabriel' : 'una estación en ruta');

      let reply = '';
      if (isLongOrMountain) {
        reply = `Para el regreso de ${destName} a Quito (~${oneWayKm} km), la batería no te abastece de forma directa debido a la distancia y desniveles de la cordillera. Necesitas realizar una recarga estratégica en ${targetStop} (unos 25 a 30 minutos) para llegar a Quito con al menos un 15% de reserva segura.`;
      } else {
        reply = `Para el retorno desde ${destName}, tu batería dispone de autonomía suficiente gracias a la energía recuperada por freno regenerativo en los descensos andinos. Llegarás con reserva segura.`;
      }

      return NextResponse.json({
        reply,
        provider: 'chargeway_context_fallback',
      });
    }

    // 1. Manejo contextual de preguntas sobre tiempo de recarga o actividades mientras espera
    const isChargingTimeQuery = (
      normQuery.includes('cuanto tiempo') ||
      normQuery.includes('que tiempo') ||
      normQuery.includes('cuanto demor') ||
      normQuery.includes('cuantos minutos') ||
      normQuery.includes('duracion') ||
      (normQuery.includes('tiempo') && (normQuery.includes('recarg') || normQuery.includes('carg')))
    );

    const isWhatToDoQuery = (
      normQuery.includes('que puedo hacer') ||
      normQuery.includes('que hacer') ||
      normQuery.includes('mientras espero') ||
      normQuery.includes('mientras cargo') ||
      normQuery.includes('mientras recargo') ||
      normQuery.includes('donde comer') ||
      normQuery.includes('lugares') ||
      normQuery.includes('actividades') ||
      normQuery.includes('lapso de tiempo')
    );

    if (isChargingTimeQuery || isWhatToDoQuery) {
      let stopObj = activePlannedStop;
      if (!stopObj || !stopObj.name || stopObj.name.includes('para que')) {
        const foundNec = prevTrip?.chargers?.find((c: any) => c.isNecessaryStop) || prevTrip?.chargers?.[0];
        if (foundNec) {
          stopObj = foundNec;
        } else {
          const destName = activeTrip?.destinationName || prevTrip?.destName || (normQuery.includes('tulcan') ? 'Tulcán' : undefined);
          if (destName) {
            const r = findEcuadorRoute(destName);
            const rCharger = r?.chargers?.find(c => c.isNecessaryStop) || r?.chargers?.[0];
            if (rCharger) stopObj = rCharger;
          }
        }
      }

      const stopName = (stopObj?.name && !stopObj.name.includes('para que'))
        ? stopObj.name
        : 'BYD - Supermaxi San Gabriel';
      const estMins = stopObj?.estMinutes || 25;
      const kwh = stopObj?.kwhToCharge || Math.round((Number(battery) * 0.45) * 10) / 10;

      let reply = '';
      if (isChargingTimeQuery && isWhatToDoQuery) {
        reply = `Para tu parada en ${stopName}, debes recargar aproximadamente ${estMins} minutos (~${kwh} kWh). Mientras esperas, puedes aprovechar los comercios, cafeterías y restaurantes del sector para tomar un refrigerio o descansar.`;
      } else if (isChargingTimeQuery) {
        reply = `Para tu parada en ${stopName}, el tiempo estimado de recarga es de aproximadamente ${estMins} minutos (~${kwh} kWh) para completar tu viaje con reserva segura.`;
      } else {
        reply = `Durante tu parada de recarga en ${stopName}, puedes aprovechar los comercios, cafeterías y restaurantes del sector para descansar y tomar un refrigerio.`;
      }

      let places: any[] = [];
      const stopCoords = (stopObj?.lat && stopObj?.lng)
        ? { lat: stopObj.lat, lng: stopObj.lng }
        : (prevTrip?.coords || { lat: 0.5042, lng: -77.8306 });

      try {
        places = await getPlacesRecommendationsFromGoogle(stopCoords, 'restaurant');
      } catch (_) {}

      return NextResponse.json({
        reply,
        places: places.length > 0 ? places : undefined,
        provider: 'chargeway_context_fallback',
      });
    }

    // 2. Búsqueda de cargadores cercanos solo si el usuario busca efectivamente estaciones
    const isExplicitChargerSearch = !isChargingTimeQuery && !isWhatToDoQuery && !isReturnBatteryQuery && (
      normQuery.includes('donde cargar') ||
      normQuery.includes('electrolinera') ||
      normQuery.includes('estacion de carga') ||
      normQuery.includes('estaciones de carga') ||
      normQuery.includes('mas cercana') ||
      normQuery.includes('cercana') ||
      normQuery.includes('cargador') ||
      (normQuery.includes('recarga') && !normQuery.includes('tiempo'))
    );

    if (isExplicitChargerSearch) {
      // 1. Detectar si el usuario consultó por un sector urbano específico (ej. "al sur de quito", "quicentro sur", "cumbaya")
      let searchCoords: { lat: number; lng: number } | undefined = undefined;
      let locationLabel = 'en tu ubicación actual';

      // Importar o reutilizar catálogo de sectores
      const URBAN_SECTOR_LOOKUP: Record<string, { lat: number; lng: number; name: string }> = {
        'al sur de quito': { lat: -0.2750, lng: -78.5400, name: 'el Sur de Quito' },
        'sur de quito': { lat: -0.2750, lng: -78.5400, name: 'el Sur de Quito' },
        'quito sur': { lat: -0.2750, lng: -78.5400, name: 'el Sur de Quito' },
        'en el sur': { lat: -0.2750, lng: -78.5400, name: 'el Sur de Quito' },
        'guajalo': { lat: -0.2690, lng: -78.5340, name: 'Puente de Guajaló' },
        'el recreo': { lat: -0.2443, lng: -78.5204, name: 'C.C. El Recreo' },
        'recreo': { lat: -0.2443, lng: -78.5204, name: 'C.C. El Recreo' },
        'quicentro sur': { lat: -0.2858, lng: -78.5471, name: 'Quicentro Sur' },
        'villaflora': { lat: -0.2380, lng: -78.5180, name: 'Villaflora' },
        'solanda': { lat: -0.2700, lng: -78.5400, name: 'Solanda' },
        'quitumbe': { lat: -0.2890, lng: -78.5530, name: 'Quitumbe' },
        'san bartolo': { lat: -0.2736, lng: -78.5479, name: 'San Bartolo' },
        'guamani': { lat: -0.3150, lng: -78.5520, name: 'Guamaní' },
        'al norte de quito': { lat: -0.1350, lng: -78.4850, name: 'el Norte de Quito' },
        'norte de quito': { lat: -0.1350, lng: -78.4850, name: 'el Norte de Quito' },
        'quito norte': { lat: -0.1350, lng: -78.4850, name: 'el Norte de Quito' },
        'carcelen': { lat: -0.0980, lng: -78.4830, name: 'Carcelén' },
        'el condado': { lat: -0.1030, lng: -78.4980, name: 'El Condado' },
        'la carolina': { lat: -0.1807, lng: -78.4678, name: 'La Carolina' },
        'centro de quito': { lat: -0.2200, lng: -78.5120, name: 'el Centro de Quito' },
        'cumbaya': { lat: -0.2010, lng: -78.4350, name: 'Cumbayá' },
        'tumbaco': { lat: -0.2130, lng: -78.4020, name: 'Tumbaco' },
        'valle de los chillos': { lat: -0.3047, lng: -78.4519, name: 'el Valle de los Chillos' },
        'los chillos': { lat: -0.3047, lng: -78.4519, name: 'el Valle de los Chillos' },
        'san rafael': { lat: -0.3047, lng: -78.4519, name: 'San Rafael' },
        'norte de guayaquil': { lat: -2.1400, lng: -79.8950, name: 'el Norte de Guayaquil' },
        'sur de guayaquil': { lat: -2.2350, lng: -79.9050, name: 'el Sur de Guayaquil' },
        'samborondon': { lat: -2.1450, lng: -79.8650, name: 'Samborondón' },
      };

      for (const [secKey, secData] of Object.entries(URBAN_SECTOR_LOOKUP)) {
        if (normQuery.includes(secKey)) {
          searchCoords = { lat: secData.lat, lng: secData.lng };
          locationLabel = `en ${secData.name}`;
          break;
        }
      }

      let matchedCity: typeof ECUADOR_CITIES_CATALOG[0] | undefined = undefined;
      let targetDest: ReturnType<typeof findEcuadorDestination> | undefined = undefined;

      // 2. Si no es sector urbano, verificar si consultó por una ciudad o destino específico (ej. "en ambato", "en tena")
      if (!searchCoords) {
        matchedCity = ECUADOR_CITIES_CATALOG.find(c =>
          c.aliases.some(a => normQuery.includes(normalize(a)))
        );
        targetDest = findEcuadorDestination(normQuery);

        if (matchedCity) {
          searchCoords = { lat: matchedCity.lat, lng: matchedCity.lng };
          locationLabel = `en ${matchedCity.name}`;
        } else if (targetDest?.coords) {
          searchCoords = targetDest.coords;
          locationLabel = `en ${targetDest.name}`;
        }
      }

      if (!searchCoords) {
        searchCoords = effectiveOriginCoords
          ? { lat: effectiveOriginCoords[1], lng: effectiveOriginCoords[0] }
          : { lat: -0.1807, lng: -78.4678 };
      }

      const corridor = targetDest?.corridor || (matchedCity ? 'all' : 'local');
      const supabaseChargers = await getRouteChargersFromSupabase(corridor, searchCoords);
      const uniqueCandidates = supabaseChargers.map(c => ({
        name: c.name,
        lat: c.location.lat,
        lng: c.location.lng,
        power: c.power,
        speed: c.speed,
        operator: c.operator,
      }));
      const isMultibrandRequested = /multi\s*marca|universal|todas las marcas|cualquier marca|public/i.test(normQuery);
      const isFastRequested = /r[aá]pid[oa]|dc|alta potencia|fast|50\s*kw|electrolinera/i.test(normQuery);

      const brandPrioritized = prioritizeChargersByBrand(uniqueCandidates, vehicleBrand, {
        multibrandOnly: isMultibrandRequested,
        fastOnly: isFastRequested,
      });

      const withDistance = brandPrioritized.list.map(c => ({
        ...c,
        distKm: Math.round(Math.hypot((c.lat - searchCoords.lat) * 111, (c.lng - searchCoords.lng) * 111) * 10) / 10,
      })).sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
      const top4 = withDistance.slice(0, 4);
      const topCharger = top4[0];
      const distKm = topCharger?.distKm;
      let distText = '';
      if (distKm !== undefined) {
        distText = distKm < 0.3 ? ' en el sector céntrico' : ` a unos ${distKm} km`;
      }

      const isFollowUp = /^(y|ademas|tambien|pero|o)\b/i.test(normQuery.trim());
      const powerNote = topCharger?.power ? ` (${topCharger.power})` : '';
      let replyMsg = '';
      if (isMultibrandRequested) {
        replyMsg = `${isFollowUp ? 'En cuanto a opciones' : 'Para carga'} multimarca abierta a todo público ${locationLabel}, la estación recomendada es ${topCharger?.name || 'en la zona'}${distText}${powerNote}. Encontré ${top4.length} opciones multimarca recomendadas.`;
      } else if (isFastRequested) {
        replyMsg = `El punto de carga rápida más cercano ${locationLabel} compatible con tu ${vehicleBrand || 'auto'} es ${topCharger?.name || 'en la zona'}${distText}${powerNote}. Encontré ${top4.length} opciones recomendadas.`;
      } else {
        replyMsg = `La estación de recarga más cercana ${locationLabel} compatible con tu ${vehicleBrand || 'auto'} es ${topCharger?.name || 'en la zona'}${distText}. Encontré ${top4.length} opciones recomendadas.`;
      }

      return NextResponse.json({
        reply: replyMsg,
        chargers: top4,
        provider: 'chargeway_fallback',
      });
    }

    const resolvedFallback = await resolveDestinationFromQuery(normQuery, effectiveOriginCoords, context);
    if (resolvedFallback) {
      const isRound = normQuery.includes('ida y vuelta') || normQuery.includes('regres');
      const matchesActive = activeTrip && Number(activeTrip.distanceKm) > 0 && (
        normQuery.includes(normalize(activeTrip.destinationName || '')) ||
        normalize(resolvedFallback.name).includes(normalize(activeTrip.destinationName || ''))
      );
      const totalKm = (matchesActive && Number(activeTrip.distanceKm) > 0)
        ? Math.round(Number(activeTrip.distanceKm))
        : ((isRound && !resolvedFallback.isRoundTrip) ? resolvedFallback.distKm * 2 : resolvedFallback.distKm);
      const arrivalSoc = (matchesActive && activeTrip?.arrivalSoc !== undefined && !isNaN(Number(activeTrip.arrivalSoc)))
        ? Math.round(Number(activeTrip.arrivalSoc))
        : Math.max(0, Math.round(soc - ((totalKm * 0.16) / battery) * 100));
      const fallbackChargers = resolvedFallback.chargers || [];
      const stopCount = fallbackChargers.length;
      let replyText = '';
      if (arrivalSoc >= 15) {
        replyText = `He trazado la ruta a ${resolvedFallback.name}${isRound ? ' de ida y vuelta' : ''} (${totalKm} km). Llegarás con aproximadamente ${arrivalSoc} por ciento de batería sin recargas intermedias.`;
      } else {
        const stopDesc = stopCount > 1
          ? `he planificado ${stopCount} paradas de recarga necesarias en la ruta para que viajes con total seguridad`
          : (stopCount === 1 ? `he planificado una parada de recarga estratégica para que llegues con reserva segura` : `se recomienda recargar en el trayecto para llegar con reserva segura`);
        replyText = `He trazado la ruta a ${resolvedFallback.name}${isRound ? ' de ida y vuelta' : ''} (${totalKm} km). Como este trayecto supera tu autonomía actual, ${stopDesc}.`;
      }
      return NextResponse.json({
        reply: replyText,
        destination: {
          name: resolvedFallback.name,
          lat: resolvedFallback.lat,
          lng: resolvedFallback.lng,
          distKm: resolvedFallback.distKm,
          isRoundTrip: isRound || resolvedFallback.isRoundTrip,
          origin: (resolvedFallback as any).origin,
          vehicleModel: (resolvedFallback as any).vehicleModel,
          vehicleBrand: (resolvedFallback as any).vehicleBrand,
          waypoints: resolvedFallback.waypoints,
        },
        chargers: resolvedFallback.chargers || [],
        provider: 'chargeway_fallback',
      });
    }

    const fallbackReply = `Con tu nivel de batería al ${soc} por ciento dispones de unos ${baseRangeKm} kilómetros de autonomía en tu ${vehicle}. Puedes pedirme trazar una ruta a cualquier destino o buscar puntos de carga.`;
    return NextResponse.json({ reply: fallbackReply, provider: 'chargeway_fallback' });

  } catch (err: any) {
    console.error('Copilot API error:', err);
    return NextResponse.json({
      reply: 'Disculpa, ocurrió un error al procesar tu consulta. Por favor intenta de nuevo.',
      error: err.message,
    }, { status: 500 });
  }
}

export const POST = withTiming('copilot', handlePOST);
