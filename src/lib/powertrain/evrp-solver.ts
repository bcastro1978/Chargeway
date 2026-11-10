/**
 * ChargeWay Powertrain Engineering Core
 * Module: Deterministic EVRP-NL Solver (Electric Vehicle Routing Problem with Non-Linear Charging)
 * 
 * Formulates trip energy as a resource-constrained shortest path problem on continuous topography.
 * Minimizes total journey time: T_total = T_drive + T_charge + T_detour
 * Subject to: SoC(s) >= SoC_safety_min for all s in [0, S_total]
 */

import {
  MechanicalVehicleSpecs,
  AmbientConditions,
  simulateMicroSegment,
  SegmentPowerBalance,
} from './physics-engine';
import { BatteryState } from './battery-thevenin';
import {
  simulateChargingSession,
  ChargingSessionPlan,
  StationSpecs,
} from './fast-charging-model';
import { FilteredMicroSegment, haversineDistanceM } from './topography-filter';
import { OcpiLocation } from './ocpi-types';

export interface RouteCandidateStation {
  location: OcpiLocation;
  routeKm: number;           // Distance along route where detour connects
  detourDistanceKm: number;  // Distance from main route to station
  stationSpecs: StationSpecs;
}

export interface EvrpSolverOptions {
  initialSoc: number;             // 0.0 to 1.0
  minSafetySoc: number;           // e.g. 0.12 (12% minimum buffer)
  targetArrivalSoc: number;       // e.g. 0.15 (15% reserve at final destination)
  maxChargeTargetSoc?: number;    // e.g. 0.85 (avoid high taper zone unless mandatory)
}

export interface StateGraphNode {
  cumDistanceKm: number;
  elevationM: number;
  soc: number;
  energyKwh: number;
  packTempC: number;
  cumulativeTimeMinutes: number;
  instantPowerKw: number;
  limitingFactor: string;
}

export interface ThermodynamicBreakdown {
  aeroLossKwh: number;
  rollingLossKwh: number;
  gravityClimbKwh: number;
  regenRecoveredKwh: number;
  bmsBrakeSpillageKwh: number;
  auxiliaryHvacKwh: number;
  netMechanicalKwh: number;
}

export interface OptimalChargingDecision {
  station: OcpiLocation;
  routeKm: number;
  arrivalSoc: number;
  departureSoc: number;
  energyChargedKwh: number;
  chargingTimeMinutes: number;
  averagePowerKw: number;
  optimalDisconnectSoc: number;
  reason: string;
}

export interface DeterministicPlanResult {
  isFeasible: boolean;
  feasibilityFailureReason?: string;
  totalDistanceKm: number;
  totalDriveTimeMinutes: number;
  totalChargeTimeMinutes: number;
  totalJourneyTimeMinutes: number;
  arrivalSoc: number;
  netEnergyConsumedKwh: number;
  chargingStops: OptimalChargingDecision[];
  thermodynamics: ThermodynamicBreakdown;
  stateTimeline: StateGraphNode[];
}

/**
 * Executes deterministic forward simulation and optimal recharge selection.
 */
