/**
 * ChargeWay Powertrain Engineering Core
 * Module: Differential Mechanical Power Balance & Andean Environmental Dynamics
 * 
 * Implements rigorous force balance along micro-segmented road trajectories:
 * F_wheels = F_aero(h, T, v, w) + F_rolling(grade, asphalt, rain) + F_grade(m, g, slope) + F_inertial(m, a)
 */

import {
  BatteryPackSpecs,
  BatteryState,
  evaluateRegenerativeDerating,
  stepBatteryState,
  RegenDeratingResult,
} from './battery-thevenin';

export type RoadSurfaceType = 'asphalt_smooth' | 'asphalt_rough' | 'concrete_hydraulic';

export interface MechanicalVehicleSpecs {
  curbWeightKg: number;
  payloadKg: number;                 // Passengers + luggage
  aerodynamicDragCd: number;
  frontalAreaM2: number;
  drivetrainEfficiency: number;      // Peak mechanical-to-electrical efficiency (e.g. 0.91)
  regenCaptureEfficiency: number;    // Peak electrical-to-mechanical regen capture (e.g. 0.84)
  auxBasePowerWatts: number;         // 350W - 550W electronics/pumps/ECUs
  hasHeatPump: boolean;
  battery: BatteryPackSpecs;
}

export interface AmbientConditions {
  ambientTempC: number;
  barometricPressureHpa?: number;    // Measured or estimated from altitude
  windSpeedMs: number;               // Headwind > 0, Tailwind < 0
  roadSurface: RoadSurfaceType;
  isWet: boolean;
}

export interface MicroSegmentInput {
  distanceM: number;
  elevationStartM: number;
  elevationEndM: number;
  targetSpeedKmh: number;
  initialSpeedKmh?: number;          // Defaults to targetSpeedKmh (steady state)
}

export interface SegmentPowerBalance {
  durationSeconds: number;
  averageSpeedMs: number;
  slopeRatio: number;                // rise / run
  airDensityKgM3: number;
  forces: {
    fAeroN: number;
    fRollingN: number;
    fGradeN: number;
    fInertialN: number;
    fTotalWheelsN: number;
  };
  powers: {
    pAeroKw: number;
    pRollingKw: number;
    pGradeKw: number;
    pInertialKw: number;
    pAuxiliaryKw: number;
    pWheelsNetKw: number;
    pBatteryTerminalKw: number;      // + = Discharge, - = Charge
  };
  derating: RegenDeratingResult;
  batteryAfter: BatteryState;
  netEnergyConsumedKwh: number;
}

const G_STANDARD = 9.80665;
const GAS_CONSTANT_AIR = 287.058; // J/(kg*K)

/**
 * High-precision barometric air density accounting for elevation & real temperature.
 * In Quito (2,850 m), rho ≈ 0.89 kg/m³ vs 1.225 kg/m³ at sea level (~27% less drag).
 */
export function calculateAirDensity(altitudeM: number, ambientTempC: number): number {
  const safeAltM = Math.max(-50, Math.min(6000, altitudeM));
  // ISA barometric pressure: P(h) = P0 * (1 - 2.25577e-5 * h)^5.25588
  const pPa = 101325 * Math.pow(1 - 2.25577e-5 * safeAltM, 5.25588);
  const tempKelvin = ambientTempC + 273.15;
  return pPa / (GAS_CONSTANT_AIR * Math.max(220, tempKelvin));
}

/**
 * Rolling resistance coefficient calibrated for Andean road network.
 */
export function getRollingResistanceCoefficient(surface: RoadSurfaceType, isWet: boolean): number {
  let crrBase = 0.0105;
  switch (surface) {
    case 'asphalt_smooth':
      crrBase = 0.0095;
      break;
    case 'concrete_hydraulic':
      crrBase = 0.0110;
      break;
    case 'asphalt_rough':
    default:
      crrBase = 0.0130;
      break;
  }
  return isWet ? crrBase * 1.18 : crrBase;
}

/**
 * Climate control (HVAC) power draw modeling heat-pump vs resistive PTC heater.
 */
export function calculateAuxiliaryHvacPowerKw(
  ambientTempC: number,
  hasHeatPump: boolean,
  baseElectronicsKw: number
): number {
  const comfortTargetTempC = 21.5;
  const tempDelta = Math.abs(ambientTempC - comfortTargetTempC);
  
  let hvacPowerKw = 0;
  if (tempDelta > 1.5) {
    if (ambientTempC < comfortTargetTempC) {
      // Heating mode (Paramo / Andean peaks e.g. 2°C - 10°C)
      if (hasHeatPump && ambientTempC >= -5) {
        // Heat pump COP ~ 2.8 down to 0°C
        hvacPowerKw = (tempDelta * 0.12) / 2.6;
      } else {
        // Resistive PTC heating
        hvacPowerKw = tempDelta * 0.14;
      }
    } else {
      // Cooling mode (Coast / Lowlands e.g. 28°C - 35°C)
      // AC Compressor COP ~ 3.2
      hvacPowerKw = (tempDelta * 0.15) / 3.0;
    }
  }

  return Math.min(3.8, baseElectronicsKw + hvacPowerKw);
}

/**
 * Solves the differential mechanical energy and battery state step for a road segment.
 */
