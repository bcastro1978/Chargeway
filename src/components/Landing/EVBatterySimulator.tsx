'use client';

import React, { useState } from 'react';
import { BatteryCharging, ShieldCheck, ThermometerSun, Zap, Activity, Info, Award, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export type BatteryTech = 'LFP' | 'NCM';
export type EcuadorRegion = 'sierra' | 'costa';

export const EVBatterySimulator: React.FC = () => {
  const [selectedYears, setSelectedYears] = useState<number>(5);
  const [batteryTech, setBatteryTech] = useState<BatteryTech>('LFP');
  const [region, setRegion] = useState<EcuadorRegion>('sierra');
  const [initialRangeKm, setInitialRangeKm] = useState<number>(400);

  // Degradation calculation logic based on years, chemistry, and region
  // LFP degrades ~1.2% per year in Sierra, ~1.6% in Costa
  // NCM degrades ~1.8% per year in Sierra, ~2.2% in Costa
  const degradationRatePerYear = 
    batteryTech === 'LFP'
      ? (region === 'sierra' ? 1.2 : 1.6)
      : (region === 'sierra' ? 1.8 : 2.2);

  const currentSoH = Math.max(70, Math.round((100 - selectedYears * degradationRatePerYear) * 10) / 10);
  const currentRangeKm = Math.round(initialRangeKm * (currentSoH / 100));
  const kmRecorridos = selectedYears * 18000; // Average 18,000 km/year in Ecuador

  const isUnderWarranty = selectedYears <= 8 && kmRecorridos <= 160000;

  // Generate 10-year curve data
  const chartData = Array.from({ length: 11 }, (_, year) => {
    const soh = Math.max(68, Math.round((100 - year * degradationRatePerYear) * 10) / 10);
    const range = Math.round(initialRangeKm * (soh / 100));
    return {
      year: `Año ${year}`,
      soh,
      range,
    };
  });

  return (
    <div className="bg-[#0D1A14]/95 backdrop-blur-2xl border border-[#1A3028] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-5 shadow-2xl h-full font-sans">
      
      {/* Header */}
      <div className="space-y-1 border-b border-[#1A3028] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <BatteryCharging size={18} />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">Simulador de Batería</span>
              <h3 className="text-sm font-extrabold text-white leading-tight">Vida Útil & Salud (SoH)</h3>
            </div>
          </div>
          <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck size={12} />
            Garantía 8 Años / 160k km
          </span>
        </div>
      </div>

      {/* Selectores Interactivos */}
      <div className="space-y-3.5 bg-[#080E18] border border-[#1A3028] rounded-2xl p-3.5">
        
        {/* Slider de Años / Recorrido */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-bold flex items-center gap-1">
              <Activity size={13} className="text-emerald-400" />
              Tiempo de Uso:
            </span>
            <span className="text-emerald-400 font-mono font-bold">
              {selectedYears} Años <span className="text-neutral-400 text-[10px]">({kmRecorridos.toLocaleString()} km)</span>
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={selectedYears}
            onChange={(e) => setSelectedYears(Number(e.target.value))}
            className="w-full h-2 bg-[#1A3028] rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between text-[9px] font-mono text-neutral-500 px-0.5">
            <span>1 Año</span>
            <span>5 Años</span>
            <span>8 Años (Garantía)</span>
            <span>10 Años</span>
          </div>
        </div>

        {/* Química & Región de Ecuador */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          
          {/* Química de Batería */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Química Batería</label>
            <div className="grid grid-cols-2 gap-1 bg-[#050C09] border border-[#1A3028] p-0.5 rounded-xl">
              <button
                onClick={() => setBatteryTech('LFP')}
                className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                  batteryTech === 'LFP'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="LFP: Blade Battery (BYD, Tesla Standard). Mayor durabilidad."
              >
                LFP (Blade)
              </button>
              <button
                onClick={() => setBatteryTech('NCM')}
                className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                  batteryTech === 'NCM'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="NCM: Níquel-Cobalto-Manganeso. Mayor densidad."
              >
                NCM / NMC
              </button>
            </div>
          </div>

          {/* Región de Ecuador (Clima) */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Clima Ecuador</label>
            <div className="grid grid-cols-2 gap-1 bg-[#050C09] border border-[#1A3028] p-0.5 rounded-xl">
              <button
                onClick={() => setRegion('sierra')}
                className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                  region === 'sierra'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Sierra: Quito, Cuenca, Ambato (15°C)"
              >
                🏔️ Sierra
              </button>
              <button
                onClick={() => setRegion('costa')}
                className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                  region === 'costa'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Costa: Guayaquil, Manta, Machala (30°C)"
              >
                🌴 Costa
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Resultados de Salud (KPI Cards) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#080E18] border border-[#1A3028] p-3 rounded-2xl text-center space-y-0.5">
          <span className="text-[9px] font-mono text-neutral-400 uppercase block">Salud (SoH)</span>
          <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono block">{currentSoH}%</span>
          <span className="text-[8px] text-neutral-400 block font-mono">Retención</span>
        </div>

        <div className="bg-[#080E18] border border-[#1A3028] p-3 rounded-2xl text-center space-y-0.5">
          <span className="text-[9px] font-mono text-neutral-400 uppercase block">Autonomía</span>
          <span className="text-lg sm:text-xl font-black text-white font-mono block">{currentRangeKm} km</span>
          <span className="text-[8px] text-neutral-400 block font-mono">de {initialRangeKm} km orig.</span>
        </div>

        <div className="bg-[#080E18] border border-[#1A3028] p-3 rounded-2xl text-center space-y-0.5 flex flex-col justify-center items-center">
          <span className="text-[9px] font-mono text-neutral-400 uppercase block">Garantía</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full font-mono mt-1 ${
            isUnderWarranty
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {isUnderWarranty ? '🟢 Vigente' : '🟡 Post-Garantía'}
          </span>
          <span className="text-[8px] text-neutral-400 block font-mono mt-0.5">8 Años Cobertura</span>
        </div>
      </div>

      {/* Gráfico de Proyección de Degradación (SoH 10 Años) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-white font-bold uppercase">Curva de Retención de Batería (% SoH)</span>
          <span className="text-emerald-400 font-bold">Límite Garantía: 70% SoH</span>
        </div>
        <div className="w-full h-28 bg-[#080E18] border border-[#1A3028] rounded-2xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3028" opacity={0.5} />
              <XAxis dataKey="year" stroke="#6B7280" fontSize={9} tickLine={false} />
              <YAxis domain={[60, 100]} stroke="#6B7280" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0D1A14', borderColor: '#10B981', borderRadius: '12px', fontSize: '11px' }}
                formatter={(value: any) => [`${value}% Salud`, 'SoH']}
              />
              <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '70% Mínimo Garantizado', fill: '#EF4444', fontSize: 8 }} />
              <Area type="monotone" dataKey="soh" stroke="#10B981" strokeWidth={2} fill="url(#batteryGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info Banner Educativo */}
      <div className="bg-[#050C09] border border-emerald-500/20 rounded-2xl p-3 flex items-start gap-2.5 text-[10px] leading-relaxed text-neutral-300">
        <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-mono">¿Sabías qué en Ecuador?</strong>
          Las baterías de litio modernas cuentan con gestión térmica líquida activa y están diseñadas para durar más de 300,000 km (15+ años), superando la vida útil promedio del chasis del vehículo.
        </div>
      </div>

    </div>
  );
};
