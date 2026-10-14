'use client';

import React, { useState } from 'react';
import { AdvisorFeedback } from '@/lib/agents/RouteAdvisorAgent';
import { Bot, MapPin, Clock, Zap, HelpCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useTripStore } from '@/lib/store/useTripStore';

interface RouteDistanceCardProps {
  distanceKm: number;
  durationMin: number;
  totalConsumptionKwh: number;
  arrivalSoc: number;
  arrivalRangeKm: number;
  safetyMarginKm: number;
  advisorFeedback?: AdvisorFeedback;
}

const RouteDistanceCardComponent: React.FC<RouteDistanceCardProps> = ({
  distanceKm,
  durationMin,
  totalConsumptionKwh,
  arrivalSoc,
  arrivalRangeKm,
  safetyMarginKm,
  advisorFeedback
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = advisorFeedback?.overallStatus || 'Seguro';
  const advice = advisorFeedback?.drivingStyleAdvice;

  const getStatusColor = () => {
    switch (status) {
      case 'Seguro': return 'text-emerald-500';
      case 'Precaución': return 'text-amber-500';
      case 'Crítico': return 'text-rose-500';
      default: return 'text-emerald-500';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'Seguro': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'Precaución': return 'bg-amber-500/10 border-amber-500/30';
      case 'Crítico': return 'bg-rose-500/10 border-rose-500/30';
      default: return 'bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const hours = Math.floor(durationMin / 60);
  const mins = Math.round(durationMin % 60);
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return (
    <div className="hud-panel p-4 sm:p-4.5 rounded-2xl border border-white/10 shadow-hud flex flex-col gap-3 transition-all font-mono">
      {/* Header Bar: Distance + Status + Toggle Chevron */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10 gap-2">
        <div className="relative group cursor-help">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Distancia Total</h3>
            <HelpCircle size={11} className="text-slate-500 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{Math.round(distanceKm)}</span>
            <span className="text-xs text-brand-cyan font-bold">km</span>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-52 bg-slate-900 text-[11px] text-slate-300 p-2.5 rounded-lg border border-white/15 shadow-2xl z-50 pointer-events-none font-sans">
            Longitud total de la ruta desde el origen hasta el destino final.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group cursor-help font-mono">
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${getStatusBg()} ${getStatusColor()}`}>
              {status}
            </span>
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-slate-900 text-[11px] text-slate-300 p-2.5 rounded-lg border border-white/15 shadow-2xl z-50 pointer-events-none font-sans">
              {status === 'Seguro' && 'Seguro: Tienes suficiente autonomía para completar el viaje sin paradas extras.'}
              {status === 'Precaución' && 'Precaución: El nivel de batería al llegar es bajo. Conduce con moderación.'}
              {status === 'Crítico' && 'Crítico: Se requiere carga en ruta de inmediato para poder llegar al destino.'}
            </div>
          </div>

          {/* Toggle Expandir/Colapsar Detalles */}
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
            title={isExpanded ? "Ocultar detalles de ruta" : "Ver detalles de ruta"}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Resumen Compacto siempre visible */}
      <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-white/5">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-cyan-400 shrink-0" />
          <span>{durationText}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className={getStatusColor()} />
          <span>Llegada ~<strong className={getStatusColor()}>{Math.round(arrivalSoc * 100)}%</strong> ({arrivalRangeKm} km)</span>
        </div>
      </div>

      {/* Sección Desplegable de Detalles Completos */}
      {isExpanded && (
        <div className="flex flex-col gap-3 pt-1 border-t border-white/10 animate-in fade-in duration-200">
          {/* Stats Grid Detallado */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {/* Duración */}
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5 flex items-center gap-2.5">
              <Clock size={15} className="text-brand-cyan shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Tiempo estimado</span>
                <p className="text-xs font-bold text-white mt-0.5">{durationText}</p>
              </div>
            </div>

            {/* Consumo */}
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5 flex items-center gap-2.5">
              <Zap size={15} className="text-brand-lime shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Consumo neto</span>
                <p className="text-xs font-bold text-white mt-0.5">{totalConsumptionKwh.toFixed(1)} kWh</p>
              </div>
            </div>

            {/* Llegas con */}
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5 flex items-center gap-2.5">
              <MapPin size={15} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Batería restante</span>
                <p className={`text-xs font-bold mt-0.5 ${getStatusColor()}`}>{Math.round(arrivalSoc * 100)}% SoC</p>
              </div>
            </div>

            {/* Margen extra */}
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5 flex items-center gap-2.5">
              <MapPin size={15} className="text-brand-cyan shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Margen extra</span>
                <p className="text-xs font-bold text-white mt-0.5">{safetyMarginKm > 0 ? '+' : ''}{safetyMarginKm} km</p>
              </div>
            </div>
          </div>

          {/* Consejo de Conducción IA */}
          {advice && (
            <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-2 text-[10.5px] text-slate-300">
              <Sparkles size={13} className="text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong className="text-cyan-300">Recomendación:</strong> {advice}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const RouteDistanceCard = React.memo(RouteDistanceCardComponent);
