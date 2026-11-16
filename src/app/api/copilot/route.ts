/**
 * ChargeWay Cockpit Telematics API Route
 * Capa 2: Deterministic Dialogue Engine, NHTSA-compliant HMI, and Capa 1 Powertrain Integration
 */

import { NextResponse } from 'next/server';
import {
  extractDriverIntentDeterministic,
  transitionDialogueState,
  generateRoutePlanSpokenFeedback,
  generateRangeQuerySpokenFeedback,
  generateTelemetryStatusFeedback,
  resolveCanonicalPlace,
  DialogueSessionContext,
  sanitizeAcousticText,
} from '@/lib/copilot';
import {
  calculateDeterministicEvRoute,
  buildReadOnlyCopilotTelemetry,
  resolveMechanicalVehicleSpecs,
  GeoPoint3D,
} from '@/lib/powertrain';
import { fetchAllEcuadorChargers, isChargerBrandCompatible } from '@/lib/services/charging';
import { getPlacesRecommendationsFromGoogle } from '@/lib/services/ecuadorGuideAgent';
import { geocodePlace } from '@/lib/services/mapbox';
import { ECUADOR_ROUTES, CORRIDOR_CHARGERS, isBrandMatch } from '@/lib/data/ecuador-routes';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatChargerPower(potencia: string | number | undefined): string {
  if (!potencia) return '7 kW';
  const str = String(potencia).trim();
  return str.replace(/\s*kW\s*kW/gi, ' kW').replace(/(\d+)\s*kW/gi, '$1 kW');
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || '').trim();
    const context = body.context || {};

    if (!query) {
      return NextResponse.json({
        reply: 'Por favor, dime a dónde deseas viajar o qué consulta tienes sobre tu vehículo.',
      });
    }

    // 1. Resolve Driver Intent & Slots deterministically (sub-2ms)
    const intent = extractDriverIntentDeterministic(query);

    // 2. Resolve Vehicle Mechanical & Chemical Specs
    const vehicleBrand = context?.vehicleBrand || '';
    const vehicleModel = context?.vehicleModel || '';
    const startingSoc = Number(context?.currentSoC ?? 80);
    const mechSpecs = resolveMechanicalVehicleSpecs(
      vehicleModel,
      vehicleBrand,
      context?.batteryCapacityKwh
    );

    // 3. Dialogue State Tracking
    const currentSession: DialogueSessionContext = {
      state: context?.activeTrip ? 'ROUTE_ACTIVE' : 'IDLE',
      vehicleModel,
      vehicleBrand,
      currentSocPct: startingSoc,
      lastUpdatedTimestamp: Date.now(),
    };
    transitionDialogueState(currentSession, intent);

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLER A: INTENT_PLAN_ROUTE / INTENT_QUERY_RANGE
    // ─────────────────────────────────────────────────────────────────────────
    if (intent.intent === 'INTENT_PLAN_ROUTE' || intent.intent === 'INTENT_QUERY_RANGE') {
      const candidateDest =
        intent.slots.planRoute?.destination ||
        intent.slots.queryRange?.destination ||
        'Guayaquil';
      const isRoundTrip = Boolean(intent.slots.planRoute?.isRoundTrip);

      // Resolve destination coordinates & altitude
      let canonical = resolveCanonicalPlace(candidateDest);
      let destLat = canonical?.lat ?? -2.1894;
      let destLng = canonical?.lng ?? -79.8891;
      let destAlt = canonical?.altitudeM ?? 10;
      let destName = canonical?.name ?? candidateDest;

      if (!canonical) {
        try {
          const geo = await geocodePlace(`${candidateDest}, Ecuador`);
          if (geo) {
            destLat = geo.lat;
            destLng = geo.lng;
            destName = candidateDest;
          }
        } catch (_) {}
      }

      // Origin coordinates (default Quito)
      const originLat = context?.currentCoords ? context.currentCoords[1] : -0.1807;
      const originLng = context?.currentCoords ? context.currentCoords[0] : -78.4678;
      const originAlt = 2850;

      // Construct 3D geometric elevation trace for powertrain solver
      const elevationTrace: GeoPoint3D[] = [
        { lat: originLat, lng: originLng, elevationM: originAlt },
        {
          lat: (originLat + destLat) / 2,
          lng: (originLng + destLng) / 2,
          elevationM: Math.round((originAlt + destAlt) / 2),
        },
        { lat: destLat, lng: destLng, elevationM: destAlt },
      ];

      if (isRoundTrip) {
        elevationTrace.push({
          lat: (originLat + destLat) / 2,
          lng: (originLng + destLng) / 2,
          elevationM: Math.round((originAlt + destAlt) / 2),
        });
        elevationTrace.push({ lat: originLat, lng: originLng, elevationM: originAlt });
      }

      // Fetch candidate chargers in the corridor
      let candidateChargers: any[] = [];
      try {
        const allChargers = await fetchAllEcuadorChargers();
        candidateChargers = allChargers.filter(c => {
          const minLat = Math.min(originLat, destLat) - 0.5;
          const maxLat = Math.max(originLat, destLat) + 0.5;
          const minLng = Math.min(originLng, destLng) - 0.5;
          const maxLng = Math.max(originLng, destLng) + 0.5;
          return (
            c.location.lat >= minLat &&
            c.location.lat <= maxLat &&
            c.location.lng >= minLng &&
            c.location.lng <= maxLng
          );
        });
      } catch (_) {
        const routeMatch = ECUADOR_ROUTES.find(r => r.name.toLowerCase() === destName.toLowerCase());
        candidateChargers = routeMatch?.chargers || CORRIDOR_CHARGERS['costa']?.list || [];
      }

      // Effective initial SoC
      const effectiveInitSoc = (intent.slots.planRoute?.startingSoc ?? intent.slots.queryRange?.currentSoc ?? startingSoc) / 100;

      // 4. Run Deterministic Capa 1 Powertrain Simulation (EVRP-NL)
      const plan = calculateDeterministicEvRoute({
        elevationTrace,
        candidateChargers,
        vehicle: mechSpecs,
        ambient: {
          ambientTempC: context?.ambientTempC ?? 20,
          windSpeedMs: 0,
          roadSurface: 'asphalt_smooth',
          isWet: false,
        },
        solverOptions: {
          initialSoc: effectiveInitSoc,
          minSafetySoc: 0.12,
          targetArrivalSoc: 0.15,
        },
      });

      // 5. Build Invariant Read-Only Telemetry Contract
      const telemetryView = buildReadOnlyCopilotTelemetry(plan);

      // 6. Generate Acoustic Spoken Feedback (NHTSA < 20 words, zero markdown)
      const spoken = intent.intent === 'INTENT_PLAN_ROUTE'
        ? generateRoutePlanSpokenFeedback(destName, telemetryView)
        : generateRangeQuerySpokenFeedback(destName, telemetryView);

      // Map interactive chargers for frontend UI cards
      const returnChargers = plan.chargingStops.map(stop => ({
        name: stop.station.name,
        lat: stop.station.coordinates.latitude,
        lng: stop.station.coordinates.longitude,
        power: `${stop.station.evses[0]?.connectors[0]?.maxElectricPowerKw || 50} kW`,
        speed: 'Rápida',
        operator: stop.station.operatorName,
        isBrandMatch: isBrandMatch(stop.station, vehicleBrand),
        isNecessaryStop: true,
        kwhToCharge: stop.energyChargedKwh,
        estMinutes: stop.chargingTimeMinutes,
        posKm: stop.routeKm,
      }));

      return NextResponse.json({
        reply: spoken.textToSpeak,
        destination: {
          name: destName,
          lat: destLat,
          lng: destLng,
          distKm: Math.round(plan.totalDistanceKm),
          isRoundTrip,
        },
        chargers: returnChargers.length > 0 ? returnChargers : undefined,
        action: 'plan_route',
        actionPayload: {
          arrivalSocPct: telemetryView.socTimelineSummary.arrivalSocPct,
          totalDriveMinutes: plan.totalDriveTimeMinutes,
          totalChargeMinutes: plan.totalChargeTimeMinutes,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLER B: INTENT_QUERY_VEHICLE_TELEMETRY
    // ─────────────────────────────────────────────────────────────────────────
    if (intent.intent === 'INTENT_QUERY_VEHICLE_TELEMETRY') {
      const spoken = generateTelemetryStatusFeedback(startingSoc, vehicleModel);
      return NextResponse.json({
        reply: spoken.textToSpeak,
        actionPayload: {
          currentSocPct: startingSoc,
          batteryChemistry: mechSpecs.battery.chemistry,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLER C: INTENT_ABORT_NAVIGATION
    // ─────────────────────────────────────────────────────────────────────────
    if (intent.intent === 'INTENT_ABORT_NAVIGATION') {
      return NextResponse.json({
        reply: 'Navegación y guía de ruta canceladas.',
        action: 'remove_waypoint',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLER D: INTENT_ADD_RECHARGE_STOP
    // ─────────────────────────────────────────────────────────────────────────
    if (intent.intent === 'INTENT_ADD_RECHARGE_STOP') {
      const stopTarget = intent.slots.addStop?.stationNameOrId || 'estación de recarga';
      const allChargers = await fetchAllEcuadorChargers().catch(() => []);
      const match = allChargers.find(c =>
        c.nombre.toLowerCase().includes(stopTarget.toLowerCase()) ||
        stopTarget.toLowerCase().includes(c.nombre.toLowerCase())
      ) || allChargers[0];

      if (match) {
        const text = sanitizeAcousticText(`Parada en ${match.nombre} agregada a tu itinerario.`);
        return NextResponse.json({
          reply: text,
          action: 'add_waypoint',
          waypoint: {
            name: match.nombre,
            lat: match.location.lat,
            lng: match.location.lng,
            power: formatChargerPower(match.potencia),
          },
        });
      }

      return NextResponse.json({
        reply: 'No se encontró la estación solicitada cerca de tu ruta activa.',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLER E: INTENT_QUERY_CHARGING_NETWORK
    // ─────────────────────────────────────────────────────────────────────────
    if (intent.intent === 'INTENT_QUERY_CHARGING_NETWORK') {
      const allChargers = await fetchAllEcuadorChargers().catch(() => []);
      const conn = intent.slots.chargingNetwork?.connectorType;
      const targetLoc = intent.slots.chargingNetwork?.location;

      // 1. Determine reference center (target location, current location, or active trip origin)
      let refLat = -0.1807;
      let refLng = -78.4678;
      let locationLabel = '';

      if (targetLoc) {
        const canonical = resolveCanonicalPlace(targetLoc);
        if (canonical) {
          refLat = canonical.lat;
          refLng = canonical.lng;
          locationLabel = ` en ${canonical.name}`;
        }
      } else if (context?.currentCoords && Array.isArray(context.currentCoords) && context.currentCoords.length >= 2) {
        refLng = context.currentCoords[0];
        refLat = context.currentCoords[1];
      } else if (context?.activeTrip?.originLat && context?.activeTrip?.originLng) {
        refLat = context.activeTrip.originLat;
        refLng = context.activeTrip.originLng;
      }

      // 2. Filter chargers by connector, power speed, and brand compatibility
      const filtered = allChargers.filter(c => {
        if (conn) {
          const cType = (c.tipo_cargador || '').toUpperCase();
          if (conn === 'GBT' && !(cType.includes('GB/T') || cType.includes('GBT'))) return false;
          if (conn === 'CCS2' && !(cType.includes('CCS2') || cType.includes('COMBO 2'))) return false;
          if (conn === 'TYPE2' && !(cType.includes('TYPE 2') || cType.includes('TIPO 2'))) return false;
        }

        if (intent.slots.chargingNetwork?.fastOnly) {
          const isFast = (c.velocidad || '').toLowerCase().includes('rápida') ||
                         (c.velocidad || '').toLowerCase().includes('rapida') ||
                         /\b([5-9]\d|[1-9]\d{2,})\s*kw/i.test(c.potencia || '');
          if (!isFast) return false;
        }

        if (vehicleBrand && !isChargerBrandCompatible(c, vehicleBrand)) {
          return false;
        }

        return true;
      });

      // 3. Compute real distance and sort strictly by proximity to user / reference point
      const withDistance = filtered.map(c => {
        const distKm = haversineKm(refLat, refLng, c.location.lat, c.location.lng);
        return {
          ...c,
          distKm: Math.round(distKm * 10) / 10,
        };
      });

      withDistance.sort((a, b) => a.distKm - b.distKm);

      const top5 = withDistance.slice(0, 5);

      // 4. Concise acoustic spoken feedback (< 20 words, NHTSA standard)
      let replyText = '';
      if (top5.length > 0) {
        const closestKm = top5[0].distKm;
        const firstName = top5[0].nombre;
        replyText = sanitizeAcousticText(
          `Cerca de tu ubicación${locationLabel} encontré ${top5.length} estaciones, la más próxima a ${closestKm} kilómetros en ${firstName}.`
        );
      } else {
        replyText = sanitizeAcousticText(
          `No se encontraron estaciones compatibles disponibles${locationLabel}.`
        );
      }

      return NextResponse.json({
        reply: replyText,
        chargers: top5.map(c => ({
          name: c.nombre,
          lat: c.location.lat,
          lng: c.location.lng,
          power: formatChargerPower(c.potencia),
          operator: c.fuente || c.provincia,
          speed: c.velocidad,
          distKm: c.distKm,
          isBrandMatch: isChargerBrandCompatible(c, vehicleBrand),
        })),
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLER F: GENERAL TOURISM / PLACES AMENITIES
    // ─────────────────────────────────────────────────────────────────────────
    if (query.toLowerCase().includes('comer') || query.toLowerCase().includes('hotel') || query.toLowerCase().includes('restaurante')) {
      const places = await getPlacesRecommendationsFromGoogle(
        { lat: -0.1807, lng: -78.4678 },
        'restaurant'
      ).catch(() => []);

      if (places.length > 0) {
        const topPlace = places[0];
        const text = sanitizeAcousticText(`Cerca de tu ubicación destaca ${topPlace.name}.`);
        return NextResponse.json({
          reply: text,
          places,
        });
      }
    }

    // Fallback acústico conciso
    return NextResponse.json({
      reply: 'Comando recibido. Telemetría y monitoreo de ruta activos.',
    });
  } catch (error) {
    console.error('Error in Copilot Engine:', error);
    return NextResponse.json({
      reply: 'Error de procesamiento. Telemetría operando en modo local.',
    });
  }
}
