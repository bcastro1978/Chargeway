'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BatteryCharging, Shield, Sparkles, MapPin, Zap } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#05110C] text-white pt-24 pb-20 lg:pt-32 lg:pb-24 border-b border-[#00FF87]/15">
      {/* Background Neon Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#00FF87]/15 via-emerald-900/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-32 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] font-semibold text-xs mb-6 shadow-[0_0_15px_rgba(0,255,135,0.15)]">
          <Sparkles size={14} className="text-[#00FF87] animate-pulse" />
          <span>Movilidad Eléctrica Inteligente en Ecuador</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-white font-sans leading-tight">
          Tu viaje eléctrico, <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-[#00FF87] via-emerald-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(0,255,135,0.3)]">
            sin límites ni ansiedad.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-neutral-300 max-w-3xl mx-auto mb-10 leading-relaxed font-sans">
          ChargeWay calcula tu autonomía real adaptada a la <strong>topografía andina</strong>, encuentra electrolineras en tiempo real y te permite <strong>reservar parqueaderos con recarga</strong> con total tranquilidad.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-12">
          <Link
            href="/app"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#00FF87] hover:bg-[#00E077] text-[#030A07] font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(0,255,135,0.4)] hover:scale-105 active:scale-95 transition-all"
          >
            <span>Abrir Planificador Web</span>
            <ArrowRight size={18} />
          </Link>
          <a
            href="#calculadora"
            className="w-full sm:w-auto px-7 py-4 rounded-full bg-[#081C14] hover:bg-[#0E2E21] border border-[#00FF87]/40 text-neutral-200 font-semibold text-sm flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-sm"
          >
            <BatteryCharging size={18} className="text-[#00FF87]" />
            <span>Calcular Ahorro</span>
          </a>
        </div>

        {/* Quick Highlights / Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-[#1A3028]">
          <div className="bg-[#081610]/80 border border-[#1A3028] p-3.5 rounded-2xl">
            <div className="text-xl sm:text-2xl font-black text-[#00FF87]">150+</div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Puntos de Carga</div>
          </div>
          <div className="bg-[#081610]/80 border border-[#1A3028] p-3.5 rounded-2xl">
            <div className="text-xl sm:text-2xl font-black text-[#00FF87]">88%</div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Eficiencia Topográfica</div>
          </div>
          <div className="bg-[#081610]/80 border border-[#1A3028] p-3.5 rounded-2xl">
            <div className="text-xl sm:text-2xl font-black text-[#00FF87]">5 Gratis</div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Reservas Mes / Host</div>
          </div>
          <div className="bg-[#081610]/80 border border-[#1A3028] p-3.5 rounded-2xl">
            <div className="text-xl sm:text-2xl font-black text-[#00FF87]">ARCONEL</div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Compliance Legal</div>
          </div>
        </div>
      </div>
    </section>
  );
};
