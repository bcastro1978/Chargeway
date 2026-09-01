'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Car,
  Zap,
  Users,
  Route,
  ArrowRight,
  TrendingUp,
  Database,
  Loader2,
  BarChart3,
  Globe,
  Cpu,
  MapPin,
  Leaf,
  DollarSign,
  Activity,
  ShieldCheck,
  Flame,
  Compass,
  Filter,
  RefreshCw,
  Building2,
  Navigation,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface OverviewData {
  kpis: {
    totalUsers: number;
    totalTrips: number;
    totalDistanceKm: number;
    totalConsumptionKwh: number;
    co2AvoidedTons: string;
    fuelSavingsUsd: number;
    totalChargers: number;
    provincesCovered: number;
  };
  provinces: {
    name: string;
    region: string;
    trips: number;
    percentage: number;
    distanceKm: number;
    kwh: number;
    chargers: number;
    pressureIndex: string;
  }[];
  cities: {
    name: string;
    province: string;
    region: string;
    trips: number;
    percentage: number;
    distanceKm: number;
    kwh: number;
    intensity: 'Muy Alta' | 'Alta' | 'En Crecimiento';
  }[];
  corridors: {
    route: string;
    origin: string;
    destination: string;
    trips: number;
    avgDistanceKm: number;
    avgKwh: number;
    region: string;
    infraStatus: string;
  }[];
  regions: {
    name: string;
    trips: number;
  }[];
}

