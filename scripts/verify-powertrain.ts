import {
  MechanicalVehicleSpecs,
  calculateDeterministicEvRoute,
  runPhysicalInvarianceSuite,
  validateAgainstCanTelemetry,
  CanBusTelemetryRecord,
  GeoPoint3D,
} from '../src/lib/powertrain';

// 1. Sample Vehicle: BYD Yuan Plus / Atto 3 (Blade Battery LFP)
const bydYuanPlus: MechanicalVehicleSpecs = {
  curbWeightKg: 1750,
  payloadKg: 160,
  aerodynamicDragCd: 0.29,
  frontalAreaM2: 2.45,
  drivetrainEfficiency: 0.90,
  regenCaptureEfficiency: 0.82,
  auxBasePowerWatts: 450,
  hasHeatPump: true,
  battery: {
    usableCapacityKwh: 60.48,
    totalCapacityKwh: 60.48,
    nominalVoltageV: 403.2,
    chemistry: 'LFP',
    maxDischargeKw: 150,
    maxRegenKw: 70,
    internalResistanceOhm: 0.035,
    polarizationResistanceOhm: 0.015,
    polarizationCapacitanceF: 2500,
    thermalMassJoulePerK: 450000,
    coolingConductanceWPerK: 85,
  },
};

console.log('====================================================');
console.log('   CHARGEWAY POWERTRAIN CORE: VERIFICATION SUITE    ');
console.log('====================================================\n');

// 2. Run Invariance Tests
console.log('--- 1. PHYSICAL INVARIANCE TEST SUITE ---');
const invarianceResults = runPhysicalInvarianceSuite(bydYuanPlus);
invarianceResults.forEach((r, i) => {
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Test ${i + 1}: ${r.testName}`);
  console.log(`       Observed: ${r.observedResult}`);
});

// 3. Test Quito -> Guayaquil Elevation Profile Simulation
console.log('\n--- 2. SIMULATION: QUITO (2,850m) -> GUAYAQUIL (10m) VIA ALÓAG ---');
// Construct sample 3D trace of the descent
const quitoGuayaquilTrace: GeoPoint3D[] = [
  { lat: -0.22, lng: -78.52, elevationM: 2850 }, // Quito
  { lat: -0.42, lng: -78.58, elevationM: 3200 }, // Tambillo / Alóag crest
  { lat: -0.38, lng: -78.85, elevationM: 1800 }, // Tandapi
  { lat: -0.25, lng: -79.17, elevationM: 625 },  // Santo Domingo
  { lat: -1.02, lng: -79.46, elevationM: 120 },  // Quevedo
  { lat: -2.18, lng: -79.88, elevationM: 12 },   // Guayaquil
];

const mockCandidateChargers = [
  {
    name: 'Electrolinera Santo Domingo DC',
    posKm: 120,
    detourKm: 1.5,
    powerKw: 50,
    connector_type: 'GB/T DC',
    status: 'available',
  },
  {
    name: 'Parada Quevedo Fast',
    posKm: 230,
    detourKm: 0.8,
    powerKw: 60,
    connector_type: 'GB/T DC',
    status: 'available',
  },
];

const plan = calculateDeterministicEvRoute({
  elevationTrace: quitoGuayaquilTrace,
  candidateChargers: mockCandidateChargers,
  vehicle: bydYuanPlus,
  ambient: {
    ambientTempC: 22,
    windSpeedMs: 1.5,
    roadSurface: 'asphalt_smooth',
    isWet: false,
  },
  solverOptions: {
    initialSoc: 0.90,
    minSafetySoc: 0.12,
    targetArrivalSoc: 0.15,
  },
});

console.log(`Feasible Route: ${plan.isFeasible}`);
console.log(`Total Distance: ${plan.totalDistanceKm} km`);
console.log(`Drive Time: ${plan.totalDriveTimeMinutes} mins | Charge Time: ${plan.totalChargeTimeMinutes} mins`);
console.log(`Arrival SoC: ${(plan.arrivalSoc * 100).toFixed(1)}%`);
console.log(`Net Energy Consumed: ${plan.netEnergyConsumedKwh} kWh`);
console.log(`Thermodynamic Breakdown:`, plan.thermodynamics);
console.log(`Charging Stops:`, plan.chargingStops.map(s => ({
  station: s.station.name,
  km: s.routeKm,
  arrSoc: `${(s.arrivalSoc * 100).toFixed(1)}%`,
  depSoc: `${(s.departureSoc * 100).toFixed(1)}%`,
  chargedKwh: s.energyChargedKwh,
  minutes: s.chargingTimeMinutes,
})));

// 4. Test OBD-II Telemetry Validation Harness
console.log('\n--- 3. TELEMETRY VALIDATION (SYNTHETIC CAN LOG) ---');
const sampleCanLog: CanBusTelemetryRecord[] = plan.stateTimeline
  .filter((_, idx) => idx % 40 === 0)
  .map(node => ({
    timestampMs: Date.now() + node.cumulativeTimeMinutes * 60000,
    cumDistanceKm: node.cumDistanceKm,
    // Add small synthetic sensor noise (+/- 0.8%)
    recordedSoc: Math.max(0, Math.min(1, node.soc + (Math.random() * 0.016 - 0.008))),
  }));

const metrics = validateAgainstCanTelemetry(plan, sampleCanLog);
console.log(`Sample Count: ${metrics.totalSampleCount}`);
console.log(`MAE: ${metrics.maePct}% (Threshold: <= 2.5%)`);
console.log(`RMSE: ${metrics.rmsePct}%`);
console.log(`Passes Benchmark: ${metrics.passesTargetThreshold ? 'YES' : 'NO'}`);
console.log('\nAll powertrain verification checks completed.');

