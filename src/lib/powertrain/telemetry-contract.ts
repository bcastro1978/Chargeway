/**
 * ChargeWay Powertrain Engineering Core
 * Module: Read-Only Copilot Telemetry Contract & Safety Guard
 * 
 * Enforces an architectural boundary: Conversational AI and user interfaces
 * are STRICT CONSUMERS of deterministic powertrain telemetry.
 * The LLM is completely stripped of authority to calculate or speculate on range,
 * battery SoC, or charging stops.
 */

import { DeterministicPlanResult, OptimalChargingDecision } from './evrp-solver';

export interface ReadOnlyCopilotTelemetryView {
  isFeasible: boolean;
  feasibilityNotice: string;
  socTimelineSummary: {
    startSocPct: number;
    arrivalSocPct: number;
    lowestSocPct: number;
    lowestSocLocationKm: number;
  };
  totalJourney: {
    distanceKm: number;
    driveMinutes: number;
    chargeMinutes: number;
    totalMinutes: number;
  };
  energyBalance: {
    totalConsumedKwh: number;
    regeneratedKwh: number;
    bmsBrakeSpillageKwh: number;
    hvacDrainKwh: number;
  };
  mandatoryStops: Array<{
    stationName: string;
    routeKm: number;
    arrivalSocPct: number;
    departureSocPct: number;
    recommendedMinutes: number;
    energyAddedKwh: number;
    reason: string;
  }>;
}

/**
 * Creates an immutable, simplified telemetry view for LLM context injection.
 * Prevents hallucinations by transforming complex physics state spaces into factual assertions.
 */
export function buildReadOnlyCopilotTelemetry(
  plan: DeterministicPlanResult
): ReadOnlyCopilotTelemetryView {
  let lowestSoc = 1.0;
  let lowestSocKm = 0;

  for (const node of plan.stateTimeline) {
    if (node.soc < lowestSoc) {
      lowestSoc = node.soc;
      lowestSocKm = node.cumDistanceKm;
    }
  }

  const startSoc = plan.stateTimeline.length > 0 ? plan.stateTimeline[0].soc : 0;

  return {
    isFeasible: plan.isFeasible,
    feasibilityNotice: plan.isFeasible
      ? 'Ruta energéticamente viable cumpliendo con los márgenes de seguridad de batería.'
      : `ALERTA CRÍTICA: ${plan.feasibilityFailureReason ?? 'Batería insuficiente para completar la ruta sin recarga adicional.'}`,
    socTimelineSummary: {
      startSocPct: Number((startSoc * 100).toFixed(1)),
      arrivalSocPct: Number((plan.arrivalSoc * 100).toFixed(1)),
      lowestSocPct: Number((lowestSoc * 100).toFixed(1)),
      lowestSocLocationKm: Number(lowestSocKm.toFixed(1)),
    },
    totalJourney: {
      distanceKm: plan.totalDistanceKm,
      driveMinutes: plan.totalDriveTimeMinutes,
      chargeMinutes: plan.totalChargeTimeMinutes,
      totalMinutes: plan.totalJourneyTimeMinutes,
    },
    energyBalance: {
      totalConsumedKwh: plan.netEnergyConsumedKwh,
      regeneratedKwh: plan.thermodynamics.regenRecoveredKwh,
      bmsBrakeSpillageKwh: plan.thermodynamics.bmsBrakeSpillageKwh,
      hvacDrainKwh: plan.thermodynamics.auxiliaryHvacKwh,
    },
    mandatoryStops: plan.chargingStops.map((stop: OptimalChargingDecision) => ({
      stationName: stop.station.name,
      routeKm: stop.routeKm,
      arrivalSocPct: Number((stop.arrivalSoc * 100).toFixed(1)),
      departureSocPct: Number((stop.departureSoc * 100).toFixed(1)),
      recommendedMinutes: stop.chargingTimeMinutes,
      energyAddedKwh: stop.energyChargedKwh,
      reason: stop.reason,
    })),
  };
}

