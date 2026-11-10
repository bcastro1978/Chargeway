/**
 * ChargeWay Powertrain Engineering Core
 * Module: Non-Linear CC-CV Fast Charging Curves & Optimal Disconnect Finder
 * 
 * Accurately models charging power degradation (tapering) as cell terminal voltage hits V_max.
 */

import { CellChemistry } from './battery-thevenin';

export interface FastChargingProfile {
  peakAcceptanceKw: number;
  nominalVoltageV: number;
  chemistry: CellChemistry;
  usableCapacityKwh: number;
}

export interface StationSpecs {
  advertisedMaxKw: number;
  gridConstrainedMaxKw?: number; // Grid drop compensation (common in rural Ecuador)
  efficiencyFactor: number;      // Inverter / cable AC/DC loss ~ 0.94 - 0.96
}

export interface ChargingStepResult {
  socFrom: number;
  socTo: number;
  effectivePowerKw: number;
  durationMinutes: number;
  kwhDelivered: number;
}

export interface ChargingSessionPlan {
  totalDurationMinutes: number;
  totalKwhAdded: number;
  arrivalSoc: number;
  departureSoc: number;
  averagePowerKw: number;
  optimalDisconnectSoc: number;
  timeline: Array<{ minute: number; soc: number; powerKw: number }>;
}

/**
 * Returns instantaneous DC power acceptance at a given SoC.
 * Reflects CC (Constant Current) flat zone transitioning to CV (Constant Voltage) exponential taper.
 */
export function getInstantaneousChargePowerKw(
  soc: number,
  vehicle: FastChargingProfile,
  station: StationSpecs
): number {
  const clampedSoc = Math.max(0, Math.min(1, soc));
  const maxAvailableKw = Math.min(
    vehicle.peakAcceptanceKw,
    station.gridConstrainedMaxKw ?? station.advertisedMaxKw
  );

  let vehicleAcceptanceFactor = 1.0;

  if (vehicle.chemistry === 'LFP') {
    // LFP: High acceptance up to ~65%, then gradual taper, severe drop after 85%
    if (clampedSoc <= 0.65) {
      vehicleAcceptanceFactor = 1.0;
    } else if (clampedSoc <= 0.85) {
      // Linear decrease from 1.0 down to 0.50
      vehicleAcceptanceFactor = 1.0 - ((clampedSoc - 0.65) / 0.20) * 0.50;
    } else {
      // Cell balancing & overvoltage guard: steep drop from 0.50 down to 0.12
      vehicleAcceptanceFactor = 0.50 - ((clampedSoc - 0.85) / 0.15) * 0.38;
    }
  } else {
    // NMC / NCA: Gradual taper starting earlier around 55%
    if (clampedSoc <= 0.55) {
      vehicleAcceptanceFactor = 1.0;
    } else if (clampedSoc <= 0.80) {
      // Linear taper from 1.0 down to 0.55
      vehicleAcceptanceFactor = 1.0 - ((clampedSoc - 0.55) / 0.25) * 0.45;
    } else {
      // Deep taper down to 0.15
      vehicleAcceptanceFactor = 0.55 - ((clampedSoc - 0.80) / 0.20) * 0.40;
    }
  }

  // Pre-conditioning factor (cold battery at SoC < 0.10 has slightly lower acceptance)
  if (clampedSoc < 0.10) {
    vehicleAcceptanceFactor *= 0.85 + (clampedSoc / 0.10) * 0.15;
  }

  const rawPowerKw = maxAvailableKw * Math.max(0.10, vehicleAcceptanceFactor);
  return rawPowerKw * station.efficiencyFactor;
}

/**
 * Numerically integrates the charging session in micro-intervals.
 */
export function simulateChargingSession(
  arrivalSoc: number,
  targetSoc: number,
  vehicle: FastChargingProfile,
  station: StationSpecs,
  stepDeltaSoc: number = 0.01
): ChargingSessionPlan {
  const startSoc = Math.max(0, Math.min(1, arrivalSoc));
  const endSoc = Math.max(startSoc, Math.min(1, targetSoc));

  if (startSoc >= endSoc) {
    return {
      totalDurationMinutes: 0,
      totalKwhAdded: 0,
      arrivalSoc: startSoc,
      departureSoc: startSoc,
      averagePowerKw: 0,
      optimalDisconnectSoc: startSoc,
      timeline: [{ minute: 0, soc: startSoc, powerKw: 0 }],
    };
  }

  let cumulativeMinutes = 0;
  let totalKwhAdded = 0;
  let currSoc = startSoc;
  const timeline: Array<{ minute: number; soc: number; powerKw: number }> = [];

  timeline.push({
    minute: 0,
    soc: currSoc,
    powerKw: getInstantaneousChargePowerKw(currSoc, vehicle, station),
  });

  // Disconnect inflection finder: track marginal charging speed (kWh per minute)
  // Optimal disconnect is where charging power drops below 40% of peak, typically 78-82%
  let optimalDisconnectSoc = 0.80;
  let foundInflection = false;

  while (currSoc < endSoc) {
    const nextSoc = Math.min(endSoc, currSoc + stepDeltaSoc);
    const midSoc = (currSoc + nextSoc) / 2;
    const powerKw = getInstantaneousChargePowerKw(midSoc, vehicle, station);

    const deltaSoc = nextSoc - currSoc;
    const deltaKwh = deltaSoc * vehicle.usableCapacityKwh;
    // t (hours) = deltaKwh / powerKw
    const deltaMinutes = (deltaKwh / Math.max(1, powerKw)) * 60;

    cumulativeMinutes += deltaMinutes;
    totalKwhAdded += deltaKwh;
    currSoc = nextSoc;

    if (!foundInflection && powerKw < 0.45 * (vehicle.peakAcceptanceKw * station.efficiencyFactor)) {
      optimalDisconnectSoc = Number(currSoc.toFixed(2));
      foundInflection = true;
    }

    timeline.push({
      minute: Number(cumulativeMinutes.toFixed(1)),
      soc: Number(currSoc.toFixed(3)),
      powerKw: Number(powerKw.toFixed(1)),
    });
  }

  return {
    totalDurationMinutes: Number(cumulativeMinutes.toFixed(1)),
    totalKwhAdded: Number(totalKwhAdded.toFixed(2)),
    arrivalSoc: Number(startSoc.toFixed(3)),
    departureSoc: Number(endSoc.toFixed(3)),
    averagePowerKw: cumulativeMinutes > 0 ? Number(((totalKwhAdded / (cumulativeMinutes / 60))).toFixed(1)) : 0,
    optimalDisconnectSoc,
    timeline,
  };
}

