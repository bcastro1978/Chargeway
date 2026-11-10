/**
 * ChargeWay Powertrain Engineering Core
 * Module: Battery Thévenin Equivalent Circuit (1-RC) & BMS Derating Model
 * 
 * Calibrated for high-altitude Andean descents & extreme thermal gradients (Quito -> Coast).
 */

export type CellChemistry = 'LFP' | 'NMC' | 'NCA';

export interface BatteryPackSpecs {
  usableCapacityKwh: number;
  totalCapacityKwh: number;
  nominalVoltageV: number;
  chemistry: CellChemistry;
  maxDischargeKw: number;
  maxRegenKw: number;
  internalResistanceOhm: number;      // Pack R0 (Ohm)
  polarizationResistanceOhm: number;  // Pack R1 (Ohm)
  polarizationCapacitanceF: number;   // Pack C1 (Farad)
  thermalMassJoulePerK: number;       // Pack mass * specific heat (J/K)
  coolingConductanceWPerK: number;    // Heat dissipation rate to ambient (W/K)
}

export interface BatteryState {
  soc: number;                 // 0.0 to 1.0 (State of Charge)
  energyRemainingKwh: number;  // Usable energy
  vRcVolts: number;            // Transient polarization voltage across R1-C1
  packTempC: number;           // Battery core temperature
}

export interface RegenDeratingResult {
  effectiveRegenKw: number;
  mechanicalBrakingKw: number; // Excess kinetic power redirected to friction brakes
  limitingFactor: 'none' | 'cell_overvoltage' | 'high_soc' | 'thermal_cutoff' | 'cold_plating_protection';
  terminalVoltageV: number;
}

/**
 * Open Circuit Voltage per cell as a function of SoC and chemistry.
 * Calibrated against standard 25°C laboratory discharge/charge curves.
 */
export function getCellOcv(soc: number, chemistry: CellChemistry): number {
  const clampedSoc = Math.max(0, Math.min(1, soc));

  if (chemistry === 'LFP') {
    // Lithium Iron Phosphate (e.g. BYD Blade Battery):
    // Extremely flat plateau between 0.15 and 0.85 (~3.28V - 3.32V) with steep knees at ends.
    if (clampedSoc < 0.05) return 2.80 + clampedSoc * 4.0; // 2.80V -> 3.00V
    if (clampedSoc < 0.15) return 3.00 + (clampedSoc - 0.05) * 2.8; // 3.00V -> 3.28V
    if (clampedSoc <= 0.85) return 3.28 + (clampedSoc - 0.15) * (0.04 / 0.70); // 3.28V -> 3.32V plateau
    if (clampedSoc <= 0.95) return 3.32 + (clampedSoc - 0.85) * 1.3; // 3.32V -> 3.45V
    return 3.45 + (clampedSoc - 0.95) * 4.0; // 3.45V -> 3.65V cutoff
  }

  // NMC / NCA (e.g. Kia EV6, Hyundai Ioniq 5/6, Porsche Taycan, Tesla 3/Y LR):
  // More linear potential gradient across the entire range (3.20V to 4.20V)
  if (clampedSoc < 0.10) return 3.25 + clampedSoc * 2.5; // 3.25V -> 3.50V
  if (clampedSoc > 0.90) return 4.05 + (clampedSoc - 0.90) * 1.5; // 4.05V -> 4.20V
  return 3.50 + (clampedSoc - 0.10) * (0.55 / 0.80); // Linear core 3.50V -> 4.05V
}

/**
 * Approximates cell series count (Ns) based on nominal pack voltage.
 */
export function getPackCellSeries(nominalVoltageV: number, chemistry: CellChemistry): number {
  const nominalCellV = chemistry === 'LFP' ? 3.2 : 3.7;
  return Math.max(1, Math.round(nominalVoltageV / nominalCellV));
}

/**
 * Full Pack Open Circuit Voltage.
 */
export function getPackOcv(soc: number, specs: BatteryPackSpecs): number {
  const nSeries = getPackCellSeries(specs.nominalVoltageV, specs.chemistry);
  return getCellOcv(soc, specs.chemistry) * nSeries;
}

/**
 * Maximum permissible terminal voltage during regeneration to prevent cell damage.
 */
export function getPackMaxVoltageCutoff(specs: BatteryPackSpecs): number {
  const nSeries = getPackCellSeries(specs.nominalVoltageV, specs.chemistry);
  const maxCellV = specs.chemistry === 'LFP' ? 3.65 : 4.25;
  return nSeries * maxCellV;
}

/**
 * Calculates BMS Regenerative Power Acceptance and Mechanical Brake Spillage.
 * Crucial for Andean mountain descents (e.g. Paso de la Virgen 4,060m -> Baeza 1,900m).
 * 
 * @param demandedPowerKw Negative power required at wheels for braking (e.g. -60 kW)
 * @param state Current battery state (SoC, temp, polarization voltage)
 * @param specs Battery pack physical parameters
 * @param ambientTempC Outside air temperature
 */
