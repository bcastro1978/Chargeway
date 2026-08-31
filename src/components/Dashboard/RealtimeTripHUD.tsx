'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTripStore } from '@/lib/store/useTripStore';
import { calculateDynamicArrival, DynamicArrivalEstimation } from '@/lib/realtime-energy';

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

  const [estimation, setEstimation] = useState<DynamicArrivalEstimation | null>(null);
  const [hudArrivalSoc, setHudArrivalSoc] = useState<number | null>(null);

  const lastCheckpointKmRef = useRef<number>(0);
  const speedSamplesRef = useRef<number[]>([]);

  // 1. Initial setup upon navigation start
  useEffect(() => {
    if (!isNavigating || !tripPlan || !selectedVehicle) {
      setEstimation(null);
      setHudArrivalSoc(null);
      lastCheckpointKmRef.current = 0;
      speedSamplesRef.current = [];
      setDynamicArrivalInStore(null, null);
      return;
    }

    // Set initial HUD arrival battery percentage to match initial static plan (e.g. 20%)
    setHudArrivalSoc(tripPlan.arrivalSoc);
    lastCheckpointKmRef.current = currentDistance;
    speedSamplesRef.current = [];
  }, [isNavigating, tripPlan, selectedVehicle]);

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

    if (shouldUpdateCheckpoint) {
      // Calculate average speed for this 5 km segment
      const samples = speedSamplesRef.current;
      const avgSpeed = samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : evalSpeed;

      const est = calculateDynamicArrival(
        selectedVehicle.specs,
        currentSoc,
        totalDistKm,
        currentDistance,
        avgSpeed,
        basePlannedRate
      );

      setEstimation(est);
      setHudArrivalSoc(est.estimatedArrivalSoc);
      setDynamicArrivalInStore(est.estimatedArrivalSoc, est.estimatedArrivalRangeKm);

      // Advance checkpoint by 5 km and reset speed samples
      lastCheckpointKmRef.current = currentDistance;
      speedSamplesRef.current = [];
    } else if (!estimation) {
      // Base estimation for instant consumption readout
      const est = calculateDynamicArrival(
        selectedVehicle.specs,
        currentSoc,
        totalDistKm,
        currentDistance,
        evalSpeed,
        basePlannedRate
      );
      setEstimation(est);
    }
  }, [
    isNavigating,
    tripPlan,
    selectedVehicle,
    currentSoc,
    currentDistance,
    currentSpeedKmH,
    simulatedSpeedKmH,
    isSimulating
  ]);

  if (!isNavigating || !tripPlan || !selectedVehicle) return null;

  const displaySpeed = isSimulating ? simulatedSpeedKmH : currentSpeedKmH;
  
  // Use 5 km checkpoint updated SOC (or initial plan arrivalSoc if under 5 km)
  const activeArrivalSoc = hudArrivalSoc !== null ? hudArrivalSoc : tripPlan.arrivalSoc;
  const arrivalSocPct = Math.round(activeArrivalSoc * 100);

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
      </div>
    </div>
  );
};
