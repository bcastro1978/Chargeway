'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Loader2, Car, Route, Zap, TrendingUp, RefreshCw } from 'lucide-react';

interface ModelRow {
  model: string;
  trips: number;
  avgDistanceKm: number;
  avgConsumptionKwh100km: number;
  avgStartSocPct: number;
  avgArrivalSocPct: number;
  totalDistanceKm: number;
  totalConsumptionKwh: number;
}

interface BrandRow { brand: string; trips: number; }

interface FabData {
  rawTrips: any[];
  kpis: {
    totalTrips: number;
    totalModels: number;
    totalDistanceKm: number;
    avgConsumption: number;
  };
  byModel: ModelRow[];
  byBrand: BrandRow[];
}

const PALETTE = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#a78bfa'];
const BENCHMARK_PALETTE = ['#10b981', '#3f3f46']; // Emerald for brand, Gray for others

function TooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-neutral-300 font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
}

function TooltipPie({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs shadow-xl">
      <p style={{ color: payload[0].payload.fill }} className="font-bold">{payload[0].name}</p>
      <p className="text-neutral-300">{payload[0].value} viajes</p>
    </div>
  );
}

function pieLabelFn(props: any) {
  const name: string = props.name ?? '';
  const pct: number = props.percent ?? 0;
  return `${name} ${(pct * 100).toFixed(0)}%`;
}

