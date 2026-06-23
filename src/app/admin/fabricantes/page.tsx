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

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/stats/fabricantes', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Car size={22} className="text-emerald-400" />
            Dashboard Fabricantes EV
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Rendimiento real por modelo - Datos agregados anonimos</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-all border border-neutral-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
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
                      <Bar dataKey="trips" name="Viajes" radius={[4, 4, 0, 0]}>
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
                      <Bar dataKey="avgConsumptionKwh100km" name="kWh/100km" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                      <Bar dataKey="avgStartSocPct" name="SoC inicio %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgArrivalSocPct" name="SoC llegada %" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#a3a3a3', paddingTop: 8 }} />
                    </BarChart>
                  </ResponsiveContainer>
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
