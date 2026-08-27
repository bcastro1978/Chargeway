'use client';

import React from 'react';
import { MapPin, Zap } from 'lucide-react';

interface OurNetworkSectionProps {
  onGoToApp: () => void;
}

const NETWORK_STATIONS = [
  {
    id: 'centro-historico',
    title: 'Centro Histórico',
    city: 'Quito, Ecuador',
    description: 'Punto de recarga premium en el casco colonial de Quito. Equipado con cargadores 22 kW AC y 50 kW DC rápido.',
    image: '/images/bento/real_estaciones.png',
    power: '50 kW DC',
  },
  {
    id: 'la-carolina',
    title: 'Parque La Carolina',
    city: 'Quito, Ecuador',
    description: 'Hub financiero y comercial con alta disponibilidad de conectores CCS2 y GB/T en parqueaderos vigilados.',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    power: '22 kW AC',
  },
  {
    id: 'cumbaya-valley',
    title: 'Valle de Cumbayá',
    city: 'Quito, Ecuador',
    description: 'Estaciones en centros comerciales y restaurantes con reserva garantizada desde la app.',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
    power: '7.4 kW AC',
  },
];

export const OurNetworkSection: React.FC<OurNetworkSectionProps> = ({ onGoToApp }) => {
  return (
    <section className="w-full py-12 px-4 sm:px-6 bg-[#081610] rounded-3xl border border-[#00FF87]/20 my-6 shadow-2xl">
      <div className="max-w-6xl mx-auto space-y-8 text-center">

        {/* Section Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00FF87]/10 text-[#00FF87] text-xs font-semibold uppercase tracking-wider">
            <MapPin size={13} />
            <span>Infraestructura Verificada</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase">
            Red de Electrolineras en Ecuador
          </h2>
          <div className="w-16 h-0.5 bg-[#00FF87] mx-auto" />
        </div>

        {/* 3-Column Luxury Station Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {NETWORK_STATIONS.map((station) => (
            <div
              key={station.id}
              onClick={onGoToApp}
              className="bg-[#0D1A14] border border-[#1A3028] hover:border-[#00FF87]/50 rounded-2xl overflow-hidden shadow-md hover:shadow-[0_0_20px_rgba(0,255,135,0.15)] transition-all group flex flex-col justify-between cursor-pointer"
            >
              {/* Image Container */}
              <div className="h-44 overflow-hidden relative">
                <img
                  src={station.image}
                  alt={station.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1A14] via-transparent to-transparent" />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#05110C]/80 backdrop-blur-md border border-[#00FF87]/40 text-[#00FF87] text-[10px] font-bold flex items-center gap-1">
                  <Zap size={11} />
                  <span>{station.power}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-2">
                <span className="text-[10px] uppercase font-mono text-[#00FF87] font-semibold tracking-wider block">
                  {station.city}
                </span>
                <h3 className="text-base font-bold text-white font-sans group-hover:text-[#00FF87] transition-colors">
                  {station.title}
                </h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  {station.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
