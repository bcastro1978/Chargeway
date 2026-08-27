'use client';

import React from 'react';
import Image from 'next/image';
import { Mountain, Sun, Trees, ArrowRight, CheckCircle2, MapPin } from 'lucide-react';

interface RegionCardData {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  image: string;
  alt: string;
  elevation: string;
  popularRoute: string;
  chargersCount: string;
  description: string;
  highlights: string[];
}

const REGION_CARDS: RegionCardData[] = [
  {
    id: 'sierra',
    name: 'Sierra & Cordillera',
    subtitle: 'Cotopaxi, Quito, Cuenca & Quilotoa',
    icon: <Mountain className="text-emerald-400" size={18} />,
    image: '/images/cotopaxi.png',
    alt: 'Volcán Cotopaxi y vehículo eléctrico en Ecuador',
    elevation: '3,800 m.s.n.m.',
    popularRoute: 'Quito ➔ Ambato ➔ Cuenca',
    chargersCount: '95+ Puntos de Carga',
    description: 'En los descensos prolongados de Los Andes, el frenado regenerativo recarga hasta un 15% de la batería de tu EV de forma gratuita.',
    highlights: [
      'Cálculo de desniveles en alta montaña',
      'Regeneración en pendientes de bajada',
      'Electrolineras rápidas en Aloag y Latacunga'
    ]
  },
  {
    id: 'costa',
    name: 'Costa & Ruta Spondylus',
    subtitle: 'Manta, Montañita, Salinas & Guayaquil',
    icon: <Sun className="text-amber-400" size={18} />,
    image: '/images/spondylus.png',
    alt: 'Autopista costera Ruta del Spondylus en Ecuador',
    elevation: '50 m.s.n.m.',
    popularRoute: 'Guayaquil ➔ Manta ➔ Pedernales',
    chargersCount: '65+ Puntos de Carga',
    description: 'Disfruta del clima cálido costero con rutas planas optimizadas para eficiencia aerodinámica y consumo de aire acondicionado.',
    highlights: [
      'Ajuste térmico por uso de A/C',
      'Carga rápida en gasolineras y centros comerciales',
      'Puntos estratégicos en la playa'
    ]
  },
  {
    id: 'oriente',
    name: 'Oriente & Amazonía',
    subtitle: 'Tena, Baños, Puyo & El Coca',
    icon: <Trees className="text-emerald-400" size={18} />,
    image: '/images/oriente.png',
    alt: 'Vehículo eléctrico en la selva amazónica de Ecuador',
    elevation: '600 m.s.n.m.',
    popularRoute: 'Baños ➔ Puyo ➔ Tena',
    chargersCount: '25+ Puntos de Carga',
    description: 'Adéntrate en la selva amazónica con mapa offline PWA y eco-cargadores solares ubicados en hoteles sostenibles.',
    highlights: [
      'Mapeo de eco-cargadores solares',
      'Navegación 100% offline sin señal celular',
      'Rutas ecoturísticas sin emisiones'
    ]
  }
];

interface EcuadorLandscapesShowcaseProps {
  onGoToApp: () => void;
}

export const EcuadorLandscapesShowcase: React.FC<EcuadorLandscapesShowcaseProps> = ({ onGoToApp }) => {
  return (
    <section id="regiones" className="py-20 lg:py-28 bg-[#0c0e12] relative border-t border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-emerald-400 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-block mb-3">
            Explora Ecuador Sin Límites
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Rutas Optimizadas para las 3 Regiones
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
            Desde la nieve del Cotopaxi hasta las playas del Pacífico y la selva del Oriente. ChargeWay adapta sus algoritmos a la topografía de cada región.
          </p>
        </div>

        {/* 3 Regional Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REGION_CARDS.map((card) => (
            <div
              key={card.id}
              className="bg-[#171a1f] border border-neutral-800 rounded-2xl overflow-hidden hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group shadow-xl"
            >
              <div>
                {/* Image Header */}
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171a1f] via-transparent to-black/20" />
                  
                  <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-800 text-[11px] font-bold text-white flex items-center gap-1.5">
                    {card.icon}
                    <span>{card.name}</span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-emerald-500/20 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                    {card.chargersCount}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {card.subtitle}
                  </h3>

                  <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                    {card.description}
                  </p>

                  {/* Route & Elevation pill */}
                  <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800/80 space-y-1 mb-5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500 font-semibold">Elevación Máx.:</span>
                      <span className="font-bold text-emerald-400">{card.elevation}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500 font-semibold">Ruta Frecuente:</span>
                      <span className="font-bold text-neutral-200 truncate max-w-[170px]">{card.popularRoute}</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2 mb-6">
                    {card.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-6 pt-0">
                <button
                  onClick={onGoToApp}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-emerald-500 text-neutral-200 hover:text-neutral-950 border border-neutral-800 hover:border-emerald-500 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ver Electrolineras de la Ruta</span>
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
