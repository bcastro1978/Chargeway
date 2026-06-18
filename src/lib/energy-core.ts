/**
 * ENERGY CORE Logic for ChargeWay
 * Physics-based consumption model for Electric Vehicles.
 */

export interface VehicleSpecs {
  usable_battery_kwh: number;
  drag_coefficient: number;
  frontal_area_m2: number;
  weight_kg: number;
  peak_charging_kw: number;
}

export interface EnvironmentFactors {
  wind_speed_ms: number; // m/s
  wind_direction_deg: number;
  ambient_temp_c: number;
  road_condition: 'dry' | 'wet' | 'snow';
}

export interface SegmentData {
  distance_m: number;
  elevation_gain_m: number;
  speed_ms: number; // Avg speed for this segment
}

const G = 9.81; // Gravity constant
// Air density: Quito sits at ~2800 m above sea level where rho ≈ 0.90 kg/m³.
// Using sea-level 1.225 would overestimate aerodynamic drag by ~26%.
// Formula: rho(h) = 1.225 * (1 - 2.2558e-5 * h)^5.2559  (ISA standard atmosphere)
function airDensity(altitudeM: number): number {
  return 1.225 * Math.pow(1 - 2.2558e-5 * Math.max(0, altitudeM), 5.2559);
}
// CRR calibrado para vías urbanas de Quito (asfalto irregular): 0.012
const CRR_DRY = 0.012;

/**
 * Calculates Wh (Watt-hours) consumed for a given segment.
 */
export function calculateSegmentConsumption(
  specs: VehicleSpecs,
  environment: EnvironmentFactors,
  segment: SegmentData
): number {
  const { weight_kg, drag_coefficient, frontal_area_m2 } = specs;
  const { distance_m, elevation_gain_m, speed_ms } = segment;

  // 1. Aerodynamic Force — use altitude-corrected air density
  // F_aero = 0.5 * rho * Cd * A * v^2
  // Typical Quito altitude ~2800 m; rho ≈ 0.90 vs 1.225 at sea level
  const altitude_m = (segment as any).altitude_m ?? 2800; // default Quito altitude
  const rhoAir = airDensity(altitude_m);
  const forceAero = 0.5 * rhoAir * drag_coefficient * frontal_area_m2 * Math.pow(speed_ms, 2);

  // 2. Rolling Resistance Force
  // F_rolling = Crr * m * g
  // Simple model: theta is small, so cos(theta) approx 1
  const forceRolling = CRR_DRY * weight_kg * G;

  // 3. Gravity Force
  // F_gravity = m * g * sin(theta)
  // sin(theta) approx h / d for small slopes
  const slope = distance_m > 0 ? elevation_gain_m / distance_m : 0;
  const forceGravity = weight_kg * G * slope;

  // Energy in Wh (1 Wh = 3600 Joules)
  // Calibrado contra datos reales de Seagull 38.8 kWh en Quito:
  // - km0→km11 (subida 466m): 8% batería = 3.11 kWh
  // - Round trip 44km: 14-16% = 5.44-6.22 kWh
  const DRIVETRAIN_EFFICIENCY = 0.85; // pérdidas reales motor+inversor+transmisión
  const REGEN_SYSTEM_EFFICIENCY = 0.70;
  // Regen diferenciado por tipo de pendiente:
  // - Bajada sostenida (>3% grade): captura alta (~79%) — frenada continua eficiente
  // - Regen urbano/suave: captura baja (~21%) — semáforos, frenadas cortas
  const slopePct = distance_m > 0 ? (elevation_gain_m / distance_m) * 100 : 0;
  const regenCapture = slopePct < -3 ? 0.786 : 0.214; // da effective: 0.55 vs 0.15
  const EFFECTIVE_REGEN = REGEN_SYSTEM_EFFICIENCY * regenCapture;

  // Aero + rolling ALWAYS consume energy regardless of slope
  const rollingAeroWork = (forceAero + forceRolling) * distance_m;
  const rollingAeroEnergy = (rollingAeroWork / 3600) / DRIVETRAIN_EFFICIENCY;

  // Gravity treated separately so regen cannot cancel aero/rolling losses
  const gravityWork = forceGravity * distance_m;
  let gravityEnergy: number;
  if (gravityWork >= 0) {
    // Uphill: extra energy consumed
    gravityEnergy = (gravityWork / 3600) / DRIVETRAIN_EFFICIENCY;
  } else {
    // Downhill: slope-dependent regen recovery
    gravityEnergy = (gravityWork / 3600) * EFFECTIVE_REGEN;
  }

  let energyWh = rollingAeroEnergy + gravityEnergy;

  // 4. Auxiliary loads (HVAC, Lights, etc.) - These always consume energy
  // Base 750W: calibrado para Quito (AC frecuente, accesorios). +50W/°C delta
  const tempDelta = Math.abs(environment.ambient_temp_c - 21);
  const auxPowerW = 750 + (tempDelta * 50);
  const timeHours = (distance_m / speed_ms) / 3600;
  const auxEnergyWh = auxPowerW * timeHours;

  energyWh += auxEnergyWh;

  return energyWh;
}

/**
 * Recalculates remaining range based on Current SoC and Segment estimates.
 */
export function estimateRemainingRange(
  currentSoc: number, // 0 to 1
  specs: VehicleSpecs,
  avgConsumptionWhKm: number
): number {
  const remainingEnergyKwh = (currentSoc * specs.usable_battery_kwh);
  return (remainingEnergyKwh / avgConsumptionWhKm) * 1000;
}
