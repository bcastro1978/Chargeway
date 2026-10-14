'use client';

import React, { useMemo, useState } from 'react';
import { Car, ChevronDown, ChevronUp, BatteryCharging, Gauge, Mountain, Zap } from 'lucide-react';
import { useTripStore } from '@/lib/store/useTripStore';

export interface Vehicle {
  id: string;
  model: string;
  brand: string;
  photoUrl?: string;
  specs: {
    usable_battery_kwh: number;
    wltp_range_km: number;
    drag_coefficient: number;
    frontal_area_m2: number;
    weight_kg: number;
    peak_charging_kw: number;
    charger_type?: string;
  };
}

interface VehicleSelectorProps {
  selectedId: string;
  onSelect: (vehicle: Vehicle) => void;
  soc: number;
  onSocChange: (newSoc: number) => void;
  rangeKm: number;
  onOpenProfile: () => void;
}

const VehicleSelectorComponent: React.FC<VehicleSelectorProps> = ({ 
  selectedId, 
  onSelect,
  soc,
  onSocChange,
  rangeKm,
  onOpenProfile
}) => {
  const storeSelectedVehicle = useTripStore((state) => state.selectedVehicle);
  const vehiclesData = useTripStore((state) => state.globalVehicles);
  const isVehiclesLoading = useTripStore((state) => state.isVehiclesLoading);
  const selectedVehiclePhoto = storeSelectedVehicle?.photoUrl;
  
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);

  const selectedVehicle = vehiclesData.find(v => v.id === selectedId) || vehiclesData[0];
  
  // Extract unique brands
  const brands = useMemo(() => {
    if (!vehiclesData.length) return [];
    const uniqueBrands = Array.from(new Set(vehiclesData.map(v => v.brand)));
    return uniqueBrands.sort((a, b) => a.localeCompare(b));
  }, [vehiclesData]);

  // Extract models for current brand
  const modelsForBrand = useMemo(() => {
    if (!selectedVehicle) return [];
    return vehiclesData.filter(v => v.brand === selectedVehicle.brand);
  }, [selectedVehicle?.brand, vehiclesData]);

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBrand = e.target.value;
    const firstModelOfBrand = vehiclesData.find(v => v.brand === newBrand);
    if (firstModelOfBrand) {
      onSelect(firstModelOfBrand as Vehicle);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    const vehicle = vehiclesData.find(v => v.id === newId);
    if (vehicle) {
      onSelect(vehicle as Vehicle);
    }
  };

  if (isVehiclesLoading || !selectedVehicle) {
    return (
      <div className="hud-panel rounded-2xl p-5 shadow-hud border border-white/10 flex items-center justify-center min-h-[220px]">
        <span className="text-slate-400 font-mono text-xs animate-pulse">Cargando flota EV...</span>
      </div>
    );
  }

  const usableKwh = selectedVehicle.specs.usable_battery_kwh || 38.8;
  const currentKwh = ((usableKwh * soc)).toFixed(1);
  const wltp = selectedVehicle.specs.wltp_range_km || 344;
  const chargerType = selectedVehicle.specs.charger_type || 'CCS2';

  // Determine battery chemistry text
  const chemistryText = selectedVehicle.brand.toLowerCase().includes('byd')
    ? 'Blade Battery • LFP'
    : selectedVehicle.brand.toLowerCase().includes('tesla')
    ? 'Lithium-Ion • High Density'
    : selectedVehicle.brand.toLowerCase().includes('kia') || selectedVehicle.brand.toLowerCase().includes('hyundai')
    ? 'E-GMP 800V • NCM'
    : 'Batería de Tracción • Li-Ion';

  return (
    <div className="hud-panel rounded-2xl p-5 shadow-hud border border-white/10 relative overflow-hidden group">
      {/* Ambient Glow Corner */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-cyan/20 rounded-full blur-3xl pointer-events-none" />

      {/* Vehicle Selector Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-white/10 text-brand-cyan shrink-0 overflow-hidden">
            {selectedVehiclePhoto ? (
              <img src={selectedVehiclePhoto} alt={selectedVehicle.model} className="w-full h-full object-cover" />
            ) : (
              <Car size={16} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
              <span>{selectedVehicle.brand} {selectedVehicle.model}</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-white/10 shrink-0 font-mono">
                {usableKwh} kWh
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono truncate">{chemistryText}</p>
          </div>
        </div>

        {/* Switch Vehicle & Connector Badge */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-white/10 text-[10px] font-mono">
            <span className="px-2 py-0.5 bg-brand-cyan/20 text-brand-cyan font-bold rounded">
              {chargerType}
            </span>
          </div>
          <button
            onClick={() => setIsPickerOpen(prev => !prev)}
            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-white/10 text-[10px] font-mono flex items-center gap-1 transition cursor-pointer"
            title="Cambiar modelo de vehículo"
          >
            <span>Cambiar</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${isPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Vehicle Switcher */}
      {isPickerOpen && (
        <div className="mt-3 p-3 bg-slate-950/80 border border-brand-cyan/30 rounded-xl space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Marca</label>
              <select
                value={selectedVehicle.brand}
                onChange={handleBrandChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none focus:border-brand-cyan"
              >
                {brands.map(b => (
                  <option key={b} value={b} className="bg-slate-900 text-white">{b}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Modelo</label>
              <select
                value={selectedId}
                onChange={handleModelChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none focus:border-brand-cyan"
              >
                {modelsForBrand.map(v => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-white">{v.model}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-1 flex justify-end border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsPickerOpen(false);
                onOpenProfile();
              }}
              className="text-[10px] font-mono text-brand-cyan hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer transition"
            >
              <span>⚙ Gestionar garaje y mis vehículos</span>
            </button>
          </div>
        </div>
      )}

      {/* SoC Battery Gauge Radial & Metrics */}
      <div className="mt-4 grid grid-cols-12 gap-3 items-center">
        {/* Percent Digital Big */}
        <div className="col-span-6 flex flex-col justify-center">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <BatteryCharging size={14} className="text-brand-lime" />
            <span>Estado SoC</span>
          </span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-4xl font-black font-mono tracking-tighter text-white">
              {Math.round(soc * 100)}
            </span>
            <span className="text-xl font-bold text-brand-lime font-mono">%</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-medium">
            {soc >= 0.7 ? 'Batería Óptima (24°C)' : soc >= 0.3 ? 'Nivel Adecuado' : 'Reserva Baja'}
          </span>
        </div>

        {/* Autonomy in Km */}
        <div className="col-span-6 bg-slate-900/60 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Autonomía Real</span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-2xl font-black font-mono text-brand-cyan tracking-tight">{rangeKm}</span>
            <span className="text-xs font-mono text-slate-400">km</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">WLTP base: {wltp} km</span>
        </div>
      </div>

      {/* Interactive SoC Slider Simulation Bar */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-2">
          <span>Nivel de Inicio (SoC)</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSocChange(Math.max(0.1, Math.round(soc * 100 - 5) / 100))}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition border border-white/10"
              title="Disminuir 5%"
            >
              -
            </button>
            <span className="text-brand-lime font-bold text-xs px-1 min-w-[75px] text-center">
              {Math.round(soc * 100)}% ({currentKwh} kWh)
            </span>
            <button
              type="button"
              onClick={() => onSocChange(Math.min(1.0, Math.round(soc * 100 + 5) / 100))}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition border border-white/10"
              title="Aumentar 5%"
            >
              +
            </button>
          </div>
        </div>

        {/* Highly Visible, Smooth Interactive Range Slider */}
        <div className="relative w-full py-1 flex items-center">
          <input 
            type="range" 
            min="10" 
            max="100" 
            step="1"
            value={Math.round(soc * 100)} 
            onChange={(e) => onSocChange(parseInt(e.target.value) / 100)}
            className="w-full h-3 rounded-full cursor-pointer appearance-none bg-slate-800 outline-none transition-all"
            style={{
              background: `linear-gradient(to right, #06B6D4 0%, #84CC16 ${Math.round(soc * 100)}%, #1e293b ${Math.round(soc * 100)}%, #1e293b 100%)`,
              accentColor: '#84CC16',
            }}
          />
        </div>

        {/* Clickable Quick Guide Ticks */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5">
          <button 
            type="button" 
            onClick={() => onSocChange(0.20)} 
            className="hover:text-brand-cyan transition cursor-pointer text-left py-0.5"
            title="Ajustar a 20%"
          >
            20% Reserva
          </button>
          <button 
            type="button" 
            onClick={() => onSocChange(0.80)} 
            className="hover:text-brand-lime transition cursor-pointer text-center font-semibold text-slate-300 py-0.5"
            title="Ajustar a 80%"
          >
            80% Saludable
          </button>
          <button 
            type="button" 
            onClick={() => onSocChange(1.0)} 
            className="hover:text-emerald-400 transition cursor-pointer text-right py-0.5"
            title="Ajustar a 100%"
          >
            100%
          </button>
        </div>
      </div>

      {/* Detalle Técnico del Vehículo (Expandible para no sobrecargar) */}
      <div className="mt-3 pt-2.5 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Ficha Técnica & Eficiencia
          </span>
          <button
            type="button"
            onClick={() => setIsSpecsExpanded(prev => !prev)}
            className="p-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 text-[10px] font-mono flex items-center gap-1 transition cursor-pointer"
            title={isSpecsExpanded ? "Ocultar especificaciones" : "Ver especificaciones"}
          >
            <span>{isSpecsExpanded ? 'Ocultar' : 'Ver detalles'}</span>
            {isSpecsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>

        {isSpecsExpanded && (
          <div className="mt-2 space-y-2 animate-in fade-in duration-200">
            {/* Real-Time Andean Efficiency Factor */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
              <div className="flex items-center space-x-2">
                <Gauge size={14} className="text-slate-400" />
                <span className="text-slate-300">
                  {selectedVehicle.specs.usable_battery_kwh && wltp ? ((selectedVehicle.specs.usable_battery_kwh / wltp) * 100).toFixed(1) : '12.8'}{' '}
                  <span className="text-[9px] text-slate-500">kWh/100km</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Mountain size={14} className="text-slate-400" />
                <span className="text-slate-300">
                  +4.2% <span className="text-[9px] text-slate-500">Regen Sierra</span>
                </span>
              </div>
            </div>

            {/* Ficha Física del Vehículo */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-white/5">
              <div>
                <span className="text-[8.5px] uppercase block text-slate-500">Peso</span>
                <span className="text-slate-200 font-bold">{selectedVehicle.specs.weight_kg || 1600} kg</span>
              </div>
              <div>
                <span className="text-[8.5px] uppercase block text-slate-500">Carga Máx</span>
                <span className="text-cyan-300 font-bold">{selectedVehicle.specs.peak_charging_kw || 60} kW</span>
              </div>
              <div>
                <span className="text-[8.5px] uppercase block text-slate-500">Cx / Área</span>
                <span className="text-slate-200 font-bold">{selectedVehicle.specs.drag_coefficient || 0.29} cd</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const VehicleSelector = React.memo(VehicleSelectorComponent);
