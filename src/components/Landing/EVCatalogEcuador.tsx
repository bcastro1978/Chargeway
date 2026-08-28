'use client';

import React, { useState } from 'react';
import { Car, Zap, DollarSign, ShieldCheck, Check, Sparkles, Filter } from 'lucide-react';

export interface EVModelItem {
  id: string;
  brand: string;
  name: string;
  priceUsd: number;
  rangeKm: number;
  batteryKwh: number;
  connectorType: 'GB/T' | 'CCS2';
  segment: 'City EV' | 'SUV Compacto' | 'SUV Familiar' | 'Sedán Premium';
  imageUrl: string;
  warranty: string;
}

export const ECUADOR_EV_MODELS: EVModelItem[] = [
  {
    id: 'byd-seagull',
    brand: 'BYD',
    name: 'Seagull (Dolphin Mini)',
    priceUsd: 19990,
    rangeKm: 380,
    batteryKwh: 38.0,
    connectorType: 'GB/T',
    segment: 'City EV',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    warranty: '8 Años / 150,000 km',
  },
  {
    id: 'byd-yuan-pro',
    brand: 'BYD',
    name: 'Yuan Pro (Atto 3)',
    priceUsd: 26990,
    rangeKm: 410,
    batteryKwh: 45.1,
    connectorType: 'GB/T',
    segment: 'SUV Compacto',
    imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80',
    warranty: '8 Años / 150,000 km',
  },
  {
    id: 'gac-aion-y',
    brand: 'GAC Motor',
    name: 'Aion Y Plus',
    priceUsd: 28500,
    rangeKm: 490,
    batteryKwh: 63.2,
    connectorType: 'GB/T',
    segment: 'SUV Familiar',
    imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80',
    warranty: '8 Años / 160,000 km',
  },
  {
    id: 'chevrolet-spark-euv',
    brand: 'Chevrolet',
    name: 'Bolt EUV / Equinox EV',
    priceUsd: 34990,
    rangeKm: 450,
    batteryKwh: 65.0,
    connectorType: 'CCS2',
    segment: 'SUV Familiar',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    warranty: '8 Años / 160,000 km',
  },
  {
    id: 'neta-aya',
    brand: 'Neta Auto (Amba)',
    name: 'NETA AYA',
    priceUsd: 21990,
    rangeKm: 401,
    batteryKwh: 40.7,
    connectorType: 'GB/T',
    segment: 'City EV',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    warranty: '8 Años / 150,000 km',
  },
];

export const EVCatalogEcuador: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<string>('todos');

  const filteredModels = selectedSegment === 'todos'
    ? ECUADOR_EV_MODELS
    : ECUADOR_EV_MODELS.filter(m => m.segment.toLowerCase().includes(selectedSegment.toLowerCase()));

  return (
    <div className="bg-[#0D1A14]/95 backdrop-blur-2xl border border-[#1A3028] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xl h-full font-sans">
      
      {/* Header */}
      <div className="space-y-1 border-b border-[#1A3028] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Car size={18} />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">Catálogo Oficial 2026</span>
              <h3 className="text-sm font-extrabold text-white leading-tight">Modelos EV en Ecuador</h3>
            </div>
          </div>
          <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full">
            Mercado Nacional
          </span>
        </div>
      </div>

      {/* Segment Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-none">
        {['todos', 'City EV', 'SUV Compacto', 'SUV Familiar'].map((seg) => (
          <button
            key={seg}
            onClick={() => setSelectedSegment(seg)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 capitalize ${
              selectedSegment === seg
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#080E18] text-neutral-400 border border-[#1A3028] hover:text-white'
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin scrollbar-thumb-emerald-500/20">
        {filteredModels.map((item) => (
          <div
            key={item.id}
            className="bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl p-3 transition-all duration-300 flex gap-3 items-center"
          >
            {/* Image */}
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-emerald-500/20 bg-neutral-900 relative">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 font-bold">
                {item.connectorType}
              </span>
            </div>

            {/* Spec Details */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-emerald-400 font-bold">{item.brand}</span>
                <span className="text-xs font-black text-white font-mono">${item.priceUsd.toLocaleString()} USD</span>
              </div>

              <h4 className="text-xs font-bold text-white truncate leading-tight">{item.name}</h4>

              <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-neutral-400 pt-0.5">
                <span className="bg-[#050C09] px-2 py-0.5 rounded border border-[#1A3028]">
                  ⚡ {item.rangeKm} km Autonomía
                </span>
                <span className="bg-[#050C09] px-2 py-0.5 rounded border border-[#1A3028]">
                  🔋 {item.batteryKwh} kWh
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="bg-[#050C09] border border-emerald-500/20 rounded-2xl p-2.5 flex items-center justify-between text-[9px] font-mono text-neutral-300">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <ShieldCheck size={12} />
          Exentos de IVA (0%), ICE (0%) y Aranceles
        </span>
        <span className="text-neutral-400">AEADE 2026</span>
      </div>

    </div>
  );
};