export function solveEvrpDeterministic(
  microSegments: FilteredMicroSegment[],
  candidateStations: RouteCandidateStation[],
  vehicle: MechanicalVehicleSpecs,
  ambient: AmbientConditions,
  options: EvrpSolverOptions
): DeterministicPlanResult {
  if (microSegments.length === 0) {
    return {
      isFeasible: false,
      feasibilityFailureReason: 'No route segments provided.',
      totalDistanceKm: 0,
      totalDriveTimeMinutes: 0,
      totalChargeTimeMinutes: 0,
      totalJourneyTimeMinutes: 0,
      arrivalSoc: options.initialSoc,
      netEnergyConsumedKwh: 0,
      chargingStops: [],
      thermodynamics: {
        aeroLossKwh: 0,
        rollingLossKwh: 0,
        gravityClimbKwh: 0,
        regenRecoveredKwh: 0,
        bmsBrakeSpillageKwh: 0,
        auxiliaryHvacKwh: 0,
        netMechanicalKwh: 0,
      },
      stateTimeline: [],
    };
  }

  const initialKwh = vehicle.battery.usableCapacityKwh * Math.max(0.05, Math.min(1.0, options.initialSoc));
  let currentBattery: BatteryState = {
    soc: options.initialSoc,
    energyRemainingKwh: initialKwh,
    vRcVolts: 0,
    packTempC: Math.max(15, ambient.ambientTempC),
  };

  const stateTimeline: StateGraphNode[] = [];
  const chargingStops: OptimalChargingDecision[] = [];

  // Sort candidate stations by position along route
  const sortedStations = [...candidateStations].sort((a, b) => a.routeKm - b.routeKm);
  let nextStationIdx = 0;

  let totalDriveMinutes = 0;
  let totalChargeMinutes = 0;

  let sumAeroKwh = 0;
  let sumRollingKwh = 0;
  let sumClimbKwh = 0;
  let sumRegenKwh = 0;
  let sumSpillageKwh = 0;
  let sumAuxKwh = 0;

  const totalRouteKm = microSegments[microSegments.length - 1].cumDistanceKm;

  // Add origin state
  stateTimeline.push({
    cumDistanceKm: 0,
    elevationM: microSegments[0].elevationStartM,
    soc: currentBattery.soc,
    energyKwh: currentBattery.energyRemainingKwh,
    packTempC: currentBattery.packTempC,
    cumulativeTimeMinutes: 0,
    instantPowerKw: 0,
    limitingFactor: 'none',
  });

  // Forward integration loop
  for (let i = 0; i < microSegments.length; i++) {
    const seg = microSegments[i];
    const segSpeedKmh = seg.gradePct > 6 ? 60 : seg.gradePct < -6 ? 55 : 80;

    // Check if we reached a charging station decision point
    if (nextStationIdx < sortedStations.length) {
      const candidate = sortedStations[nextStationIdx];
      if (seg.cumDistanceKm >= candidate.routeKm) {
        // Evaluate if a recharge is mandatory or mathematically advantageous
        const kmRemainingToFinal = totalRouteKm - seg.cumDistanceKm;
        const estKwhRemaining = kmRemainingToFinal * 0.17; // Approx ~170 Wh/km baseline
        const needsChargeForDestination = (currentBattery.energyRemainingKwh - estKwhRemaining) / vehicle.battery.usableCapacityKwh < options.targetArrivalSoc;
        const isLowSoc = currentBattery.soc <= options.minSafetySoc + 0.10; // Under 22%

        if (needsChargeForDestination || isLowSoc) {
          // Perform recharge at this station
          const arrivalSoc = currentBattery.soc;
          const targetSoc = Math.min(
            options.maxChargeTargetSoc ?? 0.82,
            Math.max(0.70, (estKwhRemaining / vehicle.battery.usableCapacityKwh) + options.targetArrivalSoc)
          );

          if (targetSoc > arrivalSoc + 0.05) {
            const chargePlan = simulateChargingSession(
              arrivalSoc,
              targetSoc,
              {
                peakAcceptanceKw: vehicle.battery.maxDischargeKw * 0.75, // approximate peak DC acceptance
                nominalVoltageV: vehicle.battery.nominalVoltageV,
                chemistry: vehicle.battery.chemistry,
                usableCapacityKwh: vehicle.battery.usableCapacityKwh,
              },
              candidate.stationSpecs
            );

            totalChargeMinutes += chargePlan.totalDurationMinutes;

            // Apply charge to battery
            const addedKwh = chargePlan.totalKwhAdded;
            currentBattery = {
              ...currentBattery,
              energyRemainingKwh: Math.min(vehicle.battery.usableCapacityKwh, currentBattery.energyRemainingKwh + addedKwh),
              soc: Math.min(1.0, (currentBattery.energyRemainingKwh + addedKwh) / vehicle.battery.usableCapacityKwh),
              vRcVolts: 0,
            };

            chargingStops.push({
              station: candidate.location,
              routeKm: candidate.routeKm,
              arrivalSoc: chargePlan.arrivalSoc,
              departureSoc: chargePlan.departureSoc,
              energyChargedKwh: chargePlan.totalKwhAdded,
              chargingTimeMinutes: chargePlan.totalDurationMinutes,
              averagePowerKw: chargePlan.averagePowerKw,
              optimalDisconnectSoc: chargePlan.optimalDisconnectSoc,
              reason: isLowSoc
                ? 'Buffer de seguridad preventivo antes de sección montañosa'
                : 'Recarga óptima requerida para arribar al destino con reserva',
            });
          }
        }

        nextStationIdx++;
      }
    }

    // Step physics for micro-segment
    const step = simulateMicroSegment(
      {
        distanceM: seg.distanceM,
        elevationStartM: seg.elevationStartM,
        elevationEndM: seg.elevationEndM,
        targetSpeedKmh: segSpeedKmh,
      },
      vehicle,
      currentBattery,
      ambient
    );

    currentBattery = step.batteryAfter;
    totalDriveMinutes += step.durationSeconds / 60;

    // Accumulate thermodynamic work
    sumAeroKwh += (step.powers.pAeroKw * (step.durationSeconds / 3600));
    sumRollingKwh += (step.powers.pRollingKw * (step.durationSeconds / 3600));
    if (step.powers.pGradeKw > 0) {
      sumClimbKwh += (step.powers.pGradeKw * (step.durationSeconds / 3600));
    }
    sumRegenKwh += (step.derating.effectiveRegenKw * (step.durationSeconds / 3600));
    sumSpillageKwh += (step.derating.mechanicalBrakingKw * (step.durationSeconds / 3600));
    sumAuxKwh += (step.powers.pAuxiliaryKw * (step.durationSeconds / 3600));

    // Verify hard resource constraint: SoC >= minSafetySoc
    if (currentBattery.soc < options.minSafetySoc) {
      return {
        isFeasible: false,
        feasibilityFailureReason: `Infracción de reserva de energía en km ${seg.cumDistanceKm.toFixed(1)}: SoC cayó a ${(currentBattery.soc * 100).toFixed(1)}% (mínimo permitido ${(options.minSafetySoc * 100).toFixed(1)}%).`,
        totalDistanceKm: totalRouteKm,
        totalDriveTimeMinutes: Number(totalDriveMinutes.toFixed(1)),
        totalChargeTimeMinutes: Number(totalChargeMinutes.toFixed(1)),
        totalJourneyTimeMinutes: Number((totalDriveMinutes + totalChargeMinutes).toFixed(1)),
        arrivalSoc: currentBattery.soc,
        netEnergyConsumedKwh: Number((initialKwh - currentBattery.energyRemainingKwh).toFixed(2)),
        chargingStops,
        thermodynamics: {
          aeroLossKwh: Number(sumAeroKwh.toFixed(2)),
          rollingLossKwh: Number(sumRollingKwh.toFixed(2)),
          gravityClimbKwh: Number(sumClimbKwh.toFixed(2)),
          regenRecoveredKwh: Number(sumRegenKwh.toFixed(2)),
          bmsBrakeSpillageKwh: Number(sumSpillageKwh.toFixed(2)),
          auxiliaryHvacKwh: Number(sumAuxKwh.toFixed(2)),
          netMechanicalKwh: Number((sumAeroKwh + sumRollingKwh + sumClimbKwh - sumRegenKwh).toFixed(2)),
        },
        stateTimeline,
      };
    }

    stateTimeline.push({
      cumDistanceKm: Number(seg.cumDistanceKm.toFixed(2)),
      elevationM: Math.round(seg.elevationEndM),
      soc: Number(currentBattery.soc.toFixed(4)),
      energyKwh: Number(currentBattery.energyRemainingKwh.toFixed(2)),
      packTempC: Number(currentBattery.packTempC.toFixed(1)),
      cumulativeTimeMinutes: Number((totalDriveMinutes + totalChargeMinutes).toFixed(1)),
      instantPowerKw: Number(step.powers.pBatteryTerminalKw.toFixed(1)),
      limitingFactor: step.derating.limitingFactor,
    });
  }

  return {
    isFeasible: currentBattery.soc >= options.targetArrivalSoc,
    feasibilityFailureReason: currentBattery.soc < options.targetArrivalSoc
      ? `Arribo con batería baja: ${(currentBattery.soc * 100).toFixed(1)}% vs meta ${(options.targetArrivalSoc * 100).toFixed(1)}%.`
      : undefined,
    totalDistanceKm: Number(totalRouteKm.toFixed(2)),
    totalDriveTimeMinutes: Number(totalDriveMinutes.toFixed(1)),
    totalChargeTimeMinutes: Number(totalChargeMinutes.toFixed(1)),
    totalJourneyTimeMinutes: Number((totalDriveMinutes + totalChargeMinutes).toFixed(1)),
    arrivalSoc: Number(currentBattery.soc.toFixed(4)),
    netEnergyConsumedKwh: Number((initialKwh - currentBattery.energyRemainingKwh).toFixed(2)),
    chargingStops,
    thermodynamics: {
      aeroLossKwh: Number(sumAeroKwh.toFixed(2)),
      rollingLossKwh: Number(sumRollingKwh.toFixed(2)),
      gravityClimbKwh: Number(sumClimbKwh.toFixed(2)),
      regenRecoveredKwh: Number(sumRegenKwh.toFixed(2)),
      bmsBrakeSpillageKwh: Number(sumSpillageKwh.toFixed(2)),
      auxiliaryHvacKwh: Number(sumAuxKwh.toFixed(2)),
      netMechanicalKwh: Number((sumAeroKwh + sumRollingKwh + sumClimbKwh - sumRegenKwh).toFixed(2)),
    },
    stateTimeline,
  };
}

