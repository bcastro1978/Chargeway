'use client';

import React, { useState } from 'react';
import { LeadForm } from './LeadForm';
import { Leaf, ChevronRight, Sprout, DollarSign } from 'lucide-react';

export const SavingsCalculator = () => {
  const [dailyKm, setDailyKm] = useState<number>(50);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('BYD');
  const [selectedModel, setSelectedModel] = useState('Dolphin');

  // Cálculos básicos
  const daysInYear = 365;
  const yearlyKm = dailyKm * daysInYear;
  
  // Combustión: asumiendo 40km por galon, $2.40 el galon
  const galonesYear = yearlyKm / 40;
  const costoCombustion = galonesYear * 2.40;
  
  // Eléctrico: asumiendo 15 kWh por 100km, $0.10 por kWh
  const kwhYear = (yearlyKm / 100) * 15;
  const costoElectrico = kwhYear * 0.10;
  
  const ahorroAnual = costoCombustion - costoElectrico;

  const handleInterested = (brand: string, model: string) => {
    setSelectedBrand(brand);
    setSelectedModel(model);
    setShowForm(true);
  };

  return (
    <section id="calculadora" className="py-24 bg-white text-[#1F2937] relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#E0F2FE] rounded-full blur-[100px] opacity-40 pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-[#E0F2FE] rounded-full mb-6">
            <Sprout className="w-8 h-8 text-[#0ea5e9]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#111827]">¿Te conviene dar el salto a lo eléctrico?</h2>
          <p className="text-lg text-[#4B5563]">
            Ajusta los kilómetros que recorres a diario y descubre cuánto dinero ahorrarías al año ayudando al planeta.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Calculadora Interactiva */}
          <div className="p-10 rounded-[3rem] bg-white shadow-xl border border-[#F3F4F6]">
            <label className="block text-[#4B5563] text-lg font-medium mb-4">
              Kilómetros diarios promedio:
            </label>
            <div className="flex items-center gap-6 mb-10">
              <input 
                type="range" 
                min="10" 
                max="200" 
                step="5"
                value={dailyKm} 
                onChange={(e) => setDailyKm(Number(e.target.value))}
                className="w-full h-3 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer accent-[#10B981]"
              />
              <span className="text-3xl font-bold w-24 text-[#059669]">{dailyKm} <span className="text-xl">km</span></span>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="p-6 rounded-3xl bg-[#FEF2F2] text-center">
                <p className="text-sm text-[#991B1B] mb-2 font-medium">Gasto Gasolina / Año</p>
                <p className="text-3xl font-bold text-[#EF4444]">${costoCombustion.toFixed(0)}</p>
              </div>
              <div className="p-6 rounded-3xl bg-[#ECFDF5] text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Leaf size={40} />
                </div>
                <p className="text-sm text-[#065F46] mb-2 font-medium relative z-10">Gasto Eléctrico / Año</p>
                <p className="text-3xl font-bold text-[#10B981] relative z-10">${costoElectrico.toFixed(0)}</p>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-[#10B981] to-[#059669] text-white text-center shadow-lg shadow-[#10B981]/30">
              <p className="text-[#D1FAE5] font-medium mb-2 text-lg">Tu ahorro anual estimado</p>
              <h3 className="text-6xl font-extrabold flex items-center justify-center gap-2">
                <DollarSign size={50} className="opacity-80" />
                {ahorroAnual.toFixed(0)}
              </h3>
            </div>
          </div>

          {/* Opciones Recomendadas */}
          <div>
            <h3 className="text-3xl font-bold mb-4 text-[#111827]">Opciones recomendadas para ti</h3>
            <p className="text-[#4B5563] mb-8 text-lg">
              Basado en tus {dailyKm} km diarios, estos autos cubren tus necesidades cómodamente.
            </p>

            <div className="space-y-5">
              {[
                { brand: 'BYD', model: 'Dolphin', range: 405, price: 'Desde $29,990' },
                { brand: 'Dongfeng', model: 'Friday', range: 510, price: 'Desde $34,500' },
                { brand: 'Kia', model: 'EV6', range: 528, price: 'Desde $59,990' },
              ].map((ev, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white border border-[#F3F4F6] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:shadow-md hover:border-[#10B981]/30 transition-all duration-300">
                  <div>
                    <h4 className="font-bold text-xl text-[#111827]">{ev.brand} {ev.model}</h4>
                    <div className="flex items-center gap-4 text-sm text-[#4B5563] mt-2">
                      <span className="flex items-center gap-1 bg-[#ECFDF5] text-[#059669] px-3 py-1 rounded-full font-medium">
                        <Leaf size={14} /> {ev.range} km autonomía
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleInterested(ev.brand, ev.model)}
                    className="px-6 py-3 rounded-full bg-[#F3F4F6] text-[#374151] hover:bg-[#10B981] hover:text-white font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                  >
                    Saber más
                    <ChevronRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <LeadForm 
          dailyKm={dailyKm} 
          brand={selectedBrand} 
          model={selectedModel} 
          onClose={() => setShowForm(false)} 
        />
      )}
    </section>
  );
};
