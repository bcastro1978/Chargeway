'use client';

import React, { useState } from 'react';
import { DollarSign, ShieldCheck, Tag, FileText, CheckCircle2, TrendingUp, Percent, Car, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const EVTaxSavingsRadar: React.FC = () => {
  const [evPriceUsd, setEvPriceUsd] = useState<number>(28000);
  const [ownershipYears, setOwnershipYears] = useState<number>(5);

  // Financial calculations for Ecuador regulations
  // IVA Savings: 15% on equivalent ICE car
  const ivaSaved = Math.round(evPriceUsd * 0.15);

  // ICE (Impuesto a Consumos Especiales): Average 10% on equivalent ICE car
  const iceSaved = Math.round(evPriceUsd * 0.10);

  // Annual Registration: $10 USD for EV vs ~$320 USD for equivalent ICE car
  const annualRegistrationIce = 320;
  const annualRegistrationEv = 10;
  const registrationSaved = (annualRegistrationIce - annualRegistrationEv) * ownershipYears;

  // Fuel savings estimation (approx $1,200/year savings)
  const fuelSavings5Years = 1200 * ownershipYears;

  // Total Savings Total
  const totalTaxSavings = ivaSaved + iceSaved + registrationSaved;
  const grandTotalSavings = totalTaxSavings + fuelSavings5Years;

  // Chart data
  const breakdownData = [
    { name: 'IVA 0%', value: ivaSaved, color: '#10B981' },
    { name: 'ICE 0%', value: iceSaved, color: '#34D399' },
    { name: 'Matrícula', value: registrationSaved, color: '#6EE7B7' },
    { name: 'Gasolina', value: fuelSavings5Years, color: '#059669' },
  ];

  return (
    <div className="bg-[#0D1A14]/95 backdrop-blur-2xl border border-[#1A3028] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xl h-full font-sans">
      
      {/* Header */}
      <div className="space-y-1 border-b border-[#1A3028] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">Radar Financiero</span>
              <h3 className="text-sm font-extrabold text-white leading-tight">Beneficios Fiscales Ecuador</h3>
            </div>
          </div>
          <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck size={12} />
            Ley M. Eléctrica Ecuador
          </span>
        </div>
      </div>

      {/* Sliders Interactivos */}
      <div className="space-y-3 bg-[#080E18] border border-[#1A3028] rounded-2xl p-3.5">
        
        {/* Precio del Vehículo EV */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-bold flex items-center gap-1">
              <Car size={13} className="text-emerald-400" />
              Precio Estimado EV:
            </span>
            <span className="text-emerald-400 font-mono font-bold">
              ${evPriceUsd.toLocaleString()} USD
            </span>
          </div>
          <input
            type="range"
            min={18000}
            max={65000}
            step={1000}
            value={evPriceUsd}
            onChange={(e) => setEvPriceUsd(Number(e.target.value))}
            className="w-full h-2 bg-[#1A3028] rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between text-[9px] font-mono text-neutral-500 px-0.5">
            <span>$18,000 (City EV)</span>
            <span>$35,000 (SUV)</span>
            <span>$65,000 (Premium)</span>
          </div>
        </div>

        {/* Años de Propiedad */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-bold flex items-center gap-1">
              <TrendingUp size={13} className="text-emerald-400" />
              Periodo de Evaluación:
            </span>
            <span className="text-emerald-400 font-mono font-bold">
              {ownershipYears} Años
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={ownershipYears}
            onChange={(e) => setOwnershipYears(Number(e.target.value))}
            className="w-full h-2 bg-[#1A3028] rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

      </div>

      {/* KPI Display Highlight */}
      <div className="bg-[#06120D] border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.15)]">
        <div>
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">
            Ahorro Fiscal & Operativo Total ({ownershipYears} Años)
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            +${grandTotalSavings.toLocaleString()} USD
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 font-bold block mb-1">
            IVA 0% + ICE 0%
          </span>
          <span className="text-[9px] text-neutral-400 font-mono">
            Impuestos exentos en EC
          </span>
        </div>
      </div>

      {/* Tax Breakdown Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#080E18] border border-[#1A3028] p-2.5 rounded-xl text-center">
          <span className="text-[8px] font-mono text-neutral-400 uppercase block">Ahorro IVA 15%</span>
          <span className="text-sm font-black text-emerald-400 font-mono">${ivaSaved.toLocaleString()}</span>
        </div>
        <div className="bg-[#080E18] border border-[#1A3028] p-2.5 rounded-xl text-center">
          <span className="text-[8px] font-mono text-neutral-400 uppercase block">Ahorro ICE 0%</span>
          <span className="text-sm font-black text-emerald-400 font-mono">${iceSaved.toLocaleString()}</span>
        </div>
        <div className="bg-[#080E18] border border-[#1A3028] p-2.5 rounded-xl text-center">
          <span className="text-[8px] font-mono text-neutral-400 uppercase block">Matrícula ($10/año)</span>
          <span className="text-sm font-black text-emerald-400 font-mono">${registrationSaved.toLocaleString()}</span>
        </div>
      </div>

      {/* Chart Breakdown Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
          <span className="text-white font-bold uppercase">Desglose de Ahorros por Categoría ($ USD)</span>
          <span className="text-emerald-400 font-bold">100% Legal Ecuador</span>
        </div>
        <div className="w-full h-24 bg-[#080E18] border border-[#1A3028] rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3028" vertical={false} />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={9} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0D1A14', borderColor: '#10B981', borderRadius: '10px', fontSize: '11px' }}
                formatter={(value: any) => [`$${Number(value).toLocaleString()} USD`, 'Ahorro']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legal Perks List */}
      <div className="bg-[#050C09] border border-emerald-500/20 rounded-2xl p-2.5 flex items-center justify-between text-[9px] font-mono text-neutral-300">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <CheckCircle2 size={12} />
          Exención de Pico & Placa en Quito
        </span>
        <span className="text-neutral-400">Parqueos Zona Azul Gratis</span>
      </div>

    </div>
  );
};
