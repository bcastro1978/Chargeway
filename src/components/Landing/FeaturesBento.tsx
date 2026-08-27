'use client';

import React from 'react';
import { Route, Zap, Leaf } from 'lucide-react';

interface FeaturesBentoProps {
  onGoToApp: () => void;
}

export const FeaturesBento: React.FC<FeaturesBentoProps> = ({ onGoToApp }) => {
  return (
    <section className="w-full py-8">
      
      {/* 3 Horizontal Bento Cards matching Image 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Feature 1: Rutas Inteligentes */}
        <div 
          onClick={onGoToApp}
          className="bg-[#061610] border border-[#00FF87]/30 hover:border-[#00FF87] rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,255,135,0.2)] cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87] group-hover:scale-110 transition-transform">
            <Route size={24} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-sans tracking-tight">
              Rutas Inteligentes
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Optimización basada en topografía real y clima andino.
            </p>
          </div>
        </div>

        {/* Feature 2: Disponibilidad Real */}
        <div 
          onClick={onGoToApp}
          className="bg-[#061610] border border-[#00FF87]/30 hover:border-[#00FF87] rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,255,135,0.2)] cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87] group-hover:scale-110 transition-transform">
            <Zap size={24} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-sans tracking-tight">
              Disponibilidad Real
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Telemetría en vivo de cargadores CCS2, GB/T y Tipo 2 con estado ocupado/libre en tiempo real.
            </p>
          </div>
        </div>

        {/* Feature 3: Inteligencia Sostenible */}
        <div 
          onClick={onGoToApp}
          className="bg-[#061610] border border-[#00FF87]/30 hover:border-[#00FF87] rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,255,135,0.2)] cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87] group-hover:scale-110 transition-transform">
            <Leaf size={24} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-sans tracking-tight">
              Inteligencia Sostenible
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Historial de ahorro y reportes de reducción de CO2 certificados para incentivos fiscales.
            </p>
          </div>
        </div>

      </div>

    </section>
  );
};
