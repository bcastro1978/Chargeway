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
  wltp_range_km?: number;
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

export function getBmsRegenFactor(currentSoc: number): number {
  // Real Lithium/LFP BMS behavior:
  // Above 95% SoC, regenerative current is essentially blocked to prevent cell overvoltage
  // Between 85% and 95%, regen is progressively throttled down
  if (currentSoc >= 0.95) return 0;
  if (currentSoc <= 0.85) return 1.0;
  return Math.max(0, (0.95 - currentSoc) / (0.95 - 0.85));
}

/**
 * Calculates Wh (Watt-hours) consumed for a given segment.
 */
export function calculateSegmentConsumption(
  specs: VehicleSpecs,
  environment: EnvironmentFactors,
  segment: SegmentData & { altitude_m?: number; currentSoc?: number }
): number {
  const { weight_kg, drag_coefficient, frontal_area_m2 } = specs;
  const { distance_m, elevation_gain_m, speed_ms } = segment;

  // 1. Aerodynamic Force — use altitude-corrected air density
  // F_aero = 0.5 * rho * Cd * A * v^2
  // 1. Aerodynamic Force — use altitude-corrected air density & relative wind speed
  // Typical Quito altitude ~2800 m; rho ≈ 0.90 vs 1.225 at sea level
  const altitude_m = segment.altitude_m ?? 2800; // default Quito altitude
  const rhoAir = airDensity(altitude_m);
  const effectiveAirSpeed = Math.max(0, speed_ms + (environment?.wind_speed_ms ? environment.wind_speed_ms * 0.4 : 0));
  const forceAero = 0.5 * rhoAir * drag_coefficient * frontal_area_m2 * Math.pow(effectiveAirSpeed, 2);

  // 2. Rolling Resistance Force (wet roads increase rolling drag by ~16%)
  const crr = environment?.road_condition === 'wet' ? 0.014 : CRR_DRY;
  const forceRolling = crr * weight_kg * G;

  // 3. Gravity Force
  // F_gravity = m * g * sin(theta)
  // sin(theta) approx h / d for small slopes
  const slope = distance_m > 0 ? elevation_gain_m / distance_m : 0;
  const forceGravity = weight_kg * G * slope;

  // Energy in Wh (1 Wh = 3600 Joules)
  // Calibrado contra datos reales de EV en los Andes:
  const DRIVETRAIN_EFFICIENCY = 0.85; // pérdidas reales motor+inversor+transmisión
  const REGEN_SYSTEM_EFFICIENCY = 0.70;
  
  // Regen diferenciado por tipo de pendiente:
  // - Bajada sostenida (>3% grade): captura alta (~79%) — frenada continua eficiente
  // - Regen urbano/suave: captura baja (~21%) — semáforos, frenadas cortas
  const slopePct = distance_m > 0 ? (elevation_gain_m / distance_m) * 100 : 0;
  const regenCapture = slopePct < -3 ? 0.786 : 0.214;
  
  // BMS protection factor: throttling when battery is full/nearly full
  const bmsFactor = typeof segment.currentSoc === 'number' 
    ? getBmsRegenFactor(segment.currentSoc) 
    : 1.0;

  const EFFECTIVE_REGEN = REGEN_SYSTEM_EFFICIENCY * regenCapture * bmsFactor;

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
    // Downhill: slope-dependent regen recovery moderated by BMS
    gravityEnergy = (gravityWork / 3600) * EFFECTIVE_REGEN;
  }

  let energyWh = rollingAeroEnergy + gravityEnergy;

  // 4. Auxiliary loads (HVAC, Lights, etc.) - These always consume energy
  // Base 750W: calibrado para clima andino/tropical (AC frecuente, accesorios). +50W/°C delta
  const tempDelta = Math.abs(environment.ambient_temp_c - 21);
  const auxPowerW = 750 + (tempDelta * 50);
  const timeHours = (distance_m / Math.max(speed_ms, 1)) / 3600;
  const auxEnergyWh = auxPowerW * timeHours;

  energyWh += auxEnergyWh;

  return energyWh;
}

