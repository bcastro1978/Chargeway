'use client';

import React from 'react';
import Link from 'next/link';
import { Leaf, ArrowRight, BatteryCharging } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#F9FAFB] text-[#1F2937] pt-24 pb-32 lg:pt-36 lg:pb-40">
      {/* Organic Background Shapes */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-[#E0F2FE] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] opacity-60 blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-[#DCFCE7] rounded-[60%_40%_30%_70%/50%_40%_60%_50%] opacity-60 blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10 text-center max-w-5xl">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#10B981]/10 text-[#059669] font-medium text-sm mb-8">
          <Leaf size={16} />
          <span>Un paso hacia un futuro más limpio</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-[#111827]">
          Tu viaje eléctrico, <br className="hidden md:block" />
          <span className="text-[#059669]">sin complicaciones.</span>
        </h1>
        
        <p className="text-xl text-[#4B5563] max-w-2xl mx-auto mb-12 leading-relaxed">
          ChargeWay te ayuda a planificar tus rutas, encontrar puntos de carga y descubrir 
          cuánto dinero puedes ahorrar mientras cuidas el planeta.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/app" 
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#059669] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#047857] transition-all hover:scale-105 shadow-lg shadow-[#059669]/20"
          >
            Comenzar a planificar
            <ArrowRight size={20} />
          </Link>
          <a 
            href="#calculadora" 
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-[#374151] border border-[#E5E7EB] font-semibold flex items-center justify-center gap-2 hover:bg-[#F3F4F6] transition-all shadow-sm"
          >
            <BatteryCharging size={20} className="text-[#0ea5e9]" />
            Calcula tu ahorro
          </a>
        </div>
      </div>
    </section>
  );
};
