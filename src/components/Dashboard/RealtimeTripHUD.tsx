'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTripStore, ProactiveAlert } from '@/lib/store/useTripStore';
import { calculateDynamicArrival, DynamicArrivalEstimation } from '@/lib/realtime-energy';
import { Zap, AlertTriangle, BatteryCharging, X } from 'lucide-react';

function playCopilotVoiceAlert(text: string, voice = 'es-EC-AndreaNeural') {
  if (typeof window === 'undefined') return;
  try {
    const audioUrl = `/api/tts?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'es-EC';
        window.speechSynthesis.speak(u);
      }
    });
  } catch (_) {}
}

export const RealtimeTripHUD: React.FC = () => {
  const isNavigating = useTripStore(state => state.isNavigating);
  const isSimulating = useTripStore(state => state.isSimulating);
  const tripPlan = useTripStore(state => state.tripPlan);
  const selectedVehicle = useTripStore(state => state.selectedVehicle);
  const currentSoc = useTripStore(state => state.soc);
  const currentDistance = useTripStore(state => state.currentDistance);
  const currentSpeedKmH = useTripStore(state => state.currentSpeedKmH);
  const simulatedSpeedKmH = useTripStore(state => state.simulatedSpeedKmH);
  const setSimulatedSpeedKmH = useTripStore(state => state.setSimulatedSpeedKmH);
  const setDynamicArrivalInStore = useTripStore(state => state.setDynamicArrival);
  const routePoints = useTripStore(state => state.routePoints);
  const isRerouting = useTripStore(state => state.isRerouting);
  const preferences = useTripStore(state => state.preferences);
  const activeProactiveAlert = useTripStore(state => state.activeProactiveAlert);
  const setActiveProactiveAlert = useTripStore(state => state.setActiveProactiveAlert);
  const dismissProactiveAlert = useTripStore(state => state.dismissProactiveAlert);

  const [estimation, setEstimation] = useState<DynamicArrivalEstimation | null>(null);
  const [hudArrivalSoc, setHudArrivalSoc] = useState<number | null>(null);

  const lastCheckpointKmRef = useRef<number>(0);
  const speedSamplesRef = useRef<number[]>([]);
  const lastDeviationAlertKmRef = useRef<number>(-99);
  const announcedChargerStopsRef = useRef<Set<string>>(new Set());

  // 1. Initial setup upon navigation start
  useEffect(() => {
    if (!isNavigating || !tripPlan || !selectedVehicle) {
      setEstimation(null);
      setHudArrivalSoc(null);
      lastCheckpointKmRef.current = 0;
      speedSamplesRef.current = [];
      lastDeviationAlertKmRef.current = -99;
      announcedChargerStopsRef.current.clear();
      setDynamicArrivalInStore(null, null);
      dismissProactiveAlert();
      return;
    }

    // Set initial HUD arrival battery percentage to match plan, clamped to currentSoc
    const hasChargingStops = Boolean(tripPlan.chargers && tripPlan.chargers.length > 0);
    const initialArrivalSoc = hasChargingStops 
      ? tripPlan.arrivalSoc 
      : Math.min(currentSoc, tripPlan.arrivalSoc);

    setHudArrivalSoc(initialArrivalSoc);
    lastCheckpointKmRef.current = currentDistance;
    speedSamplesRef.current = [];
  }, [isNavigating, tripPlan, selectedVehicle, currentSoc]);

  // 2. Telemetry collection and 5 km Checkpoint Update Logic
  useEffect(() => {
    if (!isNavigating || !tripPlan || !selectedVehicle) return;

    const evalSpeed = isSimulating ? simulatedSpeedKmH : currentSpeedKmH;
    if (evalSpeed > 0) {
      speedSamplesRef.current.push(evalSpeed);
    }

    const totalDistKm = tripPlan.route.distance / 1000;
    const remainingDistKm = Math.max(0.1, totalDistKm - currentDistance);
    const basePlannedRate = totalDistKm > 0 ? (tripPlan.totalConsumptionWh / totalDistKm) : 160;

    // Check if 5 km have been navigated since last checkpoint (or near arrival on short trips)
    const distDrivenSinceCheckpoint = currentDistance - lastCheckpointKmRef.current;
    const isShortTripArrival = totalDistKm < 5.0 && currentDistance >= (totalDistKm * 0.5);
    const shouldUpdateCheckpoint = distDrivenSinceCheckpoint >= 5.0 || isShortTripArrival || hudArrivalSoc === null;

    const effectiveStartSoc = (useTripStore.getState() as any).navigationStartSoc ?? currentSoc;

    if (shouldUpdateCheckpoint) {
      // Calculate average speed for this 5 km segment
      const samples = speedSamplesRef.current;
      const avgSpeed = samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : evalSpeed;

      const est = calculateDynamicArrival(
        selectedVehicle.specs,
        effectiveStartSoc,
        totalDistKm,
        currentDistance,
        avgSpeed,
        basePlannedRate
      );

      setEstimation(est);
      setHudArrivalSoc(est.estimatedArrivalSoc);
      setDynamicArrivalInStore(est.estimatedArrivalSoc, est.estimatedArrivalRangeKm);

      // Feature 1: Check for Consumption Deviation
      const minMargin = preferences?.minArrivalSocSafetyMargin ?? 0.15;
      const plannedArrival = tripPlan.arrivalSoc;
      const dynamicArrival = est.estimatedArrivalSoc;
      const deficit = plannedArrival - dynamicArrival;

      const isCriticalDeficit = deficit >= 0.08 || dynamicArrival < minMargin;
      const hasDrivenFarEnough = (currentDistance - lastDeviationAlertKmRef.current) >= 7.0;

      if (isCriticalDeficit && hasDrivenFarEnough && currentDistance >= 4.0) {
        lastDeviationAlertKmRef.current = currentDistance;
        const projectedPct = Math.round(dynamicArrival * 100);
        const alertMsg = `Atención de Copiloto: tu consumo actual reducirá la batería a ${projectedPct}% al llegar. Te sugiero reducir velocidad o agregar una recarga.`;

        setActiveProactiveAlert({
          id: `dev_${Date.now()}`,
          type: 'consumption_warning',
          title: 'Alerta de Consumo Elevado',
          message: `Llegada estimada al ${projectedPct}%. Se sugiere moderar velocidad.`,
          timestamp: Date.now(),
        });

        if (preferences?.voiceAlertsEnabled !== false) {
          playCopilotVoiceAlert(alertMsg);
        }
      }

      // Advance checkpoint by 5 km and reset speed samples
      lastCheckpointKmRef.current = currentDistance;
      speedSamplesRef.current = [];
    } else if (!estimation) {
      // Base estimation for instant consumption readout
      const est = calculateDynamicArrival(
        selectedVehicle.specs,
        effectiveStartSoc,
        totalDistKm,
        currentDistance,
        evalSpeed,
        basePlannedRate
      );
      setEstimation(est);
    }

    // Feature 2: Proximity Check for Required Charging Stops
    const rawStops = tripPlan.suggestedChargingStops && tripPlan.suggestedChargingStops.length > 0
      ? tripPlan.suggestedChargingStops
      : (tripPlan.suggestedChargingStop ? [tripPlan.suggestedChargingStop] : (tripPlan.chargers || []));

    rawStops.forEach((stop: any, idx: number) => {
      const posKm = stop.posKm ?? (totalDistKm * (idx + 1) / (rawStops.length + 1));
      const distToStop = posKm - currentDistance;
      const stopName = stop.nombre || stop.name || 'Estación de Carga';
      const stopKey = `${stopName}_${idx}`;

      // Aviso a ~5 km (entre 3.5 km y 5.2 km)
      if (distToStop <= 5.2 && distToStop >= 3.5 && !announcedChargerStopsRef.current.has(`${stopKey}_5km`)) {
        announcedChargerStopsRef.current.add(`${stopKey}_5km`);
        const powerText = stop.potencia || stop.power || '50 kW';
        const msg = `Te aproximas a la estación de recarga ${stopName} en 5 kilómetros. Potencia ${powerText}.`;

        setActiveProactiveAlert({
          id: `prox_${Date.now()}`,
          type: 'charger_proximity',
          title: 'Próxima Parada en 5 km',
          message: `${stopName} (${powerText})`,
          timestamp: Date.now(),
        });

        if (preferences?.voiceAlertsEnabled !== false) {
          playCopilotVoiceAlert(msg);
        }
      }

      // Aviso de llegada a estación (menos de 0.8 km)
      if (distToStop <= 0.8 && distToStop >= -0.5 && !announcedChargerStopsRef.current.has(`${stopKey}_arrived`)) {
        announcedChargerStopsRef.current.add(`${stopKey}_arrived`);
        const msg = `Llegada a estación de recarga ${stopName}.`;

        setActiveProactiveAlert({
          id: `arr_${Date.now()}`,
          type: 'charger_proximity',
          title: 'Llegada a Estación',
          message: stopName,
          timestamp: Date.now(),
        });

        if (preferences?.voiceAlertsEnabled !== false) {
          playCopilotVoiceAlert(msg);
        }
      }
    });
  }, [
    isNavigating,
    tripPlan,
    selectedVehicle,
    currentSoc,
    currentDistance,
    currentSpeedKmH,
    simulatedSpeedKmH,
    isSimulating,
    preferences,
    setActiveProactiveAlert
  ]);

  if (!isNavigating || !tripPlan || !selectedVehicle) return null;

  const displaySpeed = isSimulating ? simulatedSpeedKmH : currentSpeedKmH;
  
  // Use 5 km checkpoint updated SOC (or initial plan arrivalSoc if under 5 km)
  const activeArrivalSoc = hudArrivalSoc !== null ? hudArrivalSoc : tripPlan.arrivalSoc;
  const currentSocPct = Math.round(currentSoc * 100);
  const rawArrivalSocPct = Math.round(activeArrivalSoc > 1.0 ? activeArrivalSoc : activeArrivalSoc * 100);
  const hasChargingStops = Boolean(tripPlan.chargers && tripPlan.chargers.length > 0);
  // Physical law: without charging stops, arrival percentage cannot exceed current battery
  const arrivalSocPct = Math.min(100, Math.max(0, hasChargingStops ? rawArrivalSocPct : Math.min(currentSocPct, rawArrivalSocPct)));

  // Current real-time autonomy remaining at this exact moment (km)
  const currentEnergyKwh = currentSoc * selectedVehicle.specs.usable_battery_kwh;
  const currentRateWhKm = estimation?.consumptionRateWhKm || 160;
  const currentAutonomyKm = Math.round((currentEnergyKwh * 1000) / Math.max(currentRateWhKm, 80));

  // Destination address / name
  const destinationPoint = routePoints.length > 0 ? routePoints[routePoints.length - 1] : null;
  const destinationName = destinationPoint?.name ? destinationPoint.name.trim().toUpperCase() : 'DESTINO';

  return (
    <div className="absolute top-4 left-4 z-[20] transition-all duration-300">
      {/* Compact Container with ChargeWay Brand Colors (Emerald #10b981 / Teal) */}
      <div 
        className="bg-neutral-950/95 border border-emerald-500/40 rounded-2xl p-2.5 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white w-[180px] flex flex-col items-center select-none"
      >
        {/* 1. Compact Digital Speedometer */}
        <div className="flex flex-col items-center justify-center text-center my-0.5">
          <span 
            className="text-3xl font-black tracking-tight text-emerald-400 leading-none"
            style={{ 
              textShadow: '0 0 15px rgba(16, 185, 129, 0.7)' 
            }}
          >
            {displaySpeed}
          </span>
          <span 
            className="text-[9px] font-black tracking-widest text-emerald-400/90 mt-0.5"
          >
            KM/H
          </span>
        </div>

        {/* 2. Arrival Battery Section (% Autonomía al llegar) */}
        <div className="w-full mt-2 pt-1.5 border-t border-neutral-800/60 space-y-1">
          <div className="flex items-center justify-between px-0.5 gap-1">
            {/* EV Car Icon + Label */}
            <div className="flex items-center gap-1 text-emerald-400 min-w-0">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-3.5 h-3.5 shrink-0"
              >
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              <span className="text-[7.5px] font-extrabold tracking-tight uppercase text-neutral-300 truncate">
                % AUTONOMÍA AL LLEGAR
              </span>
            </div>

            {/* Battery % Arrival */}
            <span className="text-xs font-black text-emerald-400">
              {arrivalSocPct}%
            </span>
          </div>

          {/* ChargeWay Emerald Battery Progress Bar */}
          <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-emerald-950">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, arrivalSocPct)}%`,
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)'
              }}
            />
          </div>
        </div>

        {/* 4. Destination Address in Brackets */}
        <div className="mt-2 pt-1 border-t border-neutral-800/80 w-full text-center">
          <span 
            className="text-[9px] font-bold tracking-wider text-emerald-300/90 uppercase truncate max-w-full block px-1"
            title={destinationName}
          >
            [{destinationName}]
          </span>
        </div>

        {/* 5. Automatic Rerouting Status Banner */}
        {isRerouting && (
          <div className="w-full bg-emerald-950/90 border border-emerald-400/60 rounded-lg py-1 px-1.5 mt-1.5 flex items-center justify-center gap-1.5 animate-pulse">
            <span className="text-[8.5px] font-extrabold text-emerald-300 uppercase tracking-wider">
              🔄 Recalculando ruta...
            </span>
          </div>
        )}

        {/* 6. Proactive Copilot Alert Banner */}
        {activeProactiveAlert && (
          <div className={`w-full mt-2 rounded-xl p-2 border transition-all animate-fade-in shadow-lg ${
            activeProactiveAlert.type === 'consumption_warning'
              ? 'bg-amber-950/95 border-amber-500/70 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
          }`}>
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {activeProactiveAlert.type === 'consumption_warning' ? (
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                ) : (
                  <BatteryCharging size={13} className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                )}
                <div className="min-w-0">
                  <span className="text-[8px] font-black uppercase tracking-wider block truncate">
                    {activeProactiveAlert.title}
                  </span>
                  <p className="text-[7.5px] font-mono leading-tight opacity-90 line-clamp-2">
                    {activeProactiveAlert.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissProactiveAlert()}
                className="text-neutral-400 hover:text-white p-0.5 shrink-0"
                title="Cerrar alerta"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