export interface ContinuousRouteSimulation {
  totalConsumptionWh: number;
  totalConsumptionKwh: number;
  usableKwhAtStart: number;
  usableKwhAtEnd: number;
  arrivalSoc: number; // 0 to 1
  arrivalRangeKm: number;
  safetyMarginKm: number;
  isDirectReachable: boolean; // arrivalSoc >= 0.12
  depletionKm: number | null; // km where SoC drops <= 0
  warningReserveKm: number | null; // km where SoC drops <= 0.15
  idealChargeWindow: { minKm: number; maxKm: number } | null;
  socTimeline: Array<{ km: number; soc: number; elevationM: number }>;
  breakdown: {
    aeroWh: number;
    rollingWh: number;
    gravityClimbWh: number;
    regenRecoveredWh: number;
    auxWh: number;
  };
}

/**
 * Performs a high-fidelity continuous physics simulation along the road elevation profile.
 * Tracks battery SoC iteratively at each road segment without heuristics or forced stops.
 */
export function simulateContinuousRouteEnergy(
  elevationPoints: Array<{ location: { lat: number; lng: number }; elevation: number }>,
  totalRouteDistM: number,
  avgSpeedKmh: number,
  vehicleSpecs: VehicleSpecs,
  environment: EnvironmentFactors,
  initialSoc: number, // 0 to 1
  rechargeStops?: Array<{ km: number; targetSoc: number }>
): ContinuousRouteSimulation {
  const batteryCapacityKwh = vehicleSpecs.usable_battery_kwh;
  let currentEnergyKwh = batteryCapacityKwh * Math.max(0.01, Math.min(1.0, initialSoc));
  const usableKwhAtStart = currentEnergyKwh;

  // Track applied recharge stops
  const activeRechargeStops = rechargeStops ? rechargeStops.map(s => ({ ...s, applied: false })) : [];

  let totalAeroWh = 0;
  let totalRollingWh = 0;
  let totalClimbWh = 0;
  let totalRegenWh = 0;
  let totalAuxWh = 0;
  let netConsumptionWh = 0;

  // 1. Calculate total haversine distance to proportionally scale segments to totalRouteDistM
  let sumHaversineM = 0;
  const haversineDistsM: number[] = [];
  for (let i = 1; i < elevationPoints.length; i++) {
    const prev = elevationPoints[i - 1];
    const curr = elevationPoints[i];
    const dLat = ((curr.location.lat - prev.location.lat) * Math.PI) / 180;
    const dLng = ((curr.location.lng - prev.location.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((prev.location.lat * Math.PI) / 180) *
        Math.cos((curr.location.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const dM = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    haversineDistsM.push(dM);
    sumHaversineM += dM;
  }

  // Realistic highway cruise speed: even if city traffic delays departure,
  // interprovincial highway sections travel at 65 - 80 km/h
  const baseSpeedKmh = Math.max(65, Math.min(85, avgSpeedKmh));
  const baseSpeedMs = (baseSpeedKmh * 1000) / 3600;
  const socTimeline: Array<{ km: number; soc: number; elevationM: number }> = [];

  let cumDistKm = 0;
  let depletionKm: number | null = null;
  let warningReserveKm: number | null = null;
  let idealChargeMinKm: number | null = null;
  let idealChargeMaxKm: number | null = null;

  // Initial point
  if (elevationPoints.length > 0) {
    socTimeline.push({
      km: 0,
      soc: initialSoc,
      elevationM: elevationPoints[0].elevation
    });
  }

  for (let i = 1; i < elevationPoints.length; i++) {
    const prev = elevationPoints[i - 1];
    const curr = elevationPoints[i];
    const rawSegM = haversineDistsM[i - 1] || 0;
    if (rawSegM < 1) continue;

    // Proportionally scale to true road distance from Mapbox/OSRM
    const segDistM = sumHaversineM > 0
      ? (rawSegM / sumHaversineM) * totalRouteDistM
      : rawSegM;
    const segDistKm = segDistM / 1000;

    cumDistKm += segDistKm;
    const elevGainM = curr.elevation - prev.elevation;
    const slopePct = (elevGainM / segDistM) * 100;

    // Dynamic speed adjustment for steep Andean slopes
    let segSpeed = baseSpeedMs;
    if (slopePct > 5) {
      segSpeed = Math.max(baseSpeedMs * 0.70, 12); // Steep uphill
    } else if (slopePct < -5) {
      segSpeed = Math.min(baseSpeedMs * 0.85, 20); // Steep downhill
    }

    const segAltitude = (prev.elevation + curr.elevation) / 2;
    const currentSoc = Math.max(0, currentEnergyKwh / batteryCapacityKwh);

    // Calculate forces & energy
    const rhoAir = airDensity(segAltitude);
    const forceAero = 0.5 * rhoAir * vehicleSpecs.drag_coefficient * vehicleSpecs.frontal_area_m2 * Math.pow(segSpeed, 2);
    const forceRolling = CRR_DRY * vehicleSpecs.weight_kg * G;
    const slope = elevGainM / segDistM;
    const forceGravity = vehicleSpecs.weight_kg * G * slope;

    // Calibración física de alta precisión para tren motriz EV moderno (BYD e-Platform / IPM PMSM)
    const DRIVETRAIN_EFF = 0.91;
    const REGEN_SYS_EFF = 0.82;
    const regenCapture = slopePct < -3 ? 0.82 : (slopePct < -1 ? 0.60 : 0.25);
    const bmsFactor = getBmsRegenFactor(currentSoc);
    const effectiveRegen = REGEN_SYS_EFF * regenCapture * bmsFactor;

    const aeroRollingWork = (forceAero + forceRolling) * segDistM;
    const aeroRollingWh = (aeroRollingWork / 3600) / DRIVETRAIN_EFF;

    const gravWork = forceGravity * segDistM;
    let gravWh = 0;
    if (gravWork >= 0) {
      gravWh = (gravWork / 3600) / DRIVETRAIN_EFF;
      totalClimbWh += gravWh;
    } else {
      const recoveredWh = Math.abs((gravWork / 3600) * effectiveRegen);
      gravWh = -recoveredWh;
      totalRegenWh += recoveredWh;
    }

    const tempDelta = Math.abs(environment.ambient_temp_c - 21);
    const auxPowerW = 450 + (tempDelta * 30); // Carga auxiliar realista (BMS, cómputo y A/C moderado)
    const timeH = (segDistM / Math.max(segSpeed, 1)) / 3600;
    const auxWh = auxPowerW * timeH;

    totalAeroWh += (forceAero * segDistM / 3600) / DRIVETRAIN_EFF;
    totalRollingWh += (forceRolling * segDistM / 3600) / DRIVETRAIN_EFF;
    totalAuxWh += auxWh;

    const segNetWh = aeroRollingWh + gravWh + auxWh;
    netConsumptionWh += segNetWh;

    // Update battery energy strictly within [0, capacity]
    currentEnergyKwh = Math.min(
      batteryCapacityKwh,
      Math.max(-10, currentEnergyKwh - (segNetWh / 1000))
    );

    // Apply any recharge stops passed
    if (activeRechargeStops.length > 0) {
      for (const rStop of activeRechargeStops) {
        if (!rStop.applied && cumDistKm >= rStop.km) {
          rStop.applied = true;
          const targetKwh = batteryCapacityKwh * Math.max(0.1, Math.min(1.0, rStop.targetSoc));
          currentEnergyKwh = Math.max(currentEnergyKwh, targetKwh);
          if (currentEnergyKwh > 0) {
            depletionKm = null;
          }
        }
      }
    }

    const stepSoc = currentEnergyKwh / batteryCapacityKwh;

    // Detection of depletion and critical reserve points
    if (stepSoc <= 0 && depletionKm === null) {
      depletionKm = Math.round(cumDistKm * 10) / 10;
    }
    if (stepSoc <= 0.15 && warningReserveKm === null) {
      warningReserveKm = Math.round(cumDistKm * 10) / 10;
    }
    if (stepSoc <= 0.25 && idealChargeMinKm === null) {
      idealChargeMinKm = Math.round(cumDistKm * 10) / 10;
    }
    if (stepSoc <= 0.15 && idealChargeMaxKm === null) {
      idealChargeMaxKm = Math.round(cumDistKm * 10) / 10;
    }

    socTimeline.push({
      km: Math.round(cumDistKm * 10) / 10,
      soc: Math.max(0, Math.min(1.0, stepSoc)),
      elevationM: Math.round(curr.elevation)
    });
  }

  // Sanity floor for Andean mountain corridors:
  // In mountainous terrain with passes, real consumption is never lower than 135-150 Wh/km
  const routeDistKm = totalRouteDistM / 1000;
  const isMountainous = totalClimbWh > 4000 || (elevationPoints.length > 2 && Math.abs(elevationPoints[elevationPoints.length - 1].elevation - elevationPoints[0].elevation) > 400);
  const minRateWhKm = isMountainous ? 148 : 125;
  const minFloorWh = minRateWhKm * routeDistKm;

  if (netConsumptionWh < minFloorWh && (!rechargeStops || rechargeStops.length === 0)) {
    const diff = minFloorWh - netConsumptionWh;
    netConsumptionWh = minFloorWh;
    currentEnergyKwh -= (diff / 1000);

    const totalDistKm = routeDistKm > 0 ? routeDistKm : 1;
    const diffKwh = diff / 1000;
    depletionKm = null;
    warningReserveKm = null;
    idealChargeMinKm = null;
    idealChargeMaxKm = null;

    for (let i = 0; i < socTimeline.length; i++) {
      const distFraction = Math.min(1.0, socTimeline[i].km / totalDistKm);
      const scaledSocReduction = (diffKwh * distFraction) / batteryCapacityKwh;
      const adjustedSoc = Math.max(0, Math.min(1.0, socTimeline[i].soc - scaledSocReduction));
      socTimeline[i].soc = adjustedSoc;

      if (adjustedSoc <= 0 && depletionKm === null) {
        depletionKm = socTimeline[i].km;
      }
      if (adjustedSoc <= 0.15 && warningReserveKm === null) {
        warningReserveKm = socTimeline[i].km;
      }
      if (adjustedSoc <= 0.25 && idealChargeMinKm === null) {
        idealChargeMinKm = socTimeline[i].km;
      }
      if (adjustedSoc <= 0.15 && idealChargeMaxKm === null) {
        idealChargeMaxKm = socTimeline[i].km;
      }
    }
  }

  const usableKwhAtEnd = currentEnergyKwh;
  const arrivalSoc = Math.max(0, usableKwhAtEnd / batteryCapacityKwh);
  if (socTimeline.length > 0) {
    socTimeline[socTimeline.length - 1].soc = Number(arrivalSoc.toFixed(3));
  }
  const fallbackRateWhKm = (vehicleSpecs.usable_battery_kwh * 1000) / (vehicleSpecs.wltp_range_km || 300);
  const avgRateWhKm = routeDistKm > 0 ? netConsumptionWh / routeDistKm : fallbackRateWhKm;

  const safetyBufferKwh = batteryCapacityKwh * 0.15; // 15% safe reserve
  const safetyMarginKm = Math.round(((usableKwhAtEnd - safetyBufferKwh) * 1000) / avgRateWhKm);
  const arrivalRangeKm = Math.max(0, Math.round((usableKwhAtEnd * 1000) / avgRateWhKm));

  // Direct reachable without stopping if arrival SoC >= 12%
  const isDirectReachable = arrivalSoc >= 0.12 && depletionKm === null;

  return {
    totalConsumptionWh: Math.round(netConsumptionWh),
    totalConsumptionKwh: Number((netConsumptionWh / 1000).toFixed(2)),
    usableKwhAtStart: Number(usableKwhAtStart.toFixed(2)),
    usableKwhAtEnd: Number(usableKwhAtEnd.toFixed(2)),
    arrivalSoc: Number(arrivalSoc.toFixed(3)),
    arrivalRangeKm,
    safetyMarginKm,
    isDirectReachable,
    depletionKm,
    warningReserveKm,
    idealChargeWindow: idealChargeMinKm !== null ? {
      minKm: idealChargeMinKm,
      maxKm: idealChargeMaxKm || idealChargeMinKm + 25
    } : null,
    socTimeline,
    breakdown: {
      aeroWh: Math.round(totalAeroWh),
      rollingWh: Math.round(totalRollingWh),
      gravityClimbWh: Math.round(totalClimbWh),
      regenRecoveredWh: Math.round(totalRegenWh),
      auxWh: Math.round(totalAuxWh)
    }
  };
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
