/**
 * Route Orchestrator for ChargeWay
 * The "Brain" that combines all APIs to generate a reliable trip plan.
 */

import { fetchRoute, RouteResponse, decodeGeoJSONGeometry } from './services/mapbox';
import { ElevationPoint, fetchElevationForCoords, smoothElevation } from './services/elevation';
import { fetchWeather, WeatherData } from './services/weather';
import { fetchChargersAlongRoute, Charger, isChargerBrandCompatible } from './services/charging';
import { calculateSegmentConsumption, VehicleSpecs, simulateContinuousRouteEnergy, ContinuousRouteSimulation } from './energy-core';

import { AdvisorFeedback, RouteAdvisorAgent } from './agents/RouteAdvisorAgent';
import { useTripStore } from '@/lib/store/useTripStore';

export interface RecommendedChargeInfo {
  arrivalSocPct: number;
  targetSocPct: number;
  kwhToCharge: number;
  estMinutes: number;
  reason: string;
  legIndex?: number;
  totalLegs?: number;
  posKm?: number;
}

export interface TripPlan {
  route: RouteResponse;
  elevation: ElevationPoint[];
  weather: WeatherData | null;
  chargers: Charger[];
  totalConsumptionWh: number;
  safetyMarginKm: number;
  arrivalSoc: number;
  arrivalRangeKm: number;
  advisorFeedback: AdvisorFeedback;
  suggestedChargingStop: (Charger & {
    recommendedCharge?: RecommendedChargeInfo;
    posKm?: number;
    isInbound?: boolean;
  }) | null;
  suggestedChargingStops?: Array<Charger & {
    recommendedCharge?: RecommendedChargeInfo;
    posKm?: number;
    isInbound?: boolean;
  }>;
  simulation?: ContinuousRouteSimulation;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns the cumulative km along the route for each decoded coordinate.
 */
function buildRouteCumDistances(coords: number[][]): number[] {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversineKm(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]));
  }
  return cum;
}

/**
 * Finds all km positions where a charger is accessible along the route (handles both outbound and return passes).
 */
function findChargerPositionsAlongRoute(
  charger: Charger,
  coords: number[][],
  cumDist: number[],
  maxDetourKm: number = 15.0
): Array<{ posKm: number; detourKm: number }> {
  const passes: Array<{ posKm: number; detourKm: number }> = [];
  let inPass = false;
  let minDetourInPass = Infinity;
  let bestIdxInPass = -1;

  for (let i = 0; i < coords.length; i++) {
    const d = haversineKm(charger.location.lat, charger.location.lng, coords[i][1], coords[i][0]);
    if (d <= maxDetourKm) {
      if (!inPass) {
        inPass = true;
        minDetourInPass = d;
        bestIdxInPass = i;
      } else if (d < minDetourInPass) {
        minDetourInPass = d;
        bestIdxInPass = i;
      }
    } else {
      if (inPass && bestIdxInPass !== -1) {
        const passKm = cumDist[bestIdxInPass];
        if (!passes.some(p => Math.abs(p.posKm - passKm) < 40)) {
          passes.push({ posKm: passKm, detourKm: minDetourInPass });
        }
        inPass = false;
        minDetourInPass = Infinity;
        bestIdxInPass = -1;
      }
    }
  }

  if (inPass && bestIdxInPass !== -1) {
    const passKm = cumDist[bestIdxInPass];
    if (!passes.some(p => Math.abs(p.posKm - passKm) < 40)) {
      passes.push({ posKm: passKm, detourKm: minDetourInPass });
    }
  }

  if (passes.length === 0) {
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineKm(charger.location.lat, charger.location.lng, coords[i][1], coords[i][0]);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }
    if (minDist <= maxDetourKm) {
      passes.push({ posKm: cumDist[closestIdx], detourKm: minDist });
    }
  }

  return passes;
}

/**
 * Real physics-based charging stop selector:
 * ONLY suggests a stop if the continuous simulation physically demonstrates that
 * the vehicle cannot reach the destination with safe reserve (isDirectReachable === false).
 * Never forces a stop if battery is sufficient.
 */
