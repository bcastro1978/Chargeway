'use client';

import React from 'react';
import { Car, Mountain, Plug, Smartphone, ArrowRight, ShieldCheck, Target } from 'lucide-react';

interface ChargeWayShowcaseProps {
  onGoToApp?: () => void;
}

export const ChargeWayShowcase: React.FC<ChargeWayShowcaseProps> = ({ onGoToApp }) => {
  return (
    <div className="bg-[#0D1A14]/95 backdrop-blur-2xl border border-[#1A3028] rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-2xl h-full font-sans">
      
      {/* Header con Texto Exacto del Usuario */}
      <div className="space-y-1.5 border-b border-[#1A3028] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Logo ChargeWay */}
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] shrink-0 overflow-hidden">
              <img
                src="/logo.png"
                alt="ChargeWay Logo"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-1">
                  ⚡ ChargeWay: <span className="text-emerald-400">Conduce con Tranquilidad Eléctrica</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-neutral-300 leading-relaxed font-sans pt-1">
          ChargeWay es mucho más que un mapa; es tu copiloto inteligente diseñado exclusivamente para la movilidad eléctrica en Ecuador. Nuestra misión es eliminar tu preocupación y darte la confianza absoluta para viajar a donde quieras.
        </p>

        {/* Section Subtitle */}
        <div className="flex items-center gap-1.5 text-xs font-black text-white pt-1">
          <Target size={14} className="text-emerald-400" />
          <span>¿Qué hace ChargeWay por ti?</span>
        </div>
      </div>

      {/* ══ BENTO GRID CON FOTOS QUE REPRESENTAN EXACTAMENTE CADA DESCRIPCIÓN ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[400px] pr-1 scrollbar-thin scrollbar-thumb-emerald-500/20">
        
        {/* CARD 1: Planificación Inteligente y Personalizada */}
        <div className="bg-[#080E18] border border-emerald-500/30 hover:border-emerald-400/60 p-3 rounded-2xl transition-all duration-300 flex flex-col justify-between space-y-2 group shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-emerald-400 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
              <Car size={15} className="text-emerald-400 shrink-0" />
              <span>Planificación Inteligente y Personalizada</span>
            </h4>
            
            {/* Foto 1: Conductor seleccionando modelo de auto y batería en celular */}
            <div className="bg-[#050C09] border border-[#1A3028] rounded-xl overflow-hidden h-28 relative group-hover:border-emerald-500/40 transition-colors shadow-md">
              <img
                src="/images/bento/card1_planificacion.png"
                alt="Selección de marca, modelo y porcentaje de batería del auto eléctrico"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          <p className="text-[10px] text-neutral-300 leading-relaxed font-sans">
            No todos los autos eléctricos son iguales. Al seleccionar la marca, modelo y el porcentaje de batería actual de tu vehículo, ChargeWay calcula tu autonomía real adaptándose a las especificaciones exactas de tu auto.
          </p>
        </div>

        {/* CARD 2: Cálculo Topográfico de Precisión */}
        <div className="bg-[#080E18] border border-emerald-500/30 hover:border-emerald-400/60 p-3 rounded-2xl transition-all duration-300 flex flex-col justify-between space-y-2 group shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-emerald-400 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
              <Mountain size={15} className="text-emerald-400 shrink-0" />
              <span>Cálculo Topográfico de Precisión</span>
            </h4>

            {/* Foto 2: Auto en carretera de montaña con altimetría (Sierra a Costa) */}
            <div className="bg-[#050C09] border border-[#1A3028] rounded-xl overflow-hidden h-28 relative group-hover:border-emerald-500/40 transition-colors shadow-md">
              <img
                src="/images/bento/real_topografia.png"
                alt="Carretera de montaña con cálculo de elevación de ruta Sierra a Costa"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          <p className="text-[10px] text-neutral-300 leading-relaxed font-sans">
            No es lo mismo conducir en la costa que subir a la sierra. Nuestro algoritmo analiza la elevación y topografía exacta de tu ruta (subidas y bajadas) para calcular el consumo de energía y con cuánta batería llegarás a tu destino.
          </p>
        </div>

        {/* CARD 3: Estaciones de Carga Siempre a la Vista */}
        <div className="bg-[#080E18] border border-emerald-500/30 hover:border-emerald-400/60 p-3 rounded-2xl transition-all duration-300 flex flex-col justify-between space-y-2 group shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-emerald-400 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
              <Plug size={15} className="text-emerald-400 shrink-0" />
              <span>Estaciones de Carga Siempre a la Vista</span>
            </h4>

            {/* Foto 3: Auto eléctrico cargando en estación de ruta */}
            <div className="bg-[#050C09] border border-[#1A3028] rounded-xl overflow-hidden h-28 relative group-hover:border-emerald-500/40 transition-colors shadow-md">
              <img
                src="/images/bento/real_estaciones.png"
                alt="Electrolineras e iluminación de puntos de carga en ruta a menos de 5km"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          <p className="text-[10px] text-neutral-300 leading-relaxed font-sans">
            A medida que planificas tu viaje, la plataforma identifica e ilumina automáticamente todas las electrolineras y puntos de carga compatibles que se encuentran a menos de 5 km de tu trayecto, para que sepas exactamente dónde recargar sin desviarte.
          </p>
        </div>

        {/* CARD 4: Instalación Rápida y Ligera (PWA) */}
        <div className="bg-[#080E18] border border-emerald-500/30 hover:border-emerald-400/60 p-3 rounded-2xl transition-all duration-300 flex flex-col justify-between space-y-2 group shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-emerald-400 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
              <Smartphone size={15} className="text-emerald-400 shrink-0" />
              <span>Instalación Rápida y Ligera (PWA)</span>
            </h4>

            {/* Foto 4: Aplicación Web Progresiva PWA instalable en 1-clic */}
            <div className="bg-[#050C09] border border-[#1A3028] rounded-xl overflow-hidden h-28 relative group-hover:border-emerald-500/40 transition-colors shadow-md">
              <img
                src="/images/bento/real_pwa.png"
                alt="Instalación directa de Aplicación Web Progresiva PWA en el celular"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          <p className="text-[10px] text-neutral-300 leading-relaxed font-sans">
            No necesitas buscar en tiendas de aplicaciones ni descargar archivos pesados. ChargeWay es una Aplicación Web Progresiva (PWA): puedes instalarla en tu celular con un solo botón directamente desde tu navegador, funcionando con la rapidez y fluidez de una app nativa sin consumir espacio innecesario.
          </p>
        </div>

      </div>

      {/* Footer Call to Action (CTA) con Botón Idéntico de la Navbar */}
      <div className="pt-2 border-t border-[#1A3028] space-y-2">
        <div className="flex justify-center">
          <button
            onClick={onGoToApp}
            className="group relative inline-flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full bg-gradient-to-r from-[#047857] via-[#10B981] to-[#059669] text-white font-semibold text-xs tracking-normal border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:shadow-[0_0_30px_rgba(52,211,153,0.65)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden font-sans"
          >
            <span>Abrir Planificador Web</span>
            <div className="w-6 h-6 rounded-full bg-[#34D399] text-slate-950 flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 group-hover:translate-x-0.5 transition-transform">
              →
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 px-1">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <ShieldCheck size={11} />
            Aplicación Web Progresiva (PWA) • 100% Gratuita en Ecuador
          </span>
          <span>ChargeWay Ecuador</span>
        </div>
      </div>

    </div>
  );
};