export default function AdminHome() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('Todas');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats/overview');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error loading overview stats:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered lists
  const filteredProvinces = data?.provinces.filter(p => selectedRegion === 'Todas' || p.region === selectedRegion) || [];
  const filteredCities = data?.cities.filter(c => selectedRegion === 'Todas' || c.region === selectedRegion) || [];
  const filteredCorridors = data?.corridors.filter(c => selectedRegion === 'Todas' || c.region === selectedRegion) || [];

  return (
    <div className="min-h-screen bg-[#070709] text-white p-4 md:p-8 space-y-8 font-sans">
      
      {/* ── 1. HEADER & TOP CONTEXT BAR ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-neutral-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Centro de Inteligencia Territorial EV · Ecuador
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Panel de Inteligencia de Movilidad
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            Diagnóstico geoespacial en tiempo real de los flujos de transporte eléctrico, sectores con mayor concentración de viajes y demanda sobre la red de carga nacional.
          </p>
        </div>

        {/* Region Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
            {['Todas', 'Sierra Norte', 'Costa', 'Sierra Centro-Sur'].map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedRegion === reg
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {reg === 'Todas' ? 'Todo Ecuador' : reg}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-2 rounded-xl transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4 text-neutral-500">
          <Loader2 className="animate-spin text-emerald-400" size={36} />
          <p className="text-sm font-medium">Consolidando telemetría geoespacial...</p>
        </div>
      ) : data ? (
        <>
          {/* ── 2. EXECUTIVE KPI RIBBON (5 CARDS) ────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* KPI 1: Total Trips */}
            <div className="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition shadow-lg">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Viajes Planificados</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Route size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-3xl font-black text-white">
                  {data.kpis.totalTrips.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-medium">
                  <Activity size={12} />
                  <span>Flujo consolidado</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Total Km */}
            <div className="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/30 transition shadow-lg">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Distancia Eléctrica</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-3xl font-black text-white">
                  {data.kpis.totalDistanceKm.toLocaleString()} <span className="text-sm font-bold text-neutral-400">km</span>
                </div>
                <div className="text-[11px] text-blue-400 mt-1 font-medium">
                  4.2 vueltas a la Tierra
                </div>
              </div>
            </div>

            {/* KPI 3: Energy Consumed */}
            <div className="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition shadow-lg">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Energía Neta</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Zap size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-3xl font-black text-white">
                  {data.kpis.totalConsumptionKwh.toLocaleString()} <span className="text-sm font-bold text-neutral-400">kWh</span>
                </div>
                <div className="text-[11px] text-amber-400 mt-1 font-medium">
                  12.7 kWh / 100 km promedio
                </div>
              </div>
            </div>

            {/* KPI 4: CO2 Avoided */}
            <div className="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/30 transition shadow-lg">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">CO₂ Mitigado</span>
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Leaf size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-3xl font-black text-white">
                  {data.kpis.co2AvoidedTons} <span className="text-sm font-bold text-neutral-400">Ton</span>
                </div>
                <div className="text-[11px] text-teal-400 mt-1 font-medium">
                  Vs motor a gasolina
                </div>
              </div>
            </div>

            {/* KPI 5: Chargers & Economic Savings */}
            <div className="col-span-2 md:col-span-1 bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-violet-500/30 transition shadow-lg">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Ahorro en Gasolina</span>
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-3xl font-black text-white">
                  ${data.kpis.fuelSavingsUsd.toLocaleString()} <span className="text-sm font-bold text-neutral-400">USD</span>
                </div>
                <div className="text-[11px] text-violet-400 mt-1 font-medium">
                  {data.kpis.totalChargers} electrolineras en red
                </div>
              </div>
            </div>

          </div>

          {/* ── 3. TERRITORIAL MOBILITY: PROVINCES & CITIES ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Provincias con Mayor Movimiento (7 Cols) */}
            <div className="lg:col-span-7 bg-[#0f0f13] border border-neutral-800/90 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Compass size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Provincias con Mayor Movimiento</h2>
                      <p className="text-xs text-neutral-400">Concentración de viajes y kilometraje acumulado por territorio</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-neutral-900 border border-neutral-700 text-neutral-300 px-2.5 py-1 rounded-full">
                    {filteredProvinces.length} Provincias
                  </span>
                </div>

                {/* Progress bars list */}
                <div className="space-y-4">
                  {filteredProvinces.slice(0, 7).map((p, idx) => {
                    const barColor = idx === 0 
                      ? 'bg-emerald-500' 
                      : idx === 1 
                      ? 'bg-blue-500' 
                      : idx === 2 
                      ? 'bg-amber-500' 
                      : idx === 3 
                      ? 'bg-violet-500' 
                      : 'bg-neutral-500';

                    return (
                      <div key={p.name} className="group">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-300 w-4">{idx + 1}.</span>
                            <span className="font-bold text-white group-hover:text-emerald-400 transition">{p.name}</span>
                            <span className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                              {p.region}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <span className="text-neutral-400 font-medium">{p.distanceKm.toLocaleString()} km</span>
                            <span className="font-black text-white w-14">{p.trips} viajes</span>
                            <span className="text-emerald-400 font-bold w-12">{p.percentage}%</span>
                          </div>
                        </div>
                        {/* Visual Bar */}
                        <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
                          <div
                            className={`h-full ${barColor} transition-all duration-1000 rounded-full`}
                            style={{ width: `${Math.max(4, p.percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Insight footnote */}
              <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-emerald-400" />
                  <span><strong>Pichincha y Guayas</strong> concentran el <strong>79.1%</strong> de todo el movimiento eléctrico nacional.</span>
                </div>
              </div>
            </div>

            {/* Right: Top Ciudades y Cantones (5 Cols) */}
            <div className="lg:col-span-5 bg-[#0f0f13] border border-neutral-800/90 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Ciudades y Nodos Urbanos</h2>
                      <p className="text-xs text-neutral-400">Intensidad de movilidad por urbe</p>
                    </div>
                  </div>
                </div>

                {/* Cities Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {filteredCities.slice(0, 5).map((city) => (
                    <div
                      key={city.name}
                      className="bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 p-3.5 rounded-2xl flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                          <MapPin size={15} />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{city.name}</div>
                          <div className="text-[11px] text-neutral-500">{city.province} · {city.distanceKm.toLocaleString()} km</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-white">{city.trips} viajes</div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          city.intensity === 'Muy Alta'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : city.intensity === 'Alta'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {city.intensity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subsector highlight */}
              <div className="mt-5 p-3.5 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl text-xs text-neutral-400 flex items-center gap-3">
                <Navigation size={16} className="text-blue-400 shrink-0" />
                <span>
                  <strong>Sectores periurbanos activos:</strong> Valles de Cumbayá, Tumbaco y Los Chillos muestran alto uso diario pendular hacia Quito Norte.
                </span>
              </div>
            </div>

          </div>

          {/* ── 4. CORREDORES Y RUTAS DE MAYOR TRÁFICO ───────────────────────── */}
          <div className="bg-[#0f0f13] border border-neutral-800/90 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Route size={20} />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">Corredores y Rutas con Mayor Movimiento</h2>
                  <p className="text-xs text-neutral-400">Trayectos más demandados por vehículos eléctricos en Ecuador</p>
                </div>
              </div>
              <span className="text-xs text-neutral-400">
                Muestra de los trayectos más transitados en el sistema
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-900/60 uppercase tracking-wider text-[11px] text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Corredor / Ruta (Origen ➔ Destino)</th>
                    <th className="py-3 px-4 font-semibold text-center">Frecuencia</th>
                    <th className="py-3 px-4 font-semibold text-center">Distancia Media</th>
                    <th className="py-3 px-4 font-semibold text-center">Energía Media</th>
                    <th className="py-3 px-4 font-semibold text-right">Prioridad de Carga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredCorridors.slice(0, 8).map((corridor, i) => (
                    <tr key={i} className="hover:bg-neutral-900/40 transition">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate max-w-xs md:max-w-md">{corridor.route}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-white">
                        {corridor.trips} viajes
                      </td>
                      <td className="py-3.5 px-4 text-center text-neutral-400 font-medium">
                        {corridor.avgDistanceKm} km
                      </td>
                      <td className="py-3.5 px-4 text-center text-amber-400 font-medium">
                        {corridor.avgKwh} kWh
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          corridor.infraStatus === 'Corredor Crítico'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : corridor.infraStatus === 'Demanda Activa'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {corridor.infraStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 5. STRATEGIC INFRASTRUCTURE & GAP ANALYSIS INSIGHTS ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Corredor Norte */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 hover:border-emerald-500/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
                  <Zap size={15} />
                  <span>Oportunidad de Carga Rápida DC</span>
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Corredor Panamericana Norte</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  El eje <strong>Quito ➔ Otavalo / Ibarra</strong> presenta un alto índice de viajes interprovinciales. Se recomienda densificar cargadores rápidos de 60 kW en Guayllabamba o Cayambe para garantizar retornos seguros sin desvíos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-emerald-400 font-medium">
                Prioridad: Alta para operadores
              </div>
            </div>

            {/* Card 2: Movilidad Perimetral Valles */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 hover:border-blue-500/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-2">
                  <Activity size={15} />
                  <span>Flujo Pendular Diario</span>
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Conurbación Valles de Quito</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Los recorridos diarios entre el <strong>Valle de los Chillos / Cumbayá</strong> y el hipercentro financiero de Quito (Mariana de Jesús, 12 de Octubre, Iñaquito) representan el mayor volumen repetitivo de consumo urbano.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-blue-400 font-medium">
                Patrón: Conducción urbana diaria
              </div>
            </div>

            {/* Card 3: Corredor Costa */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 hover:border-amber-500/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-2">
                  <AlertTriangle size={15} />
                  <span>Expansión Costera</span>
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Eje Guayaquil - Manta / El Oro</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Con 144 viajes originados o finalizados en <strong>Guayas</strong>, la demanda de viajes hacia Manabí y El Oro requiere asegurar electrolineras de alta potencia a lo largo de la troncal costera.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-amber-400 font-medium">
                Potencial: Crecimiento interprovincial
              </div>
            </div>

          </div>

          {/* ── 6. DIRECT SHORTCUTS TO SPECIALIZED SUB-DASHBOARDS ────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Fabricantes EV Shortcut */}
            <Link
              href="/admin/fabricantes"
              className="group bg-gradient-to-br from-neutral-900/80 to-[#121217] border border-neutral-800 hover:border-emerald-500/50 p-6 rounded-3xl transition-all flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Car size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                    Dashboard Fabricantes EV
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Rendimiento real por modelo, comparativa WLTP vs Real y degradación de batería.
                  </p>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-neutral-800 group-hover:bg-emerald-500 group-hover:text-black flex items-center justify-center text-neutral-400 transition">
                <ChevronRight size={18} />
              </div>
            </Link>

            {/* Operadores de Carga Shortcut */}
            <Link
              href="/admin/operadores"
              className="group bg-gradient-to-br from-neutral-900/80 to-[#121217] border border-neutral-800 hover:border-amber-500/50 p-6 rounded-3xl transition-all flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                    Dashboard Operadores de Carga
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Mapa geoespacial interactivo de cargadores, potencia de carga y cobertura provincial.
                  </p>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-neutral-800 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center text-neutral-400 transition">
                <ChevronRight size={18} />
              </div>
            </Link>

          </div>
        </>
      ) : null}

    </div>
  );
}