export function pickAllChargingStopsByPhysics(
  chargers: Charger[],
  coords: number[][],
  cumDist: number[],
  elevation: ElevationPoint[],
  simulation: ContinuousRouteSimulation,
  vehicleSpecs: VehicleSpecs,
  environment: any,
  avgSpeedKmh: number,
  totalDistanceKm: number,
  initialSoc: number,
  userBrand?: string
): Array<Charger & { recommendedCharge: RecommendedChargeInfo; posKm: number; isInbound?: boolean }> {
  // Enforce brand exclusivity: chargers of exclusive brands (e.g. BYD, KIA, JAC) cannot be used by other vehicle brands
  const effectiveBrand = userBrand || useTripStore.getState().selectedVehicle?.brand;
  const brandAllowedChargers = chargers.filter(c => isChargerBrandCompatible(c, effectiveBrand));

  // If the vehicle can physically arrive with >= 12% reserve and no mid-route exhaustion:
  // NO STOP IS SUGGESTED OR FORCED.
  if (brandAllowedChargers.length === 0 || simulation.isDirectReachable) {
    return [];
  }

  // Filter chargers on the direct route corridor (detour <= 15 km), accounting for both outbound and return passes
  const mapped: Array<{ charger: Charger; posKm: number; detourKm: number }> = [];
  for (const c of brandAllowedChargers) {
    const passes = findChargerPositionsAlongRoute(c, coords, cumDist, 15.0);
    for (const p of passes) {
      mapped.push({ charger: c, posKm: p.posKm, detourKm: p.detourKm });
    }
  }
  mapped.sort((a, b) => a.posKm - b.posKm);

  if (mapped.length === 0) return [];

  // Helper to query SoC at a relative km along a simulation's socTimeline
  const getSocAtKm = (sim: ContinuousRouteSimulation, km: number): number => {
    if (!sim.socTimeline || sim.socTimeline.length === 0) return 0;
    for (let i = sim.socTimeline.length - 1; i >= 0; i--) {
      if (sim.socTimeline[i].km <= km) {
        return sim.socTimeline[i].soc;
      }
    }
    return sim.socTimeline[0]?.soc ?? 0;
  };

  const selectedStops: Array<Charger & { recommendedCharge: RecommendedChargeInfo; posKm: number; isInbound?: boolean }> = [];
  let currentStartKm = 0;
  let currentSim = simulation;
  let iteration = 0;
  const maxIterations = 8; // Physical safety cap for realistic cross-country travel

  while (!currentSim.isDirectReachable && iteration < maxIterations) {
    iteration++;

    // Calculate maximum safe km before exhaustion for the current leg
    const legDepletionKm = currentSim.depletionKm;
    const absDepletionKm = legDepletionKm !== null
      ? currentStartKm + legDepletionKm
      : totalDistanceKm;

    const legDistanceToDepletion = Math.max(15, absDepletionKm - currentStartKm);
    const minAdvanceKm = Math.min(25, legDistanceToDepletion * 0.35);
    const minStopKm = currentStartKm + minAdvanceKm;
    const maxSafeKm = Math.max(minStopKm + 5, absDepletionKm - 4);

    const candidates = mapped.filter(item => {
      // Must be at least minStopKm ahead of the previous charge stop
      if (item.posKm < minStopKm || item.posKm > maxSafeKm) return false;
      // Do not repeat a stop within 35 km of an already chosen stop
      if (selectedStops.some(s => Math.abs(s.posKm - item.posKm) < 35)) return false;

      // Excluir negocios urbanos no aptos como paradas de ruta (peluquerías, estéticas)
      const cNameNorm = (item.charger.nombre || '').toLowerCase();
      if (cNameNorm.includes('peluquer') || cNameNorm.includes('barber') || cNameNorm.includes('estetica')) return false;

      // Criterio de física electroquímica de baterías de litio:
      // Una recarga solo es físicamente útil y viable si la batería tiene suficiente margen de absorción (headroom)
      // para aceptar energía útil sin entrar en la zona de saturación y estrangulamiento térmico/potencia (SoC > 60%).
      const socAtCharger = getSocAtKm(currentSim, item.posKm - currentStartKm);
      if (socAtCharger < 0.05) return false; // Al menos 5% de reserva mínima física de seguridad al llegar

      // Si la batería llega con más del 60% de SoC, la química de la celda apenas absorbe energía (< 20%),
      // la potencia de carga rápida decae drásticamente y la ganancia neta no justifica detener el vehículo.
      const potentialEnergyGainKwh = vehicleSpecs.usable_battery_kwh * (0.85 - socAtCharger);
      if (potentialEnergyGainKwh < 8.0) return false; // Mínimo 8 kWh de ganancia física neta indispensable

      // Criterio de balance energético a la meta final:
      // Si la simulación continua demuestra que la energía restante alcanza para llegar a la meta con margen >= 12%,
      // no existe necesidad física de detenerse a recargar a escasos kilómetros del destino.
      const socAtFinalDest = getSocAtKm(currentSim, totalDistanceKm - currentStartKm);
      if (socAtFinalDest >= 0.12 && item.posKm > totalDistanceKm - 35) return false;

      return true;
    });

    let chosen: { charger: Charger; posKm: number; detourKm: number } | null = null;

    if (candidates.length > 0) {
      // Todos los cargadores compatibles son elegibles (7 kW, 22 kW, 50 kW+), adaptándose a la infraestructura disponible
      const pool = candidates;

      // Ranking: balance óptimo de llegada con 12% - 18% de SoC y menor desvío
      pool.sort((a, b) => {
        const socA = getSocAtKm(currentSim, a.posKm - currentStartKm);
        const socB = getSocAtKm(currentSim, b.posKm - currentStartKm);
        
        let scoreA = -Math.abs(socA - 0.15) * 6;
        let scoreB = -Math.abs(socB - 0.15) * 6;

        // Preferencia suave por mayor potencia si coinciden en la misma zona geográfica, sin descartar los lentos
        const powerA = parseInt(a.charger.potencia || '0') || (a.charger.velocidad?.toLowerCase().includes('rápid') ? 50 : (a.charger.velocidad?.toLowerCase().includes('semi') ? 22 : 7.4));
        const powerB = parseInt(b.charger.potencia || '0') || (b.charger.velocidad?.toLowerCase().includes('rápid') ? 50 : (b.charger.velocidad?.toLowerCase().includes('semi') ? 22 : 7.4));
        scoreA += Math.min(powerA, 120) * 0.02;
        scoreB += Math.min(powerB, 120) * 0.02;

        // Penalización por desvío de la ruta
        scoreA -= (a.detourKm || 0) * 0.15;
        scoreB -= (b.detourKm || 0) * 0.15;

        if (userBrand) {
          const matchA = a.charger.nombre?.toLowerCase().includes(userBrand.toLowerCase()) || (a.charger as any).operador?.toLowerCase().includes(userBrand.toLowerCase());
          const matchB = b.charger.nombre?.toLowerCase().includes(userBrand.toLowerCase()) || (b.charger as any).operador?.toLowerCase().includes(userBrand.toLowerCase());
          if (matchA && !matchB) scoreA += 0.35;
          if (matchB && !matchA) scoreB += 0.35;
        }

        return scoreB - scoreA;
      });

      chosen = pool[0];
    } else {
      // Fallback: cargador antes del agotamiento que avance de forma significativa
      const fallback = mapped
        .filter(item => {
          if (currentStartKm === 0 && initialSoc >= 0.70 && item.posKm < 45) return false;
          if (item.posKm <= currentStartKm + 20 || item.posKm > absDepletionKm) return false;
          if (selectedStops.some(s => Math.abs(s.posKm - item.posKm) < 25)) return false;
          const cNameNorm = (item.charger.nombre || '').toLowerCase();
          if (cNameNorm.includes('peluquer') || cNameNorm.includes('barber') || cNameNorm.includes('estetica')) return false;
          const remainingToDest = totalDistanceKm - item.posKm;
          if (remainingToDest < 25) {
            const socAtDest = getSocAtKm(currentSim, totalDistanceKm - currentStartKm);
            if (socAtDest >= 0.10) return false;
          }
          return true;
        })
        .sort((a, b) => b.posKm - a.posKm);

      if (fallback.length > 0) {
        chosen = fallback[0];
      } else {
        // Fallback secundario para retorno en corredores sin cargador en destino intermedio:
        // Si el vehículo regresa hacia un nodo de recarga conocido en el corredor (ej. Santo Domingo en retorno de Manabí)
        const returnCorridorCharger = mapped
          .filter(item => {
            if (item.posKm <= currentStartKm + 35 || item.posKm > absDepletionKm + 75) return false;
            if (selectedStops.some(s => Math.abs(s.posKm - item.posKm) < 30)) return false;
            const cNameNorm = (item.charger.nombre || '').toLowerCase();
            if (cNameNorm.includes('peluquer') || cNameNorm.includes('barber') || cNameNorm.includes('estetica')) return false;
            return true;
          })
          .sort((a, b) => a.posKm - b.posKm);
        if (returnCorridorCharger.length > 0) {
          chosen = returnCorridorCharger[0];
        }
      }
    }

    if (!chosen) {
      // No reachable charger found on this leg before depletion
      break;
    }
    const arrivalSocAtCharger = Math.max(0.04, Math.min(1.0, getSocAtKm(currentSim, chosen.posKm - currentStartKm)));

    // Simulate next leg from this charger. For long legs or mountain passes, evaluate standard 85% or high 95% target
    let targetChargeFrac = 0.85;
    const remainingDistKm = Math.max(1, totalDistanceKm - chosen.posKm);
    const remainingDistM = remainingDistKm * 1000;
    const elevIdx = Math.min(
      elevation.length - 1,
      Math.max(0, Math.floor((chosen.posKm / Math.max(1, totalDistanceKm)) * elevation.length))
    );
    const subElevation = elevation.slice(elevIdx);

    let nextSim = simulateContinuousRouteEnergy(
      subElevation.length >= 2 ? subElevation : elevation,
      remainingDistM,
      avgSpeedKmh,
      vehicleSpecs,
      environment,
      targetChargeFrac
    );

    // If 85% doesn't reach the next stop or destination and remaining distance is significant, charge to 95%
    if (!nextSim.isDirectReachable && remainingDistKm > 160) {
      const sim95 = simulateContinuousRouteEnergy(
        subElevation.length >= 2 ? subElevation : elevation,
        remainingDistM,
        avgSpeedKmh,
        vehicleSpecs,
        environment,
        0.95
      );
      if (sim95.isDirectReachable || (sim95.depletionKm || 0) > (nextSim.depletionKm || 0)) {
        targetChargeFrac = 0.95;
        nextSim = sim95;
      }
    }

    // Determine target SoC required
    let targetSocPct = Math.round(targetChargeFrac * 100);
    let kwhToCharge = 0;
    if (nextSim.isDirectReachable) {
      // Garantizar que la recarga cubra el consumo del tramo restante más al menos un 18% de reserva segura al arribar
      const safeArrivalReserveWh = vehicleSpecs.usable_battery_kwh * 0.18 * 1000;
      const neededKwh = (nextSim.totalConsumptionWh + safeArrivalReserveWh) / 1000;
      const currentKwhAtCharger = arrivalSocAtCharger * vehicleSpecs.usable_battery_kwh;
      const targetKwh = Math.min(vehicleSpecs.usable_battery_kwh * targetChargeFrac, Math.max(currentKwhAtCharger + 4, neededKwh));
      kwhToCharge = Math.max(4, Number((targetKwh - currentKwhAtCharger).toFixed(1)));
      targetSocPct = Math.min(Math.round(targetChargeFrac * 100), Math.round(((currentKwhAtCharger + kwhToCharge) / vehicleSpecs.usable_battery_kwh) * 100));
    } else {
      kwhToCharge = Math.max(6, Number(((targetChargeFrac - arrivalSocAtCharger) * vehicleSpecs.usable_battery_kwh).toFixed(1)));
      targetSocPct = Math.round(targetChargeFrac * 100);
    }

    // Charging time calculation adaptado a la potencia real (AC 7.4 kW / 22 kW o DC 50 kW+)
    const chargerPowerMatch = chosen.charger.potencia?.match(/(\d+)/);
    const chargerKw = chargerPowerMatch ? Number(chargerPowerMatch[1]) : (chosen.charger.velocidad?.toLowerCase().includes('rápid') ? 50 : (chosen.charger.velocidad?.toLowerCase().includes('semi') ? 22 : 7.4));
    const effectiveChargeKw = Math.min(vehicleSpecs.peak_charging_kw || 60, chargerKw || 7.4) * 0.85;
    const estMinutes = Math.max(10, Math.round((kwhToCharge / Math.max(3, effectiveChargeKw)) * 60));

    const isPastHalfway = chosen.posKm > (totalDistanceKm * 0.48);
    selectedStops.push({
      ...chosen.charger,
      posKm: Math.round(chosen.posKm * 10) / 10,
      isInbound: isPastHalfway,
      recommendedCharge: {
        arrivalSocPct: Math.round(arrivalSocAtCharger * 100),
        targetSocPct,
        kwhToCharge,
        estMinutes,
        reason: `Parada ${selectedStops.length + 1} en km ${Math.round(chosen.posKm)} (${isPastHalfway ? 'Retorno' : 'Ida'}): Llegarías con ~${Math.round(arrivalSocAtCharger * 100)}%. Recarga necesaria para continuar.`,
        legIndex: selectedStops.length + 1,
        posKm: Math.round(chosen.posKm * 10) / 10,
      }
    });

    currentStartKm = chosen.posKm;
    currentSim = nextSim;

    // If nextSim can reach the destination, stop!
    if (nextSim.isDirectReachable) {
      break;
    }
  }

  // Update totalLegs and polish the reasons for each stop
  const totalLegs = selectedStops.length;
  selectedStops.forEach((stop, idx) => {
    if (stop.recommendedCharge) {
      stop.recommendedCharge.totalLegs = totalLegs;
      const legNum = idx + 1;
      const isLast = legNum === totalLegs;
      const stopCity = stop.canton || stop.provincia || 'Ruta';
      stop.recommendedCharge.reason = totalLegs === 1
        ? `La batería no alcanza para llegar directo. Recargar en ${stop.nombre} (${stopCity}) te permite completar tu viaje con reserva segura.`
        : isLast
        ? `Parada ${legNum} de ${totalLegs} (${stopCity} - km ${Math.round(stop.posKm)}): Recarga final de ${stop.recommendedCharge.kwhToCharge} kWh para arribar con seguridad a tu destino.`
        : `Parada ${legNum} de ${totalLegs} (${stopCity} - km ${Math.round(stop.posKm)}): Recarga intermedia a ${stop.recommendedCharge.targetSocPct}% SoC (~${stop.recommendedCharge.estMinutes} min) para el siguiente tramo.`;
    }
  });

  return selectedStops;
}