export default function FabricantesPage() {
  const [data, setData] = useState<FabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBrand, setFilterBrand] = useState<string>('Todas');

  async function load() {
    setLoading(true); setError(null);
    try {
      // Query trips directly from Supabase (admin access already verified by layout)
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('vehicle_model, distance_km, consumption_kwh, start_soc, arrival_soc, duration_min, origin_name, destination_name');

      if (tripsError) throw new Error(tripsError.message);

      // Build per-model aggregates
      const modelMap: Record<string, {
        trips: number; totalDistanceKm: number; totalConsumptionKwh: number;
        socSum: number; arrivalSocSum: number;
      }> = {};

      for (const t of (trips || [])) {
        const model = (t as any).vehicle_model || 'Desconocido';
        if (!modelMap[model]) {
          modelMap[model] = { trips: 0, totalDistanceKm: 0, totalConsumptionKwh: 0, socSum: 0, arrivalSocSum: 0 };
        }
        const m = modelMap[model];
        m.trips += 1;
        m.totalDistanceKm += Number((t as any).distance_km) || 0;
        m.totalConsumptionKwh += Number((t as any).consumption_kwh) || 0;
        m.socSum += Number((t as any).start_soc) || 0;
        m.arrivalSocSum += Number((t as any).arrival_soc) || 0;
      }

      const byModel = Object.entries(modelMap)
        .map(([model, d]) => ({
          model,
          trips: d.trips,
          avgDistanceKm: d.trips > 0 ? Math.round(d.totalDistanceKm / d.trips) : 0,
          avgConsumptionKwh100km: d.totalDistanceKm > 0
            ? Math.round((d.totalConsumptionKwh / d.totalDistanceKm) * 100 * 10) / 10 : 0,
          avgStartSocPct: d.trips > 0 ? Math.round((d.socSum / d.trips) * 100) : 0,
          avgArrivalSocPct: d.trips > 0 ? Math.round((d.arrivalSocSum / d.trips) * 100) : 0,
          totalDistanceKm: Math.round(d.totalDistanceKm),
          totalConsumptionKwh: Math.round(d.totalConsumptionKwh * 10) / 10,
        }))
        .sort((a, b) => b.trips - a.trips);

      const totalTrips = trips?.length || 0;
      const totalModels = byModel.length;
      const totalDistanceKm = Math.round(byModel.reduce((s, m) => s + m.totalDistanceKm, 0));
      const avgConsumption = totalDistanceKm > 0
        ? Math.round(byModel.reduce((s, m) => s + m.totalConsumptionKwh, 0) / totalDistanceKm * 100 * 10) / 10 : 0;

      const brandMap: Record<string, number> = {};
      for (const m of byModel) {
        const brand = m.model.split(' ')[0];
        brandMap[brand] = (brandMap[brand] || 0) + m.trips;
      }
      const byBrand = Object.entries(brandMap)
        .map(([brand, trips]) => ({ brand, trips }))
        .sort((a, b) => b.trips - a.trips);

      setData({ rawTrips: trips || [], kpis: { totalTrips, totalModels, totalDistanceKm, avgConsumption }, byModel, byBrand });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const kpis = data ? [
    { label: 'Viajes registrados', value: data.kpis.totalTrips, icon: Route, color: 'emerald' },
    { label: 'Modelos EV activos', value: data.kpis.totalModels, icon: Car, color: 'blue' },
    { label: 'km totales planificados', value: data.kpis.totalDistanceKm.toLocaleString(), icon: TrendingUp, color: 'amber' },
    { label: 'Consumo promedio (kWh/100km)', value: data.kpis.avgConsumption || '--', icon: Zap, color: 'purple' },
  ] : [];

  const pieData = (data?.byBrand || []).slice(0, 8).map((b, i) => ({
    name: b.brand,
    value: b.trips,
    fill: PALETTE[i % PALETTE.length],
  }));

  const barData = (data?.byModel || []).slice(0, 10).map(m => ({
    ...m,
    shortModel: m.model.length > 20 ? m.model.split(' ').slice(0, 2).join(' ') : m.model,
  }));

  // Geographic calculations based on filterBrand
  const { benchmarkProvincial, topCantons } = React.useMemo(() => {
    if (!data?.rawTrips) return { benchmarkProvincial: [], topCantons: [] };
    
    // Robust location extractor handling Mapbox zipcodes and missing provinces
    const extractLoc = (str: string) => {
      if (!str) return null;
      // Filter out pure numbers (zip codes) and clean "City - Province" formatting
      const parts = str.split(',').map(s => s.trim().replace(/ - .*/, '')).filter(s => !/^\d+[- ]?\d*$/.test(s) && s.length > 2);
      
      let province = 'Desconocido';
      let canton = 'Desconocido';

      if (parts.length >= 3) {
         if (parts[parts.length - 1].toLowerCase() === 'ecuador') {
            province = parts[parts.length - 2];
            canton = parts[parts.length - 3];
         } else {
            province = parts[parts.length - 1];
            canton = parts[parts.length - 2];
         }
      } else if (parts.length === 2) {
         if (parts[1].toLowerCase() === 'ecuador') {
            province = parts[0];
            canton = parts[0];
         } else {
            province = parts[1];
            canton = parts[0];
         }
      } else if (parts.length === 1) {
         province = parts[0];
         canton = parts[0];
      }

      // If canton is a street name, fallback to province or guess city.
      if (/^(avenida|av\.|calle|vía|via|pasaje|ruta|autopista)\s/i.test(canton)) {
         if (province === 'Pichincha') canton = 'Quito';
         else if (province === 'Guayas') canton = 'Guayaquil';
         else canton = province;
      }

      // Mapbox often returns just the city for major hubs in Ecuador. We map them.
      const provMap: Record<string, string> = {
         'Quito': 'Pichincha', 'Guayaquil': 'Guayas', 'Cuenca': 'Azuay',
         'Sangolqui': 'Pichincha', 'Sangolquí': 'Pichincha', 'Cumbayá': 'Pichincha', 'Cumbaya': 'Pichincha',
         'Ibarra': 'Imbabura', 'Santo Domingo': 'Santo Domingo de los Tsáchilas',
         'Manta': 'Manabí', 'Portoviejo': 'Manabí', 'Ambato': 'Tungurahua',
         'Riobamba': 'Chimborazo', 'Loja': 'Loja', 'Machala': 'El Oro',
         'Durán': 'Guayas', 'Duran': 'Guayas', 'Latacunga': 'Cotopaxi'
      };

      if (provMap[province]) {
         canton = province;
         province = provMap[province];
      }
      return { canton, province };
    };

    const provMap: Record<string, { brandTrips: number; otherTrips: number }> = {};
    const cantonMap: Record<string, number> = {};

    data.rawTrips.forEach(t => {
      const vBrand = (t.vehicle_model || '').split(' ')[0];
      const isSelectedBrand = filterBrand === 'Todas' || vBrand === filterBrand;

      const locs = [extractLoc(t.origin_name), extractLoc(t.destination_name)].filter(Boolean);
      const uniqueProvs = new Set(locs.map(l => l!.province));
      const uniqueCantons = new Set(locs.map(l => l!.canton));

      // Provincial benchmarking
      uniqueProvs.forEach(prov => {
        if (!provMap[prov]) provMap[prov] = { brandTrips: 0, otherTrips: 0 };
        if (isSelectedBrand) provMap[prov].brandTrips++;
        else provMap[prov].otherTrips++;
      });

      // Cantons only for the selected brand
      if (isSelectedBrand) {
        uniqueCantons.forEach(canton => {
          cantonMap[canton] = (cantonMap[canton] || 0) + 1;
        });
      }
    });

    const benchmarkProvincial = Object.entries(provMap)
      .map(([prov, d]) => ({ prov, brandTrips: d.brandTrips, otherTrips: filterBrand === 'Todas' ? 0 : d.otherTrips }))
      .sort((a, b) => (b.brandTrips + b.otherTrips) - (a.brandTrips + a.otherTrips))
      .slice(0, 10);

    const topCantons = Object.entries(cantonMap)
      .map(([canton, trips]) => ({ canton, trips }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 10);

    return { benchmarkProvincial, topCantons };
  }, [data, filterBrand]);

  const allBrands = ['Todas', ...(data?.byBrand.map(b => b.brand) || [])];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Car size={22} className="text-emerald-400" />
            Dashboard Fabricantes EV
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Inteligencia de Mercado y Rendimiento Geográfico</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5">
            <span className="text-xs text-neutral-400 font-medium">Marca:</span>
            <select
              value={filterBrand}
              onChange={e => setFilterBrand(e.target.value)}
              className="bg-transparent text-sm text-white font-semibold outline-none cursor-pointer"
            >
              {allBrands.map(b => <option key={b} value={b} className="bg-neutral-900">{b}</option>)}
            </select>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-all border border-neutral-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-20 justify-center text-neutral-500">
          <Loader2 size={20} className="animate-spin text-emerald-500" />
          <span>Cargando datos...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-rose-400 text-sm mb-6">
          Error al cargar: {error}
        </div>
      )}

      {!loading && data && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`rounded-2xl border bg-${color}-500/10 border-${color}-500/20 p-5`}>
                <Icon size={18} className={`text-${color}-400 mb-3`} />
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-neutral-400 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {data.byModel.length === 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 text-center">
              <Car size={32} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm font-medium">Sin datos de viajes aun</p>
              <p className="text-neutral-600 text-xs mt-1">Los graficos se poblaran cuando los usuarios planifiquen y guarden rutas.</p>
            </div>
          )}

          {data.byModel.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-white text-sm font-semibold mb-4">Viajes por modelo (top 10)</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="shortModel" tick={{ fill: '#737373', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fill: '#737373', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<TooltipBar />} />
                      <Bar dataKey="trips" name="Viajes" radius={[4, 4, 0, 0]} onClick={(data: any) => setFilterBrand((data.shortModel as string)?.split(' ')[0] ?? '')} className="cursor-pointer hover:opacity-80 transition-opacity">
                        {barData.map((entry, i) => (
                          <Cell key={entry.model} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-white text-sm font-semibold mb-1">Consumo real (kWh/100km)</p>
                  <p className="text-neutral-500 text-xs mb-4">Basado en rutas guardadas por conductores reales en Ecuador</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="shortModel" tick={{ fill: '#737373', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fill: '#737373', fontSize: 11 }} unit="kWh" />
                      <Tooltip content={<TooltipBar />} />
                      <Bar dataKey="avgConsumptionKwh100km" name="kWh/100km" fill="#10b981" radius={[4, 4, 0, 0]} onClick={(data: any) => setFilterBrand((data.shortModel as string)?.split(' ')[0] ?? '')} className="cursor-pointer hover:opacity-80 transition-opacity" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-white text-sm font-semibold mb-4">Distribucion de flota por marca</p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={pieLabelFn}
                          labelLine={{ stroke: '#525252' }}
                          onClick={(data: any) => setFilterBrand(data?.name ?? '')}
                          className="cursor-pointer outline-none hover:opacity-80 transition-opacity"
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<TooltipPie />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-neutral-600 text-sm text-center py-10">Sin datos de marca</p>
                  )}
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-white text-sm font-semibold mb-1">SoC promedio por modelo</p>
                  <p className="text-neutral-500 text-xs mb-4">Inicio vs. llegada (top 8 modelos)</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData.slice(0, 8)} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="shortModel" tick={{ fill: '#737373', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fill: '#737373', fontSize: 11 }} unit="%" domain={[0, 100]} />
                      <Tooltip content={<TooltipBar />} />
                      <Bar dataKey="avgStartSocPct" name="SoC inicio %" fill="#3b82f6" radius={[4, 4, 0, 0]} onClick={(data: any) => setFilterBrand((data.shortModel as string)?.split(' ')[0] ?? '')} className="cursor-pointer hover:opacity-80 transition-opacity" />
                      <Bar dataKey="avgArrivalSocPct" name="SoC llegada %" fill="#10b981" radius={[4, 4, 0, 0]} onClick={(data: any) => setFilterBrand((data.shortModel as string)?.split(' ')[0] ?? '')} className="cursor-pointer hover:opacity-80 transition-opacity" />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#a3a3a3', paddingTop: 8 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* GEOGRAPHIC BENCHMARKING MODULE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold">Benchmarking Geográfico</p>
                      <p className="text-neutral-500 text-xs">Cuota de mercado activa por provincia ({filterBrand})</p>
                    </div>
                  </div>
                  {benchmarkProvincial.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={benchmarkProvincial} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="prov" tick={{ fill: '#737373', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: '#737373', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip content={<TooltipBar />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#a3a3a3', paddingTop: 8 }} />
                        <Bar dataKey="brandTrips" name={filterBrand === 'Todas' ? 'Viajes Totales' : `Viajes ${filterBrand}`} stackId="a" fill={BENCHMARK_PALETTE[0]} radius={filterBrand === 'Todas' ? [4,4,0,0] : [0,0,0,0]} />
                        {filterBrand !== 'Todas' && (
                          <Bar dataKey="otherTrips" name="Otras Marcas" stackId="a" fill={BENCHMARK_PALETTE[1]} radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-neutral-600 text-sm text-center py-10">Sin datos provinciales</p>
                  )}
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-neutral-800">
                    <p className="text-white text-sm font-semibold">Zonas de Alta Densidad (Destination Charging)</p>
                    <p className="text-neutral-500 text-xs">Cantones con más movilidad para la marca {filterBrand}</p>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-950/40 sticky top-0 backdrop-blur-md">
                          <th className="text-left px-4 py-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">#</th>
                          <th className="text-left px-4 py-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Cantón / Ciudad</th>
                          <th className="text-right px-4 py-3 text-emerald-500 font-semibold uppercase tracking-wider text-[10px]">Total Viajes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCantons.length > 0 ? topCantons.map((c, i) => (
                          <tr key={c.canton} className={`border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-neutral-950/20'}`}>
                            <td className="px-4 py-3 font-medium text-neutral-500">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-white">{c.canton}</td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-bold">{c.trips}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} className="text-center py-8 text-neutral-600">Sin datos cantonales</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-800">
                  <p className="text-white text-sm font-semibold">Detalle por modelo</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-950/40">
                        {['Modelo', 'Viajes', 'Dist. prom. (km)', 'Consumo (kWh/100km)', 'km totales', 'kWh totales', 'SoC inicio %', 'SoC llegada %'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.byModel.map((m, i) => (
                        <tr key={m.model} className={`border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-neutral-950/20'}`}>
                          <td className="px-4 py-3 font-medium text-white">{m.model}</td>
                          <td className="px-4 py-3 text-neutral-300">{m.trips}</td>
                          <td className="px-4 py-3 text-neutral-300">{m.avgDistanceKm}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${m.avgConsumptionKwh100km > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {m.avgConsumptionKwh100km}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-300">{m.totalDistanceKm.toLocaleString()}</td>
                          <td className="px-4 py-3 text-neutral-300">{m.totalConsumptionKwh}</td>
                          <td className="px-4 py-3 text-blue-400">{m.avgStartSocPct}%</td>
                          <td className="px-4 py-3 text-emerald-400">{m.avgArrivalSocPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
