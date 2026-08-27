'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Gauge, Navigation, Zap, Battery, BatteryCharging, CheckCircle, Save, X } from 'lucide-react';
import { useTripStore } from '@/lib/store/useTripStore';

export interface TripSummaryData {
  originName: string;
  destinationName: string;
  vehicleModel: string;
  actualDistanceKm: number;
  actualDurationMin: number;
  avgSpeedKmh: number;
  consumedKwh: number;
  consumedSocPct: number;
  remainingSocPct: number;
  startSocPct: number;
}

interface TripSummaryModalProps {
  summaryData: TripSummaryData;
  onClose: () => void;
  onContinueTrip?: () => void;
}

export const TripSummaryModal: React.FC<TripSummaryModalProps> = ({ summaryData, onClose, onContinueTrip }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveCompletedTripToDatabase = useTripStore(state => state.saveCompletedTripToDatabase);

  useEffect(() => {
    // Automatically persist completed trip telemetry to Supabase DB upon trip completion
    const saveTrip = async () => {
      setIsSaving(true);
      try {
        await saveCompletedTripToDatabase(summaryData);
        setIsSaved(true);
      } catch (err) {
        console.error('Error auto-saving trip summary:', err);
      } finally {
        setIsSaving(false);
      }
    };
    saveTrip();
  }, [summaryData, saveCompletedTripToDatabase]);

  const hours = Math.floor(summaryData.actualDurationMin / 60);
  const mins = Math.round(summaryData.actualDurationMin % 60);
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-950 border border-emerald-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.25)] max-w-lg w-full text-white relative flex flex-col gap-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800/60 transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-800/80 pb-4">
          <img 
            src="/logo.png" 
            alt="ChargeWay Logo" 
            className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Viaje Completado
              </span>
              {isSaved && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <Save size={12} /> Guardado en BD
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-white mt-0.5 tracking-tight">
              Resumen del Trayecto EV
            </h2>
          </div>
        </div>

        {/* Route Origin & Destination Banner */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-3.5 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500 font-bold uppercase">Origen</span>
            <span className="font-bold text-white truncate max-w-[140px]">{summaryData.originName}</span>
          </div>
          <div className="text-neutral-600 font-bold">➔</div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-neutral-500 font-bold uppercase">Destino</span>
            <span className="font-bold text-emerald-400 truncate max-w-[140px]">{summaryData.destinationName}</span>
          </div>
        </div>

        {/* 6 Key EV Driver Telemetry Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Tiempo del Viaje */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-medium block">Tiempo del Viaje</span>
              <span className="text-base font-black text-white">{durationText}</span>
            </div>
          </div>

          {/* 2. Velocidad Promedio */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Gauge size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-medium block">Velocidad Promedio</span>
              <span className="text-base font-black text-white">{summaryData.avgSpeedKmh.toFixed(1)} <span className="text-xs font-normal text-neutral-400">km/h</span></span>
            </div>
          </div>

          {/* 3. Kilómetros Reales Recorridos */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Navigation size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-medium block">Distancia Recorrida</span>
              <span className="text-base font-black text-white">{summaryData.actualDistanceKm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">km</span></span>
            </div>
          </div>

          {/* 4. Consumo Estimado en kWh */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-medium block">Consumo Estimado</span>
              <span className="text-base font-black text-white">{summaryData.consumedKwh.toFixed(1)} <span className="text-xs font-normal text-neutral-400">kWh</span></span>
            </div>
          </div>

          {/* 5. Porcentaje de Batería Consumido */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <BatteryCharging size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-medium block">Batería Consumida</span>
              <span className="text-base font-black text-rose-400">-{summaryData.consumedSocPct}%</span>
            </div>
          </div>

          {/* 6. Porcentaje de Batería Disponible al Llegar */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Battery size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-medium block">Batería Disponible</span>
              <span className="text-base font-black text-emerald-400">{summaryData.remainingSocPct}%</span>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons (Continue vs Finalize) */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {onContinueTrip && (
            <button
              onClick={onContinueTrip}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-500/50 font-bold py-3 rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <span>▶ Continuar Viaje</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
          >
            <span>✓ Finalizar y Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
