/**
 * REALTIME ENERGY & AUTONOMY CALCULATOR
 * Recalculates projected arrival battery SOC and remaining autonomy (km)
 * based on actual live driving speed (GPS telemetry).
 */

import { VehicleSpecs } from './energy-core';

export interface DynamicArrivalEstimation {
  estimatedArrivalSoc: number; // 0.0 to 1.0 (e.g. 0.38 for 38%)
  estimatedArrivalRangeKm: number; // remaining autonomy at destination
  consumptionRateWhKm: number; // Wh/km rate under current speed
  speedEfficiencyRatio: number; // ratio vs planned base speed (>1 means higher consumption)
  statusTag: 'optimal' | 'moderate' | 'high_consumption' | 'critical';
  statusMessage: string;
}

const G = 9.81;
const CRR_DRY = 0.012;

function airDensity(altitudeM: number): number {
  return 1.225 * Math.pow(1 - 2.2558e-5 * Math.max(0, altitudeM), 5.2559);
}

/**
 * Calculates Wh/km for a specific vehicle driving at a specific constant speed.
 */
export function calculateSpeedConsumptionRate(
  specs: VehicleSpecs,
  speedKmH: number,
  altitudeM: number = 2800
): number {
  const speedMS = Math.max(speedKmH, 5) / 3.6; // floor at 5 km/h to avoid divide-by-zero
  const rhoAir = airDensity(altitudeM);

  // Aerodynamic force: F_aero = 0.5 * rho * Cd * A * v^2
  const forceAero = 0.5 * rhoAir * specs.drag_coefficient * specs.frontal_area_m2 * Math.pow(speedMS, 2);

  // Rolling resistance force: F_rolling = Crr * m * g
  const forceRolling = CRR_DRY * specs.weight_kg * G;

  const DRIVETRAIN_EFFICIENCY = 0.85;

  // Work per meter (J/m) = Force (N)
  const workPerMeter = forceAero + forceRolling;
  // Energy per meter in Wh/m = J/m / 3600
  // Energy per km in Wh/km = Wh/m * 1000 = (J/m / 3.6) / Drivetrain Efficiency
  const propWhKm = (workPerMeter / 3.6) / DRIVETRAIN_EFFICIENCY;

  // Auxiliary load: 750W / speed_ms = aux energy per meter
  // aux Wh/km = (750W / (speedMS * 3.6)) * 1000 = 750 / speedKmH
  const auxWhKm = (750 / Math.max(speedKmH, 10));

  return propWhKm + auxWhKm;
}

/**
 * Recalculates arrival state based on current live GPS speed.
 */
export function calculateDynamicArrival(
  specs: VehicleSpecs,
  startSoc: number,
  totalDistanceKm: number,
  currentDistanceKm: number,
  realtimeSpeedKmH: number,
  basePlannedRateWhKm: number = 160
): DynamicArrivalEstimation {
  // Ensure startSoc is normalized to a fraction (0.05 to 1.0)
  const normalizedStartSoc = startSoc > 1.0 ? startSoc / 100 : Math.max(0.05, startSoc);

  // Reference baseline rate at average route speed (~65 km/h)
  const baselineRateAt65 = calculateSpeedConsumptionRate(specs, 65);
  
  // Calculate live Wh/km rate under current speed (clamped between 20 and 130 km/h to avoid low-speed aux skew)
  const activeSpeedKmH = Math.min(130, Math.max(20, realtimeSpeedKmH > 0 ? realtimeSpeedKmH : 65));
  const liveSpeedRate = calculateSpeedConsumptionRate(specs, activeSpeedKmH);

  // Speed multiplier relative to reference driving speed (bounded between 0.85 and 1.35)
  const rawRatio = liveSpeedRate / baselineRateAt65;
  const speedEfficiencyRatio = Math.min(1.35, Math.max(0.85, rawRatio));

  // Effective consumption rate per km for remaining distance
  const liveWhKm = basePlannedRateWhKm * speedEfficiencyRatio;

  // Total projected energy: driven distance at planned rate + remaining distance at live speed rate
  const remainingDistKm = Math.max(0, totalDistanceKm - currentDistanceKm);
  const remainingEnergyKwh = (remainingDistKm * liveWhKm) / 1000;
  const consumedEnergyKwh = (currentDistanceKm * basePlannedRateWhKm) / 1000;
  const totalTripEnergyKwh = consumedEnergyKwh + remainingEnergyKwh;

  const startEnergyKwh = normalizedStartSoc * specs.usable_battery_kwh;
  const arrivalEnergyKwh = Math.max(0, startEnergyKwh - totalTripEnergyKwh);

  const estimatedArrivalSoc = Math.min(1.0, Math.max(0, arrivalEnergyKwh / specs.usable_battery_kwh));

  // Autonomy at arrival (km) using standard reference consumption
  const estimatedArrivalRangeKm = Math.round((arrivalEnergyKwh * 1000) / Math.max(basePlannedRateWhKm, 100));

  // Efficiency status determination
  let statusTag: 'optimal' | 'moderate' | 'high_consumption' | 'critical' = 'optimal';
  let statusMessage = 'Velocidad eficiente — excelente autonomía';

  if (estimatedArrivalSoc < 0.15) {
    statusTag = 'critical';
    statusMessage = '⚠️ Alerta: Batería crítica a la llegada. Reduce la velocidad.';
  } else if (activeSpeedKmH > 100) {
    statusTag = 'high_consumption';
    const extraPct = Math.round((speedEfficiencyRatio - 1) * 100);
    statusMessage = `⚡ Alta velocidad: Consumo aumentado (+${extraPct}% de resistencia aerodinámica)`;
  } else if (activeSpeedKmH > 80) {
    statusTag = 'moderate';
    statusMessage = 'Velocidad moderada — consumo dentro del rango esperado';
  } else {
    statusTag = 'optimal';
    statusMessage = 'Velocidad óptima — máxima eficiencia de batería';
  }

  return {
    estimatedArrivalSoc,
    estimatedArrivalRangeKm,
    consumptionRateWhKm: Math.round(liveWhKm),
    speedEfficiencyRatio,
    statusTag,
    statusMessage
  };
}
