/**
 * Route Orchestrator for ChargeWay
 * The "Brain" that combines all APIs to generate a reliable trip plan.
 */

import { fetchRoute, RouteResponse, decodeGeoJSONGeometry } from './services/mapbox';
import { ElevationPoint, fetchElevationForCoords, smoothElevation } from './services/elevation';
import { fetchWeather, WeatherData } from './services/weather';
import { fetchChargersAlongRoute, Charger } from './services/charging';
import { calculateSegmentConsumption, VehicleSpecs } from './energy-core';

import { AdvisorFeedback, RouteAdvisorAgent } from './agents/RouteAdvisorAgent';

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
  suggestedChargingStop: Charger | null;
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
 * Finds the km position of a charger along the route (snaps to nearest route point).
 */
function chargerPositionKm(charger: Charger, coords: number[][], cumDist: number[]): number {
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineKm(charger.location.lat, charger.location.lng, coords[i][1], coords[i][0]);
    if (d < minDist) { minDist = d; closestIdx = i; }
  }
  return cumDist[closestIdx];
}

/**
 * Picks the best charging stop when battery is insufficient.
 * Strategy: find all fast chargers reachable before the range limit,
 * then pick the one closest to 70% of max reachable distance (optimal stop point).
 */
function pickBestChargingStop(
  chargers: Charger[],
  coords: number[][],
  cumDist: number[],
  initialRangeKm: number
): Charger | null {
  if (chargers.length === 0) return null;

  const reachableLimit = initialRangeKm * 0.88; // 12% reserve to reach the charger
  const idealKm = initialRangeKm * 0.70;        // stop at ~70% of range for efficiency

  const reachable = chargers
    .map(c => ({ charger: c, posKm: chargerPositionKm(c, coords, cumDist) }))
    .filter(({ posKm }) => posKm > 0 && posKm <= reachableLimit);

  if (reachable.length === 0) return null;

  // Prefer fast chargers
  const fast = reachable.filter(({ charger }) =>
    charger.velocidad?.toLowerCase().includes('rápid')
  );
  const pool = fast.length > 0 ? fast : reachable;

  // Pick the one closest to idealKm
  pool.sort((a, b) => Math.abs(a.posKm - idealKm) - Math.abs(b.posKm - idealKm));
  return pool[0].charger;
}

const SAFETY_BUFFER_PERCENT = 0.20; // 20% as requested by the user

