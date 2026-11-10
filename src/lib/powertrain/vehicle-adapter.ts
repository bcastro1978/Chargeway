/**
 * ChargeWay Powertrain Engineering Core
 * Module: Vehicle Specs Adapter
 * 
 * Bridges catalog vehicle objects into physical MechanicalVehicleSpecs
 * with chemistry, cell architecture (LFP vs NMC), and thermal specs.
 */

import { MechanicalVehicleSpecs } from './physics-engine';
import { CellChemistry } from './battery-thevenin';
import vehiclesCatalog from '@/lib/vehicles.json';

export function resolveMechanicalVehicleSpecs(
  vehicleModelOrId?: string,
  vehicleBrand?: string,
  customBatteryKwh?: number
): MechanicalVehicleSpecs {
  const normSearch = `${vehicleBrand || ''} ${vehicleModelOrId || ''}`.toLowerCase().trim();

  const found = (vehiclesCatalog as any[]).find(v => {
    const brand = (v.brand || '').toLowerCase();
    const model = (v.model || '').toLowerCase();
    const id = (v.id || '').toLowerCase();
    return normSearch.includes(model) ||
           normSearch.includes(id) ||
           (brand && normSearch.includes(brand) && normSearch.includes(model.split(' ')[0]));
  });

  const rawSpecs = found?.specs || {};
  const brand = (found?.brand || vehicleBrand || '').toLowerCase();
  const model = (found?.model || vehicleModelOrId || '').toLowerCase();

  // Determine chemistry: BYD uses exclusively LFP Blade Battery; JAC / Chery mostly LFP; Korean / German EVs use NMC
  let chemistry: CellChemistry = 'NMC';
  if (brand.includes('byd') || model.includes('dolphin') || model.includes('yuan') || model.includes('seagull') || model.includes('ora')) {
    chemistry = 'LFP';
  } else if (brand.includes('tesla') && (model.includes('standard') || model.includes('rwd'))) {
    chemistry = 'LFP';
  }

  const usableKwh = Number(customBatteryKwh || rawSpecs.usable_battery_kwh || 60);
  const curbWeight = Number(rawSpecs.weight_kg || 1700);
  const cd = Number(rawSpecs.drag_coefficient || 0.28);
  const frontalArea = Number(rawSpecs.frontal_area_m2 || 2.35);
  const peakChargingKw = Number(rawSpecs.peak_charging_kw || 70);

  // High-voltage architecture (800V for Porsche Taycan / Hyundai Ioniq 5 / Kia EV6; 400V standard)
  const is800V = model.includes('taycan') || model.includes('ev6') || model.includes('ioniq 5') || model.includes('etron gt');
  const nominalVoltageV = is800V ? 720 : (chemistry === 'LFP' ? 403.2 : 380);

  return {
    curbWeightKg: curbWeight,
    payloadKg: 150, // default 2 passengers + light luggage
    aerodynamicDragCd: cd,
    frontalAreaM2: frontalArea,
    drivetrainEfficiency: 0.91,
    regenCaptureEfficiency: 0.83,
    auxBasePowerWatts: 450,
    hasHeatPump: !brand.includes('jac') && !model.includes('e10x'), // modern EVs mostly have heat pumps
    battery: {
      usableCapacityKwh: usableKwh,
      totalCapacityKwh: usableKwh * 1.05,
      nominalVoltageV,
      chemistry,
      maxDischargeKw: Math.min(usableKwh * 3, 200),
      maxRegenKw: Math.min(usableKwh * 1.2, 85),
      internalResistanceOhm: is800V ? 0.022 : (chemistry === 'LFP' ? 0.035 : 0.028),
      polarizationResistanceOhm: 0.012,
      polarizationCapacitanceF: 2200,
      thermalMassJoulePerK: usableKwh * 7500,
      coolingConductanceWPerK: 90,
    },
  };
}