export function evaluateRegenerativeDerating(
  demandedRegenPowerKw: number,
  state: BatteryState,
  specs: BatteryPackSpecs,
  ambientTempC: number
): RegenDeratingResult {
  const absDemandedKw = Math.max(0, Math.abs(demandedRegenPowerKw));
  if (absDemandedKw === 0) {
    const ocv = getPackOcv(state.soc, specs);
    return {
      effectiveRegenKw: 0,
      mechanicalBrakingKw: 0,
      limitingFactor: 'none',
      terminalVoltageV: ocv,
    };
  }

  const ocv = getPackOcv(state.soc, specs);
  const vMax = getPackMaxVoltageCutoff(specs);
  let limitingFactor: RegenDeratingResult['limitingFactor'] = 'none';

  // 1. High SoC chemical limitation (lithium plating avoidance)
  let socMultiplier = 1.0;
  if (state.soc >= 0.95) {
    socMultiplier = 0.0;
    limitingFactor = 'high_soc';
  } else if (state.soc > 0.80) {
    socMultiplier = (0.95 - state.soc) / (0.95 - 0.80);
    limitingFactor = 'high_soc';
  }

  // 2. Battery pack thermal derating
  let tempMultiplier = 1.0;
  if (state.packTempC > 52) {
    tempMultiplier = 0.0;
    limitingFactor = 'thermal_cutoff';
  } else if (state.packTempC > 42) {
    tempMultiplier = Math.max(0.1, (52 - state.packTempC) / 10);
    if (limitingFactor === 'none') limitingFactor = 'thermal_cutoff';
  } else if (state.packTempC < 5 && specs.chemistry === 'LFP') {
    // LFP cannot safely fast-charge or regen at high current below 5°C
    tempMultiplier = Math.max(0.2, (state.packTempC + 10) / 15);
    if (limitingFactor === 'none') limitingFactor = 'cold_plating_protection';
  }

  // 3. Hardware peak regenerative rating
  let allowedRegenKw = Math.min(absDemandedKw, specs.maxRegenKw) * socMultiplier * tempMultiplier;

  // 4. Thévenin Voltage Limit Check: V_term = OCV + I * R0 + vRc <= V_max
  // For charging/regen, Current I flows INTO the battery (positive convention in ECM equation below)
  // P_terminal = V_term * I = (OCV + vRc + I * R0) * I
  // Solving quadratic for I_max given V_term = V_max:
  const r0 = Math.max(0.005, specs.internalResistanceOhm);
  const maxAllowedCurrentA = Math.max(0, (vMax - ocv - state.vRcVolts) / r0);
  const maxVoltageLimitedPowerKw = (vMax * maxAllowedCurrentA) / 1000;

  if (allowedRegenKw > maxVoltageLimitedPowerKw) {
    allowedRegenKw = Math.max(0, maxVoltageLimitedPowerKw);
    limitingFactor = 'cell_overvoltage';
  }

  const effectiveRegenKw = Math.max(0, Math.min(allowedRegenKw, absDemandedKw));
  const mechanicalBrakingKw = Math.max(0, absDemandedKw - effectiveRegenKw);

  // Approximate terminal voltage under charging current
  const approxCurrentA = (effectiveRegenKw * 1000) / Math.max(ocv, 100);
  const terminalVoltageV = Math.min(vMax, ocv + state.vRcVolts + approxCurrentA * r0);

  return {
    effectiveRegenKw,
    mechanicalBrakingKw,
    limitingFactor,
    terminalVoltageV,
  };
}

/**
 * Discrete Euler/Thévenin State Integration for a micro-segment of duration dtSeconds.
 */
export function stepBatteryState(
  state: BatteryState,
  netTerminalPowerKw: number, // Positive = Discharging (traction/aux), Negative = Charging (regen/grid)
  dtSeconds: number,
  specs: BatteryPackSpecs,
  ambientTempC: number
): BatteryState {
  if (dtSeconds <= 0) return { ...state };

  const ocv = getPackOcv(state.soc, specs);
  const r0 = specs.internalResistanceOhm;
  const r1 = specs.polarizationResistanceOhm;
  const c1 = specs.polarizationCapacitanceF;

  // Estimate pack current: P = V_term * I  => I approx P / V_term
  const estVterm = Math.max(100, ocv + (netTerminalPowerKw < 0 ? 10 : -10));
  const packCurrentA = (netTerminalPowerKw * 1000) / estVterm;

  // 1. RC polarization state differential: dV_rc/dt = I / C1 - V_rc / (R1 * C1)
  const tau = Math.max(1.0, r1 * c1);
  const dVrc = ((packCurrentA * r1 - state.vRcVolts) / tau) * dtSeconds;
  const nextVrc = state.vRcVolts + dVrc;

  // 2. Joule losses & Thermal step: Q_loss = I^2 * (R0 + R1)
  const pJouleLossW = Math.pow(packCurrentA, 2) * (r0 + r1);
  const pHeatDissipatedW = specs.coolingConductanceWPerK * (state.packTempC - ambientTempC);
  const netHeatFlowW = pJouleLossW - pHeatDissipatedW;
  const deltaTempC = (netHeatFlowW * dtSeconds) / Math.max(1000, specs.thermalMassJoulePerK);
  const nextPackTempC = Math.max(-20, Math.min(80, state.packTempC + deltaTempC));

  // 3. Coulomb Counting & Energy Step
  // Net energy delivered/received into electrochemical core (excluding internal resistive losses)
  const internalElectrochemicalPowerKw = (ocv * packCurrentA) / 1000;
  const deltaEnergyKwh = (internalElectrochemicalPowerKw * dtSeconds) / 3600;

  const nextEnergyRemainingKwh = Math.max(
    0,
    Math.min(specs.usableCapacityKwh, state.energyRemainingKwh - deltaEnergyKwh)
  );
  const nextSoc = Math.max(0, Math.min(1.0, nextEnergyRemainingKwh / specs.usableCapacityKwh));

  return {
    soc: nextSoc,
    energyRemainingKwh: nextEnergyRemainingKwh,
    vRcVolts: nextVrc,
    packTempC: nextPackTempC,
  };
}

