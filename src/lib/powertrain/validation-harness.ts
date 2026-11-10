/**
 * ChargeWay Powertrain Engineering Core
 * Module: Validation Harness & Physical Invariance Test Suite
 * 
 * Formal statistical verification against real-world OBD-II / CAN bus telemetry,
 * and automated invariant checks for thermodynamic consistency.
 */

import {
  MechanicalVehicleSpecs,
  AmbientConditions,
  calculateAirDensity,
} from './physics-engine';
import {
  FilteredMicroSegment,
} from './topography-filter';
import {
  solveEvrpDeterministic,
  DeterministicPlanResult,
} from './evrp-solver';

export interface CanBusTelemetryRecord {
  timestampMs: number;
  cumDistanceKm: number;
  recordedSoc: number;      // 0.0 to 1.0 (BMS reported state of charge)
  packVoltageV?: number;
  packCurrentA?: number;
  packTempC?: number;
}

export interface TelemetryValidationMetrics {
  totalSampleCount: number;
  maePct: number;             // Mean Absolute Error in % (e.g. 1.8%)
  rmsePct: number;            // Root Mean Square Error in %
  maxDeviationPct: number;    // Maximum deviation in %
  finalSocErrorPct: number;   // Error at destination
  passesTargetThreshold: boolean; // MAE <= 2.5%
}

/**
 * Computes formal statistical error metrics comparing simulated SoC against logged OBD-II CAN bus points.
 */
export function validateAgainstCanTelemetry(
  simulation: DeterministicPlanResult,
  telemetry: CanBusTelemetryRecord[]
): TelemetryValidationMetrics {
  if (telemetry.length === 0 || simulation.stateTimeline.length === 0) {
    return {
      totalSampleCount: 0,
      maePct: 0,
      rmsePct: 0,
      maxDeviationPct: 0,
      finalSocErrorPct: 0,
      passesTargetThreshold: false,
    };
  }

  const timeline = simulation.stateTimeline;
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let maxDev = 0;

  for (const record of telemetry) {
    // Find closest spatial point in simulation timeline
    let closestNode = timeline[0];
    let minDistanceDelta = Math.abs(timeline[0].cumDistanceKm - record.cumDistanceKm);

    for (let i = 1; i < timeline.length; i++) {
      const delta = Math.abs(timeline[i].cumDistanceKm - record.cumDistanceKm);
      if (delta < minDistanceDelta) {
        minDistanceDelta = delta;
        closestNode = timeline[i];
      }
    }

    const simSoc = closestNode.soc;
    const realSoc = record.recordedSoc;
    const absDiff = Math.abs(simSoc - realSoc);

    sumAbsError += absDiff;
    sumSquaredError += absDiff * absDiff;
    if (absDiff > maxDev) maxDev = absDiff;
  }

  const count = telemetry.length;
  const mae = sumAbsError / count;
  const rmse = Math.sqrt(sumSquaredError / count);

  const finalSimSoc = timeline[timeline.length - 1].soc;
  const finalRealSoc = telemetry[telemetry.length - 1].recordedSoc;
  const finalError = Math.abs(finalSimSoc - finalRealSoc);

  const maePct = Number((mae * 100).toFixed(2));
  const rmsePct = Number((rmse * 100).toFixed(2));
  const maxDeviationPct = Number((maxDev * 100).toFixed(2));
  const finalSocErrorPct = Number((finalError * 100).toFixed(2));

  return {
    totalSampleCount: count,
    maePct,
    rmsePct,
    maxDeviationPct,
    finalSocErrorPct,
    passesTargetThreshold: maePct <= 2.5,
  };
}

export interface InvarianceTestReport {
  testName: string;
  passed: boolean;
  expectedBehavior: string;
  observedResult: string;
}

/**
 * Runs the physical invariance suite to ensure no violations of thermodynamics or physics laws.
 */
