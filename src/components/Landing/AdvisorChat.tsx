'use client';

import React from 'react';
import { AdvisorResponse } from '@/lib/agents/EVSalesAdvisor';

interface AdvisorChatProps {
  advisorData: AdvisorResponse | null;
  loading: boolean;
}

export default function AdvisorChat({ advisorData, loading }: AdvisorChatProps) {
  return (
    <div className="w-full bg-surface-container-low rounded-xl border border-secondary-container shadow-[0_4px_20px_rgba(13,92,58,0.05)] overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-surface-container border-b border-secondary-container flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container relative">
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary-fixed rounded-full border-2 border-surface-container"></span>
        </div>
        <div>
          <h3 className="font-label-md text-label-md text-primary m-0">ChargeWay AI</h3>
          <p className="font-label-sm text-[10px] text-on-surface-variant m-0 uppercase tracking-wider">Asesor de Ventas EV</p>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Intro Message */}
        <div className="flex gap-3">
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary-container/50 flex items-center justify-center text-primary text-sm mt-1">
            <span className="material-symbols-outlined text-sm">smart_toy</span>
          </div>
          <div className="bg-surface-container rounded-2xl rounded-tl-sm p-3 text-on-surface-variant font-body-md text-sm border border-secondary-container/50">
            Hola, soy tu asesor virtual experto en vehículos eléctricos. Ajusta tus kilómetros diarios arriba y calcularé qué auto se adapta mejor a ti basándome en miles de reseñas de usuarios reales.
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary-container/50 flex items-center justify-center text-primary text-sm mt-1">
              <span className="material-symbols-outlined text-sm">smart_toy</span>
            </div>
            <div className="bg-surface-container rounded-2xl rounded-tl-sm p-3 border border-secondary-container/50 flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}

        {/* Advisor Response */}
        {!loading && advisorData && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary-container/50 flex items-center justify-center text-primary text-sm mt-1 shadow-[0_0_10px_rgba(80,224,133,0.3)]">
              <span className="material-symbols-outlined text-sm">smart_toy</span>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tl-sm p-4 text-on-surface-variant font-body-md text-sm space-y-3">
              <div dangerouslySetInnerHTML={{ __html: advisorData.recommendationText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-semibold">$1</strong>') }} />
              
              {advisorData.recommendedModel && (
                <div className="mt-3 bg-surface-container-highest rounded-lg p-3 flex items-center gap-3 border border-secondary-container/50">
                  <div className="w-12 h-12 rounded bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">{advisorData.recommendedModel.image}</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-primary m-0">{advisorData.recommendedModel.brand} {advisorData.recommendedModel.name}</h4>
                    <p className="font-label-sm text-xs text-on-surface-variant m-0">Autonomía: {advisorData.recommendedModel.rangeKm} km • {advisorData.recommendedModel.seats} Pasajeros</p>
                  </div>
                  <button className="ml-auto bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-secondary-container bg-surface-container/50 flex items-center gap-2">
        <input 
          type="text" 
          placeholder="Pregúntame sobre modelos o autonomía..." 
          className="flex-1 bg-surface-container-highest border border-secondary-container rounded-full px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          disabled
        />
        <button disabled className="w-10 h-10 rounded-full bg-surface-container-highest text-primary flex items-center justify-center disabled:opacity-50">
          <span className="material-symbols-outlined text-sm">send</span>
        </button>
      </div>
    </div>
  );
}