export async function generateTripPlan(
  coordinates: { lng: number; lat: number }[],
  vehicleSpecs: VehicleSpecs,
  currentSoc: number
): Promise<TripPlan | null> {
  // 1. Get Route from Mapbox (multi-stop support)
  const route = await fetchRoute(coordinates);
  if (!route) return null;

  // 2. Get real elevation from OpenTopoData using actual road coordinates
  // route.elevationPoints contains the road geometry points (lat/lng from GeoJSON)
  const roadCoords = route.elevationPoints.map(p => ({ lat: p.lat, lng: p.lng }));
  const rawElevation = await fetchElevationForCoords(roadCoords, 50);
  // Smooth out DEM noise before energy calculation.
  // Raw OpenTopoData has ±5-15m point noise; unsmoothed it inflates consumption
  // because uphill noise costs energy but downhill noise only recovers 25% via regen.
  const elevation = smoothElevation(rawElevation, 5);

  // 3. Get Weather (at midpoint of the first and last point for now, or midpoint of route)
  const origin = coordinates[0];
  const destination = coordinates[coordinates.length - 1];
  const midpoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2
  };
  const weather = await fetchWeather(midpoint.lat, midpoint.lng);

  // 4. Get Charging Points along the route polyline
  const routeCoords = decodeGeoJSONGeometry(route.geometry).map(([lng, lat]) => ({ lat, lng }));
  const chargers = await fetchChargersAlongRoute(route.geometry, 30, routeCoords);

  // Sort chargers by distance from the origin so the closest ones to the start appear first
  chargers.sort((a, b) => {
    const distA = haversineKm(origin.lat, origin.lng, a.location.lat, a.location.lng);
    const distB = haversineKm(origin.lat, origin.lng, b.location.lat, b.location.lng);
    return distA - distB;
  });

  // 5. Calculate Consumption using Energy Core
  // We approximate the route into N segments based on elevation points
  let totalConsumptionWh = 0;
  const environment = {
    wind_speed_ms: weather?.wind_speed_ms || 0,
    wind_direction_deg: weather?.wind_deg || 0,
    ambient_temp_c: weather?.temp_c || 21,
    road_condition: 'dry' as const
  };

  const avgSpeed = (route.distance / route.duration) || 15; // simplicity for now

  if (elevation.length < 2) {
    totalConsumptionWh = calculateSegmentConsumption(
      vehicleSpecs,
      environment,
      {
        distance_m: route.distance,
        elevation_gain_m: 0,
        speed_ms: avgSpeed,
        altitude_m: 2800
      } as any
    );
  } else {
    // Use real haversine distance + slope-adjusted speed per segment
    for (let i = 1; i < elevation.length; i++) {
      const prev = elevation[i - 1];
      const curr = elevation[i];
      const segDistKm = haversineKm(prev.location.lat, prev.location.lng, curr.location.lat, curr.location.lng);
      const segDistM = segDistKm * 1000;
      if (segDistM < 1) continue; // skip duplicate points
      const elevationGain = curr.elevation - prev.elevation;

      // Slope in %: affects actual driving speed and therefore energy
      const slopePct = (segDistM > 0) ? (elevationGain / segDistM) * 100 : 0;

      // Speed model: steep uphill forces lower speed (natural traffic physics)
      // steep downhill also limited by safety/regen effectiveness
      let segSpeed = avgSpeed;
      if (slopePct > 6) {
        segSpeed = Math.max(avgSpeed * 0.55, 4); // >6% grade: ~55% base speed
      } else if (slopePct > 3) {
        segSpeed = Math.max(avgSpeed * 0.75, 4); // 3-6% grade: ~75% base speed
      } else if (slopePct < -6) {
        segSpeed = Math.min(avgSpeed * 0.80, 25); // steep downhill: limited for safety
      }

      // Average altitude of this segment (for air density)
      const segAltitude = (prev.elevation + curr.elevation) / 2;

      const segWh = calculateSegmentConsumption(
        vehicleSpecs,
        environment,
        {
          distance_m: segDistM,
          elevation_gain_m: elevationGain,
          speed_ms: segSpeed,
          altitude_m: segAltitude
        } as any
      );
      // Urban inefficiency factor: stop-and-go, acceleration losses, non-ideal speed.
      // Only applied to flat/uphill segments — sustained descents are already regen-accurate.
      const URBAN_FACTOR = 1.05;
      const isSustainedDescend = slopePct < -3;
      totalConsumptionWh += isSustainedDescend ? segWh : segWh * URBAN_FACTOR;
    }
  }

  // Sanity floor: physics model cannot yield better than 85% of WLTP efficiency.
  // Real-world Quito urban/mountain driving is always harder than test conditions.
  const distanceKm = route.distance / 1000;
  const wltpRange = (vehicleSpecs as any).wltp_range_km || 400;
  const wltpRateWhKm = (vehicleSpecs.usable_battery_kwh * 1000) / wltpRange;
  const wltpMinWh = wltpRateWhKm * distanceKm * 0.85;
  if (totalConsumptionWh < wltpMinWh) {
    totalConsumptionWh = wltpMinWh;
  }

  // 6. Calculate Tranquility Index and Autonomy
  const usableKwhAtStart = vehicleSpecs.usable_battery_kwh * currentSoc;
  const totalConsumptionKwh = totalConsumptionWh / 1000;
  const usableKwhAtEnd = usableKwhAtStart - totalConsumptionKwh;
  
  const arrivalSoc = Math.max(0, usableKwhAtEnd / vehicleSpecs.usable_battery_kwh);
  
  // Margin in Km = (Remaining Energy - Safety Buffer) / Avg Rate
  // avgRateWhKm: use actual (already floored) consumption divided by distance
  let avgRateWhKm = distanceKm > 0 ? totalConsumptionWh / distanceKm : wltpRateWhKm;

  const bufferEnergyKwh = vehicleSpecs.usable_battery_kwh * SAFETY_BUFFER_PERCENT;
  
  const safetyMarginKm = Math.round(((usableKwhAtEnd - bufferEnergyKwh) * 1000) / avgRateWhKm);
  const arrivalRangeKm = Math.round((usableKwhAtEnd * 1000) / avgRateWhKm);

  const mockWeatherCondition = weather?.wind_speed_ms && weather.wind_speed_ms > 10 ? 'Viento en contra' : 'Despejado';

  // 7. Suggest charging stop if battery is insufficient
  let suggestedChargingStop: Charger | null = null;
  if (arrivalSoc < SAFETY_BUFFER_PERCENT) {
    const routeCoords = decodeGeoJSONGeometry(route.geometry);
    const cumDist = buildRouteCumDistances(routeCoords);
    const initialRangeKm = currentSoc * ((vehicleSpecs as any).wltp_range_km || 400);
    suggestedChargingStop = pickBestChargingStop(chargers, routeCoords, cumDist, initialRangeKm);
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
    suggestedChargingStop
  };

  const advisorFeedback = await RouteAdvisorAgent(tempPlan, mockWeatherCondition);
  tempPlan.advisorFeedback = advisorFeedback;

  return tempPlan;
}
