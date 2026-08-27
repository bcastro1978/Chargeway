'use client';

import React, { useState } from 'react';
import { DollarSign, BatteryCharging, Home, Car } from 'lucide-react';
import { EVTaxSavingsRadar } from './EVTaxSavingsRadar';
import { EVBatterySimulator } from './EVBatterySimulator';
import { EVHomeChargingSimulator } from './EVHomeChargingSimulator';
import { EVCatalogEcuador } from './EVCatalogEcuador';

export type DashboardTab = 'tax' | 'battery' | 'home' | 'catalog';

export const EVHubDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('tax');

  return (
    <div className="flex flex-col h-full space-y-3">
      
      {/* Dynamic Tab Navigation Bar */}
      <div className="bg-[#091512]/95 backdrop-blur-2xl border border-emerald-500/30 p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-lg font-sans">
        
        <button
          onClick={() => setActiveTab('tax')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tax'
              ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              : 'text-neutral-400 hover:text-white hover:bg-emerald-950/30'
          }`}
          title="Beneficios Fiscales & Impuestos Exentos en Ecuador"
        >
          <DollarSign size={13} className={activeTab === 'tax' ? 'text-white' : 'text-emerald-400'} />
          <span className="hidden sm:inline">Impuestos EC</span>
          <span className="sm:hidden">Fiscal</span>
        </button>

        <button
          onClick={() => setActiveTab('battery')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'battery'
              ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              : 'text-neutral-400 hover:text-white hover:bg-emerald-950/30'
          }`}
          title="Simulador de Vida Útil & Salud de Batería a 8-10 Años"
        >
          <BatteryCharging size={13} className={activeTab === 'battery' ? 'text-white' : 'text-emerald-400'} />
          <span className="hidden sm:inline">Vida Batería</span>
          <span className="sm:hidden">Batería</span>
        </button>

        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'home'
              ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              : 'text-neutral-400 hover:text-white hover:bg-emerald-950/30'
          }`}
          title="Planilla de Luz EEQ/CNEL & Carga Residencial"
        >
          <Home size={13} className={activeTab === 'home' ? 'text-white' : 'text-emerald-400'} />
          <span className="hidden sm:inline">Planilla Luz</span>
          <span className="sm:hidden">Carga Casa</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'catalog'
              ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              : 'text-neutral-400 hover:text-white hover:bg-emerald-950/30'
          }`}
          title="Catálogo Oficial de Modelos EV Comercializados en Ecuador 2026"
        >
          <Car size={13} className={activeTab === 'catalog' ? 'text-white' : 'text-emerald-400'} />
          <span className="hidden sm:inline">Modelos EV</span>
          <span className="sm:hidden">Catálogo</span>
        </button>

      </div>

      {/* Tab Content Display */}
      <div className="flex-1 min-h-0">
        {activeTab === 'tax' && <EVTaxSavingsRadar />}
        {activeTab === 'battery' && <EVBatterySimulator />}
        {activeTab === 'home' && <EVHomeChargingSimulator />}
        {activeTab === 'catalog' && <EVCatalogEcuador />}
      </div>

    </div>
  );
};
