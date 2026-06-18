'use client';

import React from 'react';
import { AdvisorFeedback } from '@/lib/agents/RouteAdvisorAgent';
import { Bot, AlertTriangle, ShieldCheck, ThermometerSnowflake, Wind } from 'lucide-react';

interface TranquilityIndexProps {
  marginKm: number;
  arrivalSoc: number;
  arrivalRangeKm: number;
  label: string;
  advisorFeedback?: AdvisorFeedback;
}

export const TranquilityIndex: React.FC<TranquilityIndexProps> = ({
  marginKm,
  arrivalSoc,
  arrivalRangeKm,
  label,
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

  const getBgColor = () => {
    switch (status) {
      case 'Seguro': return 'bg-emerald-500';
      case 'Precaución': return 'bg-amber-500';
      case 'Crítico': return 'bg-rose-500';
      default: return 'bg-emerald-500';
    }
  };

  return (
    <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-neutral-300">{label}</h3>
        <span className={`font-bold uppercase text-sm ${getStatusColor()}`}>
          {status}
        </span>
      </div>
      
      {/* Battery Bar */}
      <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${getBgColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, arrivalSoc * 100))}%` }} 
        />
      </div>

      <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-white">{marginKm > 0 ? '+' : ''}{marginKm}</span>
            <span className="text-neutral-400 text-sm">km extra</span>
          </div>
          <span className="text-xs text-neutral-500">margen de seguridad</span>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {Math.round(arrivalSoc * 100)}%
          </div>
          <div className="text-xs text-neutral-400">
            {arrivalRangeKm} km al llegar
          </div>
        </div>
      </div>

      {/* AI Advisor Panel */}
      <div className="bg-neutral-950/50 rounded-xl p-4 border border-neutral-800/50 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-blue-400" />
          <span className="text-sm font-semibold text-blue-400">Asistente de Ruta (IA)</span>
        </div>
        
        <p className="text-sm text-neutral-300 leading-relaxed">
          {advice}
        </p>

        {advisorFeedback?.weatherWarning && (
          <div className="flex items-start gap-2 bg-rose-500/10 text-rose-400 p-3 rounded-lg border border-rose-500/20">
            <Wind size={16} className="shrink-0 mt-0.5" />
            <span className="text-xs">{advisorFeedback.weatherWarning}</span>
          </div>
        )}

        {advisorFeedback?.speedLimitRecommendation && (
          <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
            <span className="text-xs text-neutral-400">Velocidad sugerida</span>
            <span className="text-sm font-bold text-white bg-neutral-800 px-3 py-1 rounded-md border border-neutral-700">
              {advisorFeedback.speedLimitRecommendation} km/h
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
