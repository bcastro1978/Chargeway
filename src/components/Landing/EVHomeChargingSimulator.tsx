'use client';

import React, { useState } from 'react';
import { Home, Zap, DollarSign, Clock, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const EVHomeChargingSimulator: React.FC = () => {
  const [kmPerMonth, setKmPerMonth] = useState<number>(1200);
  const [chargerType, setChargerType] = useState<'110v' | '220v' | 'wallbox'>('wallbox');
  const [isNightRate, setIsNightRate] = useState<boolean>(true);

  // Efficiency ~0.16 kWh / km
  const kwhPerMonth = Math.round(kmPerMonth * 0.16);

  // Electricity tariff per kWh in Ecuador
  // Regular residential: ~$0.10 USD/kWh
  // Night / Valley rate (22:00 - 06:00): ~$0.06 USD/kWh
  const ratePerKwh = isNightRate ? 0.06 : 0.10;
  const monthlyCostUsd = Math.round(kwhPerMonth * ratePerKwh * 10) / 10;
  const gasEquivMonthlyCost = Math.round((kmPerMonth / 38) * 2.40 * 10) / 10; // Gasoline Extra/Eco ~$2.40/gal @ 38 MPG
  const monthlySavings = Math.round((gasEquivMonthlyCost - monthlyCostUsd) * 10) / 10;

  const getChargeTimeHours = () => {
    // For 40 kWh battery (approx 250 km)
    if (chargerType === '110v') return '18 - 22 hrs (Lenta)';
    if (chargerType === '220v') return '7 - 9 hrs (Media)';
    return '4 - 5 hrs (Rápida AC Wallbox)';
  };

  return (
    <div className="bg-[#0D1A14]/95 backdrop-blur-2xl border border-[#1A3028] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xl h-full font-sans">
      
      {/* Header */}
      <div className="space-y-1 border-b border-[#1A3028] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Home size={18} />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">Simulador Carga Residencial</span>
              <h3 className="text-sm font-extrabold text-white leading-tight">Planilla de Luz (CNEL / EEQ)</h3>
            </div>
          </div>
          <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Zap size={12} />
            Tarifa Valle $0.06/kWh
          </span>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3 bg-[#080E18] border border-[#1A3028] rounded-2xl p-3.5">
        
        {/* Recorrido Mensual */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-bold">Kilometraje Mensual:</span>
            <span className="text-emerald-400 font-mono font-bold">{kmPerMonth.toLocaleString()} km/mes</span>
          </div>
          <input
            type="range"
            min={400}
            max={3000}
            step={100}
            value={kmPerMonth}
            onChange={(e) => setKmPerMonth(Number(e.target.value))}
            className="w-full h-2 bg-[#1A3028] rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Tipo de Cargador */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Equipamiento Residencial</label>
          <div className="grid grid-cols-3 gap-1 bg-[#050C09] border border-[#1A3028] p-0.5 rounded-xl text-center">
            <button
              onClick={() => setChargerType('110v')}
              className={`py-1 rounded-lg text-[9px] font-bold transition-all ${
                chargerType === '110v' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              110V (1.4 kW)
            </button>
            <button
              onClick={() => setChargerType('220v')}
              className={`py-1 rounded-lg text-[9px] font-bold transition-all ${
                chargerType === '220v' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              220V (3.7 kW)
            </button>
            <button
              onClick={() => setChargerType('wallbox')}
              className={`py-1 rounded-lg text-[9px] font-bold transition-all ${
                chargerType === 'wallbox' ? 'bg-emerald-600 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Wallbox (7.4 kW)
            </button>
          </div>
        </div>

        {/* Tarifa Nocturna Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1A3028]/60 text-xs">
          <span className="text-neutral-300 font-bold flex items-center gap-1">
            <Clock size={13} className="text-emerald-400" />
            Recarga Nocturna (22:00 - 06:00):
          </span>
          <button
            onClick={() => setIsNightRate(!isNightRate)}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all border ${
              isNightRate
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            {isNightRate ? '🌙 Tarifa Valle Activa' : '☀️ Tarifa Estándar'}
          </button>
        </div>

      </div>

      {/* Display Results */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#080E18] border border-[#1A3028] p-3 rounded-2xl">
          <span className="text-[8px] font-mono text-neutral-400 uppercase block">Costo Luz / Mes</span>
          <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono block">${monthlyCostUsd} USD</span>
          <span className="text-[8px] text-neutral-500 font-mono block">{kwhPerMonth} kWh/mes</span>
        </div>

        <div className="bg-[#080E18] border border-[#1A3028] p-3 rounded-2xl">
          <span className="text-[8px] font-mono text-neutral-400 uppercase block">Gasolina Equiv.</span>
          <span className="text-lg sm:text-xl font-black text-red-400/90 font-mono block">${gasEquivMonthlyCost} USD</span>
          <span className="text-[8px] text-neutral-500 font-mono block">en Combustión</span>
        </div>

        <div className="bg-[#080E18] border border-emerald-500/30 p-3 rounded-2xl bg-emerald-950/20">
          <span className="text-[8px] font-mono text-emerald-400 uppercase font-bold block">Ahorro Mensual</span>
          <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono block">+${monthlySavings} USD</span>
          <span className="text-[8px] text-emerald-400 font-mono block font-bold">En tu bolsillo</span>
        </div>
      </div>

      {/* Charging Time Badge */}
      <div className="bg-[#050C09] border border-emerald-500/20 rounded-2xl p-2.5 flex items-center justify-between text-[9px] font-mono">
        <span className="text-neutral-400 flex items-center gap-1.5">
          <Clock size={12} className="text-emerald-400" />
          <span>Tiempo recarga 20% a 80%:</span>
        </span>
        <span className="text-emerald-400 font-bold">{getChargeTimeHours()}</span>
      </div>

    </div>
  );
};
