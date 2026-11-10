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
import { fetchAllEcuadorChargers } from '@/lib/services/charging';
import { getPlacesRecommendationsFromGoogle } from '@/lib/services/ecuadorGuideAgent';
import { geocodePlace } from '@/lib/services/mapbox';
import { ECUADOR_ROUTES, CORRIDOR_CHARGERS, isBrandMatch } from '@/lib/data/ecuador-routes';

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
            power: `${match.potencia} kW`,
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

      const filtered = allChargers.filter(c => {
        if (!conn) return true;
        const cType = (c.tipo_cargador || '').toUpperCase();
        if (conn === 'GBT') return cType.includes('GB/T') || cType.includes('GBT');
        if (conn === 'CCS2') return cType.includes('CCS2') || cType.includes('COMBO 2');
        if (conn === 'TYPE2') return cType.includes('TYPE 2') || cType.includes('TIPO 2');
        return true;
      });

      const count = filtered.length;
      const text = sanitizeAcousticText(
        `Se encontraron ${count} puntos de recarga disponibles en la red nacional.`
      );

      return NextResponse.json({
        reply: text,
        chargers: filtered.slice(0, 5).map(c => ({
          name: c.nombre,
          lat: c.location.lat,
          lng: c.location.lng,
          power: `${c.potencia} kW`,
          operator: c.fuente || c.provincia,
          speed: c.velocidad,
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