export function pickBestChargingStopByPhysics(
  chargers: Charger[],
  coords: number[][],
  cumDist: number[],
  simulation: ContinuousRouteSimulation,
  vehicleSpecs: VehicleSpecs,
  totalDistanceKm: number
): (Charger & { recommendedCharge?: RecommendedChargeInfo; posKm?: number }) | null {
  const stops = pickAllChargingStopsByPhysics(
    chargers,
    coords,
    cumDist,
    [],
    simulation,
    vehicleSpecs,
    { wind_speed_ms: 0, wind_direction_deg: 0, ambient_temp_c: 20, road_condition: 'dry' },
    70,
    totalDistanceKm,
    1.0
  );
  return stops[0] || null;
}

const SAFETY_BUFFER_PERCENT = 0.20; // 20% as requested by the user

export async function generateTripPlan(
  coordinates: { lng: number; lat: number }[],
  vehicleSpecs: VehicleSpecs,
  currentSoc: number,
  vehicleBrand?: string
): Promise<TripPlan | null> {
  // 1. Get Route from Mapbox (multi-stop support)
  const route = await fetchRoute(coordinates);
  if (!route) return null;

  // 2-4. Elevation, weather and chargers depend only on the route → fetch in parallel.
  // route.elevationPoints contains the road geometry points (lat/lng from GeoJSON)
  const roadCoords = route.elevationPoints.map(p => ({ lat: p.lat, lng: p.lng }));
  const origin = coordinates[0];
  const destination = coordinates[coordinates.length - 1];
  const midpoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2
  };
  const routeCoords = decodeGeoJSONGeometry(route.geometry).map(([lng, lat]) => ({ lat, lng }));

  // Elevation has been observed taking up to 24s; never let it block the plan longer than 6s.
  const ELEVATION_TIMEOUT_MS = 6000;
  const elevationWithTimeout = Promise.race([
    fetchElevationForCoords(roadCoords, 50),
    new Promise<ElevationPoint[]>(resolve => setTimeout(() => resolve([]), ELEVATION_TIMEOUT_MS)),
  ]);

  const [rawElevation, weather, fetchedChargers] = await Promise.all([
    elevationWithTimeout,
    fetchWeather(midpoint.lat, midpoint.lng),
    fetchChargersAlongRoute(route.geometry, 30, routeCoords),
  ]);

  // Smooth out DEM noise before energy calculation.
  // Raw OpenTopoData has ±5-15m point noise; unsmoothed it inflates consumption
  // because uphill noise costs energy but downhill noise only recovers 25% via regen.
  const elevation = smoothElevation(rawElevation, 5);
  let chargers = fetchedChargers;

  const selectedVehicle = useTripStore.getState().selectedVehicle;
  const currentBrand = vehicleBrand || selectedVehicle?.brand;

  // Filter based on UI toggle
  const filterCompatible = useTripStore.getState().filterCompatibleChargers;
  if (filterCompatible) {
    chargers = chargers.filter(c => {
      // 1. Regla de exclusividad de marca: cargadores de marca como BYD, KIA o JAC son exclusivos
      if (!isChargerBrandCompatible(c, currentBrand)) {
        return false;
      }

      // 2. Regla de conector
      if (!(vehicleSpecs as any)?.charger_type) return true;
      if (!c.tipo_cargador) return true;
      const vType = (vehicleSpecs as any).charger_type.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cType = c.tipo_cargador.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (vType === 'type2' || vType === 'tipo2') return cType.includes('type2') || cType.includes('tipo2') || cType.includes('ac');
      if (vType === 'ccs2') {
        return cType.includes('ccs2') || cType.includes('cs2') || cType.includes('combo2') || cType.includes('combo 2') || cType.includes('type2') || cType.includes('tipo2') || cType.includes('tipo 2') || cType.includes('type 2') || cType.includes('ac');
      }
      if (vType === 'ccs1') {
        return cType.includes('ccs1') || cType.includes('cs1') || cType.includes('combo1') || cType.includes('combo 1') || cType.includes('type1') || cType.includes('tipo1') || cType.includes('j1772') || cType.includes('ac');
      }
      if (vType === 'gbt') return cType.includes('gbt') || cType.includes('chino');
      return cType.includes(vType);
    });
  }

  // Sort chargers by distance from the origin so the closest ones to the start appear first
  chargers.sort((a, b) => {
    const distA = haversineKm(origin.lat, origin.lng, a.location.lat, a.location.lng);
    const distB = haversineKm(origin.lat, origin.lng, b.location.lat, b.location.lng);
    return distA - distB;
  });

  // 4b. Detect recharge stops already planned in the route waypoints
  const rawRouteCoords = decodeGeoJSONGeometry(route.geometry);
  const cumDist = buildRouteCumDistances(rawRouteCoords);
  const totalDistanceKm = route.distance / 1000;
  const intermediateCoords = coordinates.slice(1, -1);
  const activeRoutePoints = useTripStore.getState().routePoints;
  const rechargeStops: Array<{ km: number; targetSoc: number }> = [];

  if (intermediateCoords.length > 0) {
    for (let i = 0; i < intermediateCoords.length; i++) {
      const pt = intermediateCoords[i];
      const matchingWp = activeRoutePoints[i + 1];
      const isNamedCharger = matchingWp?.name && (
        /byd|kia|jac|cargador|electrolinera|ultra|evinka|condor|rayo|primax|terpel|kfc|shopping|charge|plaza|mall|recarga|estaci[oó]n/i.test(matchingWp.name) ||
        /\b\d+\s*kw\b/i.test(matchingWp.name)
      );
      const isKnownCharger = chargers.some(c => haversineKm(pt.lat, pt.lng, c.location.lat, c.location.lng) < 1.5);

      if (isNamedCharger || isKnownCharger || matchingWp?.id?.startsWith('stop-') || matchingWp?.id?.startsWith('nec_stop_')) {
        // Project onto route cumDist
        let minDist = Infinity;
        let bestKm = 0;
        for (let k = 0; k < rawRouteCoords.length; k++) {
          const d = haversineKm(pt.lat, pt.lng, rawRouteCoords[k][1], rawRouteCoords[k][0]);
          if (d < minDist) {
            minDist = d;
            bestKm = cumDist[k];
          }
        }
        if (bestKm > 5 && bestKm < totalDistanceKm - 5) {
          const remainingDist = totalDistanceKm - bestKm;
          // Target SoC: 95% if tramo is long (> 150 km), otherwise 85%
          const targetSoc = remainingDist > 150 ? 0.95 : 0.85;
          rechargeStops.push({ km: Math.round(bestKm * 10) / 10, targetSoc });
        }
      }
    }
    rechargeStops.sort((a, b) => a.km - b.km);
  }

  // 5. Continuous Physics Simulation using Energy Core
  const environment = {
    wind_speed_ms: weather?.wind_speed_ms || 0,
    wind_direction_deg: weather?.wind_deg || 0,
    ambient_temp_c: weather?.temp_c || 21,
    road_condition: (weather?.condition === 'Rain' ? 'wet' : 'dry') as 'dry' | 'wet' | 'snow'
  };

  const avgSpeedKmh = route.duration > 0 ? (route.distance / 1000) / (route.duration / 3600) : 65;

  // Execute continuous physics simulation along the road elevation points, factoring in recharge stops
  const simulation = simulateContinuousRouteEnergy(
    elevation,
    route.distance,
    avgSpeedKmh,
    vehicleSpecs,
    environment,
    currentSoc,
    rechargeStops
  );

  const totalConsumptionWh = simulation.totalConsumptionWh;
  const arrivalSoc = simulation.arrivalSoc;
  const safetyMarginKm = simulation.safetyMarginKm;
  const arrivalRangeKm = simulation.arrivalRangeKm;

  const actualWeatherCondition = weather?.condition === 'Rain'
    ? 'Lluvia'
    : (weather?.wind_speed_ms && weather.wind_speed_ms > 8 ? 'Viento en contra' : 'Despejado');

  // 6. Charging Stops: ONLY suggested if physics simulation proves battery is insufficient
  // If arrivalSoc >= 0.12 and vehicle doesn't run out mid-route, suggestedChargingStops is empty!
  let suggestedChargingStops: Array<Charger & { recommendedCharge?: RecommendedChargeInfo; posKm?: number }> = [];
  let suggestedChargingStop: (Charger & { recommendedCharge?: RecommendedChargeInfo; posKm?: number }) | null = null;

  if (!simulation.isDirectReachable) {
    const selectedVehicle = useTripStore.getState().selectedVehicle;
    const userBrand = selectedVehicle?.brand?.toLowerCase().trim();

    suggestedChargingStops = pickAllChargingStopsByPhysics(
      chargers,
      rawRouteCoords,
      cumDist,
      elevation,
      simulation,
      vehicleSpecs,
      environment,
      avgSpeedKmh,
      totalDistanceKm,
      currentSoc,
      userBrand
    );
    suggestedChargingStop = suggestedChargingStops[0] || null;
  }

  const tempPlan: TripPlan = {
    route,
    elevation,
    weather,
    chargers,
    totalConsumptionWh,
    safetyMarginKm,
    arrivalSoc,
    arrivalRangeKm,
    advisorFeedback: { drivingStyleAdvice: '', speedLimitRecommendation: 0, weatherWarning: null, overallStatus: 'Seguro', segmentTips: [] },
    suggestedChargingStop,
    suggestedChargingStops,
    simulation
  };

  const advisorFeedback = await RouteAdvisorAgent(tempPlan, actualWeatherCondition);
  tempPlan.advisorFeedback = advisorFeedback;

  return tempPlan;
}