export function runPhysicalInvarianceSuite(sampleVehicle: MechanicalVehicleSpecs): InvarianceTestReport[] {
  const reports: InvarianceTestReport[] = [];

  // TEST 1: High-Altitude Aerodynamic Drag Decay
  // Air density at 2,850m (Quito) should be ~25-28% less than at 0m (Guayaquil)
  const rhoSeaLevel = calculateAirDensity(0, 20);
  const rhoQuito = calculateAirDensity(2850, 20);
  const dragRatio = rhoQuito / rhoSeaLevel;
  const passesAero = dragRatio >= 0.70 && dragRatio <= 0.76;
  reports.push({
    testName: 'High-Altitude Barometric Drag Decay',
    passed: passesAero,
    expectedBehavior: 'Quito air density ratio rho(2850m)/rho(0m) must be within [0.70, 0.76]',
    observedResult: `Ratio: ${dragRatio.toFixed(3)} (${((1 - dragRatio) * 100).toFixed(1)}% drag reduction)`,
  });

  // TEST 2: Closed-Loop Energy Invariance (Second Law of Thermodynamics)
  // An uphill 1000m climb followed by immediate 1000m descent back to start
  // MUST result in net negative battery balance due to drivetrain, rolling and aero losses.
  const uphillSeg: FilteredMicroSegment = {
    index: 0,
    distanceM: 10000,
    cumDistanceKm: 10,
    elevationStartM: 1000,
    elevationEndM: 2000,
    elevationDeltaM: 1000,
    gradePct: 10,
    startCoord: [-78.5, -0.2],
    endCoord: [-78.4, -0.2],
  };
  const downhillSeg: FilteredMicroSegment = {
    index: 1,
    distanceM: 10000,
    cumDistanceKm: 20,
    elevationStartM: 2000,
    elevationEndM: 1000,
    elevationDeltaM: -1000,
    gradePct: -10,
    startCoord: [-78.4, -0.2],
    endCoord: [-78.5, -0.2],
  };

  const defaultAmbient: AmbientConditions = {
    ambientTempC: 18,
    windSpeedMs: 0,
    roadSurface: 'asphalt_smooth',
    isWet: false,
  };

  const loopResult = solveEvrpDeterministic(
    [uphillSeg, downhillSeg],
    [],
    sampleVehicle,
    defaultAmbient,
    { initialSoc: 0.80, minSafetySoc: 0.10, targetArrivalSoc: 0.10 }
  );

  const loopConsumedKwh = loopResult.netEnergyConsumedKwh;
  const passesThermodynamics = loopConsumedKwh > 0;
  reports.push({
    testName: 'Closed-Loop Thermodynamic Loss Invariance',
    passed: passesThermodynamics,
    expectedBehavior: 'Net energy consumed on a closed symmetric elevation loop must be strictly > 0 kWh',
    observedResult: `Net consumption: ${loopConsumedKwh.toFixed(3)} kWh (Losses accounted for)`,
  });

  // TEST 3: High-SoC Descent BMS Overcharge Guard & Mechanical Brake Spillage
  // Descending from Papallacta (3,800m) with initial SoC = 98% must NOT push SoC > 100%
  // Excess energy must be diverted to mechanical brakes (bmsBrakeSpillageKwh > 0).
  const extremeDescentSeg: FilteredMicroSegment = {
    index: 0,
    distanceM: 25000,
    cumDistanceKm: 25,
    elevationStartM: 3800,
    elevationEndM: 1800,
    elevationDeltaM: -2000,
    gradePct: -8,
    startCoord: [-78.2, -0.3],
    endCoord: [-77.9, -0.4],
  };

  const descentResult = solveEvrpDeterministic(
    [extremeDescentSeg],
    [],
    sampleVehicle,
    defaultAmbient,
    { initialSoc: 0.98, minSafetySoc: 0.10, targetArrivalSoc: 0.10 }
  );

  const finalSoc = descentResult.arrivalSoc;
  const spillageKwh = descentResult.thermodynamics.bmsBrakeSpillageKwh;
  const passesOverchargeGuard = finalSoc <= 1.0 && spillageKwh > 1.0;

  reports.push({
    testName: 'High-SoC Descent BMS Overcharge Guard',
    passed: passesOverchargeGuard,
    expectedBehavior: 'Battery starting at 98% in extreme mountain descent must not exceed 100% SoC and must spill kinetic energy into mechanical brakes',
    observedResult: `Final SoC: ${(finalSoc * 100).toFixed(1)}%, Mechanical Brake Spillage: ${spillageKwh.toFixed(2)} kWh`,
  });

  return reports;
}