export function simulateMicroSegment(
  segment: MicroSegmentInput,
  vehicle: MechanicalVehicleSpecs,
  batteryBefore: BatteryState,
  ambient: AmbientConditions
): SegmentPowerBalance {
  const { distanceM, elevationStartM, elevationEndM, targetSpeedKmh } = segment;
  const vInitialMs = ((segment.initialSpeedKmh ?? targetSpeedKmh) * 1000) / 3600;
  const vFinalMs = (targetSpeedKmh * 1000) / 3600;
  const vAvgMs = Math.max(0.5, (vInitialMs + vFinalMs) / 2);

  const durationSec = distanceM > 0 ? distanceM / vAvgMs : 0;
  const accelerationMs2 = durationSec > 0 ? (vFinalMs - vInitialMs) / durationSec : 0;

  const totalMassKg = vehicle.curbWeightKg + vehicle.payloadKg;
  const midAltitudeM = (elevationStartM + elevationEndM) / 2;
  const rho = calculateAirDensity(midAltitudeM, ambient.ambientTempC);

  // 1. Aerodynamic Force: F_aero = 0.5 * rho * Cd * A * (v_rel)^2
  const vEffectiveAirMs = Math.max(0, vAvgMs + ambient.windSpeedMs);
  const fAeroN = 0.5 * rho * vehicle.aerodynamicDragCd * vehicle.frontalAreaM2 * Math.pow(vEffectiveAirMs, 2);

  // 2. Rolling Resistance: F_rolling = Crr * m * g * cos(theta)
  const elevationDiffM = elevationEndM - elevationStartM;
  const slopeRatio = distanceM > 0 ? elevationDiffM / distanceM : 0;
  const thetaRad = Math.atan(slopeRatio);
  const crr = getRollingResistanceCoefficient(ambient.roadSurface, ambient.isWet);
  const fRollingN = crr * totalMassKg * G_STANDARD * Math.cos(thetaRad);

  // 3. Gravitational Force: F_grade = m * g * sin(theta)
  const fGradeN = totalMassKg * G_STANDARD * Math.sin(thetaRad);

  // 4. Inertial Acceleration Force: F_inertial = m * a
  const fInertialN = totalMassKg * accelerationMs2;

  // Total force requested at the tire-road interface
  const fTotalWheelsN = fAeroN + fRollingN + fGradeN + fInertialN;

  // Mechanical powers at wheels (kW)
  const pAeroKw = (fAeroN * vAvgMs) / 1000;
  const pRollingKw = (fRollingN * vAvgMs) / 1000;
  const pGradeKw = (fGradeN * vAvgMs) / 1000;
  const pInertialKw = (fInertialN * vAvgMs) / 1000;
  const pWheelsNetKw = (fTotalWheelsN * vAvgMs) / 1000;

  // Auxiliary electrical loads
  const pAuxKw = calculateAuxiliaryHvacPowerKw(
    ambient.ambientTempC,
    vehicle.hasHeatPump,
    vehicle.auxBasePowerWatts / 1000
  );

  let pBatteryTerminalKw = 0;
  let deratingResult: RegenDeratingResult;

  if (pWheelsNetKw >= 0) {
    // Traction Mode: battery delivers power through inverter and motor
    const motorElectricalKw = pWheelsNetKw / Math.max(0.70, vehicle.drivetrainEfficiency);
    pBatteryTerminalKw = motorElectricalKw + pAuxKw;

    deratingResult = {
      effectiveRegenKw: 0,
      mechanicalBrakingKw: 0,
      limitingFactor: 'none',
      terminalVoltageV: batteryBefore.soc * vehicle.battery.nominalVoltageV,
    };
  } else {
    // Braking / Regen Mode: negative mechanical power at wheels
    const rawKineticRegenKw = Math.abs(pWheelsNetKw) * vehicle.regenCaptureEfficiency;

    // Evaluate battery chemical and voltage limits
    deratingResult = evaluateRegenerativeDerating(
      rawKineticRegenKw,
      batteryBefore,
      vehicle.battery,
      ambient.ambientTempC
    );

    // Battery terminal receives negative power from regen, plus positive aux load
    pBatteryTerminalKw = -deratingResult.effectiveRegenKw + pAuxKw;
  }

  // Integrate battery states over segment duration
  const batteryAfter = stepBatteryState(
    batteryBefore,
    pBatteryTerminalKw,
    durationSec,
    vehicle.battery,
    ambient.ambientTempC
  );

  const netEnergyConsumedKwh = batteryBefore.energyRemainingKwh - batteryAfter.energyRemainingKwh;

  return {
    durationSeconds: durationSec,
    averageSpeedMs: vAvgMs,
    slopeRatio,
    airDensityKgM3: rho,
    forces: {
      fAeroN,
      fRollingN,
      fGradeN,
      fInertialN,
      fTotalWheelsN,
    },
    powers: {
      pAeroKw,
      pRollingKw,
      pGradeKw,
      pInertialKw,
      pAuxiliaryKw: pAuxKw,
      pWheelsNetKw,
      pBatteryTerminalKw,
    },
    derating: deratingResult,
    batteryAfter,
    netEnergyConsumedKwh,
  };
}

