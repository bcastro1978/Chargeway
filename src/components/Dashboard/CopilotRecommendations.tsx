'use client';

import React from 'react';
import { Bot, Navigation, Gauge, Zap, TrendingUp, TrendingDown, Minus, Sparkles, BatteryCharging } from 'lucide-react';
import { SegmentTip, AdvisorFeedback } from '@/lib/agents/RouteAdvisorAgent';

interface CopilotRecommendationsProps {
  advisorFeedback?: AdvisorFeedback | null;
  segmentTips?: SegmentTip[];
}

const DEFAULT_RECOMMENDATIONS = [
  {
    type: 'subida' as const,
    title: 'Subida Leve',
    startKm: 0.1,
    endKm: 6.5,
    advice: 'Usa control de crucero para estabilizar consumo.',
    speedRecommendation: 72,
    regenLevel: 'Bajo' as const,
  },
  {
    type: 'plano' as const,
    title: 'Plano - Eficiente',
    startKm: 52.5,
    endKm: 81.5,
    advice: 'Mantén ritmo constante y activa el modo ECO.',
    speedRecommendation: 80,
    regenLevel: 'Medio' as const,
  },
  {
    type: 'bajada' as const,
    title: 'Bajada Leve',
    startKm: 93.8,
    endKm: 98.2,
    advice: 'Aprovecha inercia del auto. Regeneración en nivel alto.',
    speedRecommendation: 80,
    regenLevel: 'Alto' as const,
  }
];

export const CopilotRecommendations: React.FC<CopilotRecommendationsProps> = ({ advisorFeedback, segmentTips }) => {
  const tips = segmentTips && segmentTips.length > 0 ? segmentTips : advisorFeedback?.segmentTips;
  const tipsToDisplay = tips && tips.length > 0 ? tips : DEFAULT_RECOMMENDATIONS;

  const geminiSummary = advisorFeedback?.geminiSummary;
  const geminiChargingAdvice = advisorFeedback?.geminiChargingAdvice;

  return (
    <div className="glass-card p-5 space-y-4 w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#133D2D] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#00F59B]/15 border border-[#00F59B]/40 flex items-center justify-center text-[#00F59B]">
            <Bot size={16} />
          </div>
          <h3 className="text-xs font-bold text-[#84A999] uppercase tracking-wider flex items-center gap-2">
            RECOMENDACIONES DEL COPILOTO EV
            {geminiSummary && (
              <span className="flex items-center gap-1 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono normal-case">
                <Sparkles size={10} className="text-purple-400" />
                Gemini AI
              </span>
            )}
          </h3>
        </div>

        {advisorFeedback?.overallStatus && (
          <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${
            advisorFeedback.overallStatus === 'Seguro' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : advisorFeedback.overallStatus === 'Precaución'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {advisorFeedback.overallStatus.toUpperCase()}
          </span>
        )}
      </div>

      {/* Gemini AI Natural Language Summary Block */}
      {geminiSummary && (
        <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
            <Sparkles size={14} className="text-purple-400" />
            <span>Análisis IA de Ruta</span>
          </div>
          <p className="text-xs text-purple-200/90 leading-relaxed font-sans">
            {geminiSummary}
          </p>

          {geminiChargingAdvice && (
            <div className="flex items-start gap-2 pt-2 border-t border-purple-500/20 text-xs text-emerald-300 font-mono">
              <BatteryCharging size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{geminiChargingAdvice}</span>
            </div>
          )}
        </div>
      )}

      {/* Horizontal Recommendation Stream */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tipsToDisplay.slice(0, 3).map((tip, idx) => {
          const isSubida = tip.type === 'subida' || (tip.title && tip.title.toLowerCase().includes('subida'));
          const isBajada = tip.type === 'bajada' || (tip.title && tip.title.toLowerCase().includes('bajada'));

          const rangeLabel = tip.startKm !== undefined && tip.endKm !== undefined
            ? `${tip.startKm} - ${tip.endKm} km`
            : (tip as any).range || 'Ruta';

          return (
            <div 
              key={idx}
              className="bg-[#04160F] border border-[#133D2D] hover:border-[#00F59B]/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all"
            >
              
              {/* Badge & Distance Range */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isSubida && <TrendingUp size={14} className="text-amber-400" />}
                  {isBajada && <TrendingDown size={14} className="text-[#00F59B]" />}
                  {!isSubida && !isBajada && <Minus size={14} className="text-cyan-400" />}
                  <span className="text-xs font-bold text-white">{tip.title}</span>
                </div>
                <span className="text-[10px] font-mono text-[#84A999] bg-[#0A1F17] px-2 py-0.5 rounded-full border border-[#133D2D]">
                  {rangeLabel}
                </span>
              </div>

              {/* Advice Content */}
              <p className="text-xs text-[#84A999] leading-snug font-medium">
                {tip.advice}
              </p>

              {/* Speed & Mode Indicators */}
              <div className="flex items-center justify-between pt-2 border-t border-[#133D2D]/60 text-[10px] font-mono">
                <div className="flex items-center gap-1.5 bg-[#0A1F17] px-2.5 py-1 rounded-xl border border-[#133D2D]">
                  <Gauge size={12} className="text-[#00F59B]" />
                  <span className="text-white font-bold">{tip.speedRecommendation || (tip as any).speedLimit || 80} <span className="text-[9px] text-[#84A999]">km/h</span></span>
                </div>

                <div className="flex items-center gap-1 bg-[#00F59B]/10 text-[#00F59B] px-2 py-1 rounded-xl border border-[#00F59B]/30 font-bold">
                  <Zap size={10} className="fill-[#00F59B]" />
                  <span>{tip.regenLevel ? `Regen ${tip.regenLevel}` : (tip as any).mode || 'Eco Drive'}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
