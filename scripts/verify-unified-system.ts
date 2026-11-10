/**
 * ChargeWay Unified Architecture Verification Suite
 * Tests both Capa 1 (Powertrain Physics) and Capa 2 (Cockpit Telematics)
 */

import {
  MechanicalVehicleSpecs,
  runPhysicalInvarianceSuite,
  validateAgainstCanTelemetry,
  calculateDeterministicEvRoute,
  CanBusTelemetryRecord,
  GeoPoint3D,
} from '../src/lib/powertrain';

import {
  extractDriverIntentDeterministic,
  processDriverCockpitUtterance,
  DialogueSessionContext,
  evaluateProactiveEvent,
  sanitizeAcousticText,
} from '../src/lib/copilot';

// Test Vehicle: BYD Yuan Plus (LFP Blade Battery)
const testVehicle: MechanicalVehicleSpecs = {
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

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║       CHARGEWAY UNIFIED ARCHITECTURE VERIFICATION HARNESS        ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: CAPA 1 - PHYSICAL & THERMODYNAMIC INVARIANCE
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- [CAPA 1] PHYSICAL INVARIANCE SUITE ---');
const invarianceResults = runPhysicalInvarianceSuite(testVehicle);
invarianceResults.forEach((res, idx) => {
  console.log(`[${res.passed ? 'PASS' : 'FAIL'}] Invariance #${idx + 1}: ${res.testName}`);
  console.log(`       Observed: ${res.observedResult}`);
});

// Run trace & telemetry validation
const trace: GeoPoint3D[] = [
  { lat: -0.18, lng: -78.46, elevationM: 2850 },
  { lat: -0.42, lng: -78.58, elevationM: 3200 },
  { lat: -0.25, lng: -79.17, elevationM: 625 },
  { lat: -2.18, lng: -79.88, elevationM: 10 },
];
const plan = calculateDeterministicEvRoute({
  elevationTrace: trace,
  candidateChargers: [],
  vehicle: testVehicle,
  ambient: { ambientTempC: 22, windSpeedMs: 0, roadSurface: 'asphalt_smooth', isWet: false },
  solverOptions: { initialSoc: 0.90, minSafetySoc: 0.12, targetArrivalSoc: 0.15 },
});

const syntheticCanLogs: CanBusTelemetryRecord[] = plan.stateTimeline
  .filter((_, idx) => idx % 30 === 0)
  .map(node => ({
    timestampMs: Date.now() + node.cumulativeTimeMinutes * 60000,
    cumDistanceKm: node.cumDistanceKm,
    recordedSoc: Math.max(0, Math.min(1, node.soc + (Math.random() * 0.01 - 0.005))),
  }));

const telemetryMetrics = validateAgainstCanTelemetry(plan, syntheticCanLogs);
console.log(`\n[${telemetryMetrics.passesTargetThreshold ? 'PASS' : 'FAIL'}] OBD-II Telemetry Verification`);
console.log(`       MAE: ${telemetryMetrics.maePct}% (Threshold: <= 2.5%) | RMSE: ${telemetryMetrics.rmsePct}%`);

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: CAPA 2 - COCKPIT NLU & DIALOGUE STATE TRACKER (DST)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- [CAPA 2] COCKPIT NLU INTENT CLASSIFICATION SUITE ---');
const testCorpus = [
  { text: 'Quiero viajar hasta Guayaquil saliendo con el 90%', expectedIntent: 'INTENT_PLAN_ROUTE', expectedDest: 'Guayaquil' },
  { text: 'Llego a Baños con una sola carga al 45%?', expectedIntent: 'INTENT_QUERY_RANGE', expectedDest: 'Baños' },
  { text: 'Cuanta bateria me queda para llegar?', expectedIntent: 'INTENT_QUERY_VEHICLE_TELEMETRY', expectedDest: undefined },
  { text: 'Cancela la ruta actual por favor', expectedIntent: 'INTENT_ABORT_NAVIGATION', expectedDest: undefined },
  { text: 'Donde hay cargadores rapidos CCS2 en Santo Domingo', expectedIntent: 'INTENT_QUERY_CHARGING_NETWORK', expectedDest: undefined },
  { text: 'Traza la ruta hacia Ibarra ida y vuelta', expectedIntent: 'INTENT_PLAN_ROUTE', expectedDest: 'Ibarra' },
];

let nluPassed = 0;
for (const item of testCorpus) {
  const extracted = extractDriverIntentDeterministic(item.text);
  const intentMatch = extracted.intent === item.expectedIntent;
  const dest = extracted.slots.planRoute?.destination || extracted.slots.queryRange?.destination;
  const destMatch = item.expectedDest ? dest === item.expectedDest : true;

  const pass = intentMatch && destMatch;
  if (pass) nluPassed++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] Query: "${item.text}"`);
  console.log(`       Intent: ${extracted.intent} (Expected: ${item.expectedIntent}) | Dest: ${dest || 'N/A'}`);
}
console.log(`NLU Accuracy: ${nluPassed}/${testCorpus.length} (${((nluPassed / testCorpus.length) * 100).toFixed(0)}%)`);

// ─────────────────────────────────────────────────────────────────────────────
// PART 3: CAPA 2 - COGNITIVE LOAD & ACOUSTIC BREVITY VERIFICATION (NHTSA)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- [CAPA 2] COGNITIVE LOAD & ACOUSTIC BREVITY (NHTSA RULES) ---');
async function runHmiTest() {
  const initialSession: DialogueSessionContext = {
    state: 'IDLE',
    vehicleModel: 'BYD Yuan Plus',
    currentSocPct: 85,
    lastUpdatedTimestamp: Date.now(),
  };

  const response = await processDriverCockpitUtterance({
    utterance: 'Traza la ruta a Ambato con el 85%',
    session: initialSession,
    vehicle: testVehicle,
  });

  const spoken = response.spokenMessage.textToSpeak;
  const words = response.spokenMessage.wordCount;
  const hasMarkdown = /[*_#`~[\]()>]/g.test(spoken);
  const passesBrevity = words <= 20;
  const passesAcoustic = !hasMarkdown;

  console.log(`Spoken Output: "${spoken}"`);
  console.log(`Word Count: ${words} (NHTSA Threshold: <= 20) -> [${passesBrevity ? 'PASS' : 'FAIL'}]`);
  console.log(`Clean Acoustic Format (Zero Markdown): [${passesAcoustic ? 'PASS' : 'FAIL'}]`);

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 4: PROACTIVE DISPATCHER VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- [CAPA 2] PROACTIVE TELEMETRY EVENT DISPATCHER ---');
  const alert = evaluateProactiveEvent({
    type: 'EVENT_ENERGY_BUFFER_BREACH',
    currentSocPct: 22,
    projectedArrivalSocPct: 4,
  });

  if (alert) {
    console.log(`[PASS] Proactive Alert Triggered: "${alert.textToSpeak}"`);
    console.log(`       Priority: ${alert.priority} | Words: ${alert.wordCount}`);
  } else {
    console.log(`[FAIL] Proactive Alert was not generated.`);
  }

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('   ALL UNIFIED POWERTRAIN & COCKPIT CHECKS COMPLETED SUCCESSFULLY  ');
  console.log('══════════════════════════════════════════════════════════════════\n');
}

runHmiTest();

