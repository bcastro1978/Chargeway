'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import AdvisorChat from './AdvisorChat';
import { EVSalesAdvisorAgent, AdvisorResponse } from '@/lib/agents/EVSalesAdvisor';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function TripSimulator() {
  const [distances, setDistances] = useState<number[]>([30, 30, 30, 30, 30, 60, 60]);
  const [fuelType, setFuelType] = useState<'Extra' | 'Super'>('Extra');
  const [passengers, setPassengers] = useState<number>(3);
  
  const [advisorData, setAdvisorData] = useState<AdvisorResponse | null>(null);
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);

  // Constants
  const FUEL_COST_EXTRA = 0.07; // $/km
  const FUEL_COST_SUPER = 0.11; // $/km
  const EV_COST = 0.015; // $/km

  const weeklyKm = distances.reduce((a, b) => a + b, 0);
  const currentCostPerKm = fuelType === 'Extra' ? FUEL_COST_EXTRA : FUEL_COST_SUPER;

  // Chart Data calculations
  const weeklyCombustion = weeklyKm * currentCostPerKm;
  const weeklyEv = weeklyKm * EV_COST;

  const chartData = [
    {
      name: 'Semanal',
      Combustión: Number(weeklyCombustion.toFixed(2)),
      Eléctrico: Number(weeklyEv.toFixed(2)),
    },
    {
      name: 'Mensual',
      Combustión: Number((weeklyCombustion * 4.33).toFixed(2)),
      Eléctrico: Number((weeklyEv * 4.33).toFixed(2)),
    },
    {
      name: 'Anual',
      Combustión: Number((weeklyCombustion * 52).toFixed(2)),
      Eléctrico: Number((weeklyEv * 52).toFixed(2)),
    }
  ];

  // Fetch AI Advice when inputs change (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoadingAdvisor(true);
      const res = await EVSalesAdvisorAgent({ weeklyKm, passengers, fuelType });
      setAdvisorData(res);
      setLoadingAdvisor(false);
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [weeklyKm, passengers, fuelType]);

  const updateDistance = (index: number, val: number) => {
    const newDistances = [...distances];
    newDistances[index] = val;
    setDistances(newDistances);
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* LEFT: Controls (2 columns wide on desktop) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Controls Card */}
        <div className="bg-surface-container-low rounded-2xl p-6 border border-secondary-container shadow-[0_4px_20px_rgba(13,92,58,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed/5 blur-3xl rounded-full"></div>
          
          <h2 className="font-headline-md text-primary mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">route</span>
            Simulador de Rutas y Ahorro
          </h2>

          <div className="space-y-8 relative z-10">
            {/* Daily Sliders */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider">Recorrido Diario (km)</h3>
                <span className="font-headline-md text-primary">{weeklyKm} km/sem</span>
              </div>
              <div className="grid grid-cols-7 gap-2 h-40 items-end">
                {distances.map((dist, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="font-label-sm text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">{dist}</span>
                    <div className="relative w-8 h-24 flex justify-center">
                      <input 
                        type="range" 
                        min="0" 
                        max="150" 
                        value={dist} 
                        onChange={(e) => updateDistance(i, Number(e.target.value))}
                        className="absolute w-24 h-2 appearance-none bg-surface-container-highest rounded-full outline-none accent-primary-fixed bottom-0 origin-left -rotate-90 translate-x-[4px]"
                      />
                    </div>
                    <span className="font-label-sm text-xs text-on-surface-variant font-medium">{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-secondary-container">
              {/* Fuel Type */}
              <div>
                <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-3">Combustible Actual</h3>
                <div className="flex bg-surface-container-highest rounded-full p-1 border border-secondary-container">
                  <button 
                    onClick={() => setFuelType('Extra')}
                    className={`flex-1 rounded-full py-2 font-label-md text-sm transition-all ${fuelType === 'Extra' ? 'bg-primary-container text-on-primary-container shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Extra
                  </button>
                  <button 
                    onClick={() => setFuelType('Super')}
                    className={`flex-1 rounded-full py-2 font-label-md text-sm transition-all ${fuelType === 'Super' ? 'bg-primary-container text-on-primary-container shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Super
                  </button>
                </div>
              </div>

              {/* Passengers */}
              <div>
                <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-3">Pasajeros Frecuentes</h3>
                <div className="flex items-center justify-between bg-surface-container-highest rounded-full p-1 border border-secondary-container h-[42px] px-2">
                  <button 
                    onClick={() => setPassengers(Math.max(1, passengers - 1))}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">group</span>
                    <span className="font-headline-md text-on-surface">{passengers}</span>
                  </div>
                  <button 
                    onClick={() => setPassengers(Math.min(7, passengers + 1))}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-surface-container-low rounded-2xl p-6 border border-secondary-container shadow-[0_4px_20px_rgba(13,92,58,0.05)] h-80">
          <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-4">Proyección de Gastos (USD)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d4a3e" vertical={false} />
              <XAxis dataKey="name" stroke="#bccabb" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#bccabb" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                cursor={{fill: '#262a35'}} 
                contentStyle={{ backgroundColor: '#171b26', borderColor: '#3d4a3e', borderRadius: '8px', color: '#dfe2f1' }}
                itemStyle={{ fontSize: '14px', fontWeight: '500' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
              <Bar dataKey="Combustión" fill="#bccabb" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Eléctrico" fill="#50e085" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* RIGHT: AI Advisor */}
      <div className="lg:col-span-1 h-[600px] lg:h-full min-h-[600px]">
        <AdvisorChat advisorData={advisorData} loading={loadingAdvisor} />
      </div>

    </div>
  );
}
