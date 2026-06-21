'use client';

import React from 'react';
import { AdvisorFeedback } from '@/lib/agents/RouteAdvisorAgent';
import { Bot, MapPin, Clock, Zap, HelpCircle } from 'lucide-react';

interface RouteDistanceCardProps {
  distanceKm: number;
  durationMin: number;
  totalConsumptionKwh: number;
  arrivalSoc: number;
  arrivalRangeKm: number;
  safetyMarginKm: number;
  advisorFeedback?: AdvisorFeedback;
}

export const RouteDistanceCard: React.FC<RouteDistanceCardProps> = ({
  distanceKm,
  durationMin,
  totalConsumptionKwh,
  arrivalSoc,
  arrivalRangeKm,
  safetyMarginKm,
  advisorFeedback
}) => {
  const status = advisorFeedback?.overallStatus || 'Seguro';
  const advice = advisorFeedback?.drivingStyleAdvice || 'Calculando...';

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
    <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-5 rounded-2xl flex flex-col gap-4 h-full">
      {/* Header: Distance + Status */}
      <div className="flex justify-between items-start">
        <div className="relative group cursor-help">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Distancia Total</h3>
            <HelpCircle size={12} className="text-neutral-500 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">{Math.round(distanceKm)}</span>
            <span className="text-lg text-neutral-400 font-medium">km</span>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-52 bg-neutral-950/95 text-[11px] text-neutral-300 p-2.5 rounded-lg border border-neutral-800 shadow-xl shadow-black/50 z-50 pointer-events-none">
            Longitud total de la ruta desde el origen hasta el destino final.
          </div>
        </div>
        <div className="relative group cursor-help">
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${getStatusBg()} ${getStatusColor()}`}>
            {status}
          </span>
          {/* Tooltip */}
          <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-neutral-950/95 text-[11px] text-neutral-300 p-2.5 rounded-lg border border-neutral-800 shadow-xl shadow-black/50 z-50 pointer-events-none">
            {status === 'Seguro' && 'Seguro: Tienes suficiente autonomía para completar el viaje sin paradas extras.'}
            {status === 'Precaución' && 'Precaución: El nivel de batería al llegar es bajo. Conduce con moderación.'}
            {status === 'Crítico' && 'Crítico: Se requiere carga en ruta de inmediato para poder llegar al destino.'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Duración */}
        <div className="bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/50 flex items-center gap-3 relative group cursor-help">
          <Clock size={16} className="text-blue-400 shrink-0" />
          <div>
            <span className="text-xs text-neutral-500 block">Duración</span>
            <p className="text-sm font-bold text-white">{durationText}</p>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 bg-neutral-950/95 text-[11px] text-neutral-300 p-2.5 rounded-lg border border-neutral-800 shadow-xl shadow-black/50 z-50 pointer-events-none">
            Tiempo de viaje estimado basado en las condiciones de tráfico en tiempo real.
          </div>
        </div>

        {/* Consumo */}
        <div className="bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/50 flex items-center gap-3 relative group cursor-help">
          <Zap size={16} className="text-amber-400 shrink-0" />
          <div>
            <span className="text-xs text-neutral-500 block">Consumo</span>
            <p className="text-sm font-bold text-white">{totalConsumptionKwh.toFixed(1)} kWh</p>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 bg-neutral-950/95 text-[11px] text-neutral-300 p-2.5 rounded-lg border border-neutral-800 shadow-xl shadow-black/50 z-50 pointer-events-none">
            Energía total estimada que consumirá el motor de tu vehículo en esta ruta.
          </div>
        </div>

        {/* Llegas con */}
        <div className="bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/50 flex items-center gap-3 relative group cursor-help">
          <MapPin size={16} className="text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs text-neutral-500 block">Llegas con</span>
            <p className={`text-sm font-bold ${getStatusColor()}`}>{Math.round(arrivalSoc * 100)}%</p>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 bg-neutral-950/95 text-[11px] text-neutral-300 p-2.5 rounded-lg border border-neutral-800 shadow-xl shadow-black/50 z-50 pointer-events-none">
            Porcentaje de batería y autonomía restante estimados al arribar al destino final.
          </div>
        </div>

        {/* Margen extra */}
        <div className="bg-neutral-950/50 rounded-xl p-3 border border-neutral-800/50 flex items-center gap-3 relative group cursor-help">
          <MapPin size={16} className="text-cyan-400 shrink-0" />
          <div>
            <span className="text-xs text-neutral-500 block">Margen extra</span>
            <p className="text-sm font-bold text-white">{safetyMarginKm > 0 ? '+' : ''}{safetyMarginKm} km</p>
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 bg-neutral-950/95 text-[11px] text-neutral-300 p-2.5 rounded-lg border border-neutral-800 shadow-xl shadow-black/50 z-50 pointer-events-none">
            Kilómetros de reserva que te sobrarán en la batería tras llegar a tu destino.
          </div>
        </div>
      </div>
    </div>
  );
};
