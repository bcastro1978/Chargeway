'use client';

import React from 'react';

interface PremiumServicesSectionProps {
  onGoToApp: () => void;
}

export const PremiumServicesSection: React.FC<PremiumServicesSectionProps> = ({ onGoToApp }) => {
  return (
    <section className="w-full py-12 px-2 bg-[#FAF7F2] rounded-3xl border border-[#D4AF37]/20 my-6 shadow-sm">
      <div className="max-w-5xl mx-auto space-y-10 text-center">

        {/* Section Title (Matching Screenshot) */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-[0.15em] text-[#1E293B] uppercase">
            PREMIUM SERVICES
          </h2>
          <div className="w-16 h-0.5 bg-[#C5A059] mx-auto" />
        </div>

        {/* 3 Minimalist Icon Columns (Matching Screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Service 1: Concierge */}
          <div 
            onClick={onGoToApp}
            className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl hover:bg-[#F3EFE6] transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] shadow-sm group-hover:scale-110 transition-transform">
              {/* Concierge Icon SVG */}
              <svg className="w-7 h-7 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3 className="text-base font-serif font-bold text-[#1E293B] tracking-wider uppercase">
              Concierge
            </h3>
            <p className="text-xs text-[#64748B] font-serif leading-relaxed max-w-xs">
              Concierge with white glove accessible premium assistant and real-time support.
            </p>
          </div>

          {/* Service 2: Fast Charging */}
          <div 
            onClick={onGoToApp}
            className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl hover:bg-[#F3EFE6] transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] shadow-sm group-hover:scale-110 transition-transform">
              {/* Fast Charging Lightning Icon SVG */}
              <svg className="w-7 h-7 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="text-base font-serif font-bold text-[#1E293B] tracking-wider uppercase">
              Fast Charging
            </h3>
            <p className="text-xs text-[#64748B] font-serif leading-relaxed max-w-xs">
              Fast charging in commercial and interprovincial routes with ARCONEL standards.
            </p>
          </div>

          {/* Service 3: Lounge */}
          <div 
            onClick={onGoToApp}
            className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl hover:bg-[#F3EFE6] transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] shadow-sm group-hover:scale-110 transition-transform">
              {/* Lounge Armchair Icon SVG */}
              <svg className="w-7 h-7 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5h16.5m-16.5 0V6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v1.5" />
              </svg>
            </div>
            <h3 className="text-base font-serif font-bold text-[#1E293B] tracking-wider uppercase">
              Lounge
            </h3>
            <p className="text-xs text-[#64748B] font-serif leading-relaxed max-w-xs">
              Sanctuary amenities, wifi, specialty coffee, and lounge comfort while charging.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
