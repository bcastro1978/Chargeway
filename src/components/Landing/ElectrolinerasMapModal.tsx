'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { X, Search, Zap, MapPin, Navigation, Info, Filter } from 'lucide-react';
import { fetchAllEcuadorChargers, Charger } from '@/lib/services/charging';
import { RouteMap } from '@/components/Map/RouteMap';
import { ChargerCard } from '@/components/Dashboard/ChargerCard';

interface ElectrolinerasMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToPlanner: () => void;
}

export const ElectrolinerasMapModal: React.FC<ElectrolinerasMapModalProps> = ({
  isOpen,
  onClose,
  onGoToPlanner,
}) => {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState('todas');
  const [selectedSpeed, setSelectedSpeed] = useState('todas');
  const [isLoading, setIsLoading] = useState(true);
  const [mapFlyTo, setMapFlyTo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchAllEcuadorChargers()
        .then((data) => {
          setChargers(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const provinciasList = useMemo(() => {
    const setProvincias = new Set<string>();
    chargers.forEach((c) => {
      if (c.provincia) setProvincias.add(c.provincia);
    });
    return Array.from(setProvincias).sort();
  }, [chargers]);

  const filteredChargers = useMemo(() => {
    return chargers.filter((c) => {
      const matchSearch =
        !searchTerm ||
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.canton && c.canton.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.provincia && c.provincia.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchProv =
        selectedProvincia === 'todas' ||
        (c.provincia && c.provincia.toLowerCase() === selectedProvincia.toLowerCase());

      const matchSpeed =
        selectedSpeed === 'todas' ||
        (selectedSpeed === 'rapida' &&
          c.velocidad &&
          c.velocidad.toLowerCase().includes('rápid')) ||
        (selectedSpeed === 'standard' &&
          (!c.velocidad || !c.velocidad.toLowerCase().includes('rápid')));

      return matchSearch && matchProv && matchSpeed;
    });
  }, [chargers, searchTerm, selectedProvincia, selectedSpeed]);

  const fastChargerIds = useMemo(() => {
    const setIds = new Set<string>();
    filteredChargers.forEach((c) => {
      if (c.velocidad && c.velocidad.toLowerCase().includes('rápid')) {
        setIds.add(c.id);
      }
    });
    return setIds;
  }, [filteredChargers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0e12] text-white animate-fade-in overflow-hidden">
      
      {/* Header Bar */}
      <header className="bg-[#171a1f] border-b border-neutral-800 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <X size={14} className="text-emerald-400" />
            <span>Volver a Landing</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 border-l border-neutral-800 pl-3">
            <img src="/logo.png" alt="ChargeWay Logo" className="w-6 h-6 object-contain" />
            <span className="text-xs font-extrabold text-white">
              Charge<span className="text-emerald-400">Way</span> Mapa de Electrolineras
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGoToPlanner}
            className="group relative inline-flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full bg-gradient-to-r from-[#047857] via-[#10B981] to-[#059669] text-white font-semibold text-xs tracking-normal border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:shadow-[0_0_30px_rgba(52,211,153,0.65)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden font-sans"
          >
            <span>Abrir Planificador de Ruta</span>
            <div className="w-6 h-6 rounded-full bg-[#34D399] text-slate-950 flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 group-hover:translate-x-0.5 transition-transform">
              →
            </div>
          </button>
        </div>
      </header>

      {/* Main 2-Column Layout: Left Sidebar Controls + Right Map Canvas */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 overflow-hidden">
        
        {/* Left Column: Search & Filters Sidebar */}
        <aside className="flex flex-col gap-4 bg-[#171a1f] border border-neutral-800 rounded-2xl p-5 shadow-xl overflow-hidden h-full">
          
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Filtros de Búsqueda</h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-extrabold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
              {filteredChargers.length} Estaciones
            </span>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1.5">
              Buscar Estación
            </label>
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5">
              <Search size={14} className="text-emerald-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, cantón o ciudad..."
                className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Province Filter */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1.5">
              Provincia
            </label>
            <select
              value={selectedProvincia}
              onChange={(e) => setSelectedProvincia(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="todas">Todas las Provincias ({chargers.length})</option>
              {provinciasList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Speed Filter */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1.5">
              Velocidad de Carga
            </label>
            <select
              value={selectedSpeed}
              onChange={(e) => setSelectedSpeed(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="todas">Todas las velocidades</option>
              <option value="rapida">⚡ Carga Rápida DC</option>
              <option value="standard">🔌 Carga Estándar AC</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
            <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>Navega libremente por el mapa. Haz clic en una estación para centrar el mapa en su ubicación.</span>
          </div>

          {/* Scrollable Chargers List inside Left Sidebar */}
          <div className="flex-1 overflow-y-auto space-y-3 pt-2 pr-1 border-t border-neutral-800">
            {filteredChargers.map((charger) => (
              <div
                key={charger.id}
                onClick={() => {
                  if (charger.location) {
                    setMapFlyTo({ lat: charger.location.lat, lng: charger.location.lng });
                  }
                }}
                className="cursor-pointer"
              >
                <ChargerCard charger={charger} />
              </div>
            ))}
          </div>

        </aside>

        {/* Right Column: Interactive Mapbox Map Canvas */}
        <div className="h-full min-h-[500px] w-full rounded-2xl overflow-hidden border border-neutral-800 relative shadow-2xl">
          <RouteMap
            chargers={filteredChargers}
            routeChargerIds={fastChargerIds}
            locations={[]}
            flyTo={mapFlyTo}
            onChargerClick={(charger) => {
              if (charger.location) {
                setMapFlyTo({ lat: charger.location.lat, lng: charger.location.lng });
              }
            }}
          />
        </div>

      </div>

    </div>
  );
};
