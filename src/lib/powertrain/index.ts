/**
 * ChargeWay Powertrain Engineering Core
 * Index & High-Level API Entry Point
 */

export * from './battery-thevenin';
export * from './physics-engine';
export * from './fast-charging-model';
export * from './topography-filter';
export * from './ocpi-types';
export * from './evrp-solver';
export * from './validation-harness';
export * from './telemetry-contract';
export * from './vehicle-adapter';

import {
  MechanicalVehicleSpecs,
  AmbientConditions,
} from './physics-engine';
import {
  generateFilteredMicroSegments,
  GeoPoint3D,
} from './topography-filter';
import {
  solveEvrpDeterministic,
  RouteCandidateStation,
  EvrpSolverOptions,
  DeterministicPlanResult,
} from './evrp-solver';
import { bridgeLegacyChargerToOcpi } from './ocpi-types';

export interface RoutePlanningRequest {
  elevationTrace: GeoPoint3D[];
  candidateChargers: any[];
  vehicle: MechanicalVehicleSpecs;
  ambient: AmbientConditions;
  solverOptions: EvrpSolverOptions;
}

/**
 * High-level deterministic EV route orchestrator.
 * Pure function: No side effects, no AI hallucination, 100% reproducible physics.
 */
export function calculateDeterministicEvRoute(
  request: RoutePlanningRequest
): DeterministicPlanResult {
  const { elevationTrace, candidateChargers, vehicle, ambient, solverOptions } = request;

  // 1. Filter geodesic noise and produce micro-segments
  const microSegments = generateFilteredMicroSegments(elevationTrace, 250);

  // 2. Map and bridge candidate chargers to OCPI standards along route
  const ocpiStations: RouteCandidateStation[] = candidateChargers.map((c, idx) => {
    const ocpi = bridgeLegacyChargerToOcpi(c);
    const routeKm = Number(c.posKm ?? (idx * 50));
    return {
      location: ocpi,
      routeKm,
      detourDistanceKm: Number(c.detourKm ?? 2.0),
      stationSpecs: {
        advertisedMaxKw: Number(c.power_kw ?? c.powerKw ?? 50),
        gridConstrainedMaxKw: ocpi.gridSubstationDroopFactor
          ? Number(c.power_kw ?? 50) * ocpi.gridSubstationDroopFactor
          : undefined,
        efficiencyFactor: 0.94,
      },
    };
  });

  // 3. Solve EVRP-NL with resource constraints
  return solveEvrpDeterministic(
    microSegments,
    ocpiStations,
    vehicle,
    ambient,
    solverOptions
  );
}

