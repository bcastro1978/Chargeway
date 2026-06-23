'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Loader2, Zap, MapPin, Globe, RefreshCw, Activity } from 'lucide-react';

interface OpData {
  kpis: { totalChargers: number; totalProvincias: number; rapidos: number; normales: number };
  byProvincia: { provincia: string; total: number }[];
  bySpeed: { tipo: string; total: number }[];
  byCost: { tipo: string; total: number }[];
  byType: { tipo: string; total: number }[];
  byPower: { potencia: string; total: number }[];
  chargerList: {
    id: string; nombre: string; provincia: string; canton: string;
    velocidad: string; potencia: string; costo: string; horario: string;
  }[];
}

const PALETTE = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#a78bfa'];
const SPEED_COLORS: Record<string, string> = { 'Carga Rápida': '#10b981', 'Carga Normal': '#f59e0b' };
const COST_COLORS: Record<string, string> = { 'Gratuito': '#10b981', 'Consultar': '#f59e0b', 'Pago': '#3b82f6', 'Desconocido': '#525252' };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs shadow-xl">
      {label && <p className="text-neutral-300 font-semibold mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>
          {p.name || p.payload?.tipo || p.payload?.potencia}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function OperadoresPage() {
  const [data, setData] = useState<OpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'nombre' | 'provincia' | 'potencia'>('provincia');

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/stats/operadores', {
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
    { label: 'Puntos de carga en red', value: data.kpis.totalChargers, icon: Zap, color: 'emerald' },
    { label: 'Provincias cubiertas', value: data.kpis.totalProvincias, icon: Globe, color: 'blue' },
    { label: 'Cargadores rápidos (DC)', value: data.kpis.rapidos, icon: Activity, color: 'amber' },
    { label: 'Cargadores normales (AC)', value: data.kpis.normales, icon: MapPin, color: 'purple' },
  ] : [];

  const speedPie = (data?.bySpeed || []).map(d => ({
    ...d, name: d.tipo, value: d.total, fill: SPEED_COLORS[d.tipo] || '#525252',
  }));
  const costPie = (data?.byCost || []).map(d => ({
    ...d, name: d.tipo, value: d.total, fill: COST_COLORS[d.tipo] || '#525252',
  }));

  const filtered = (data?.chargerList || [])
    .filter(c =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.provincia.toLowerCase().includes(search.toLowerCase()) ||
      c.canton.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a[sortCol].localeCompare(b[sortCol]));

  const topProvincias = (data?.byProvincia || []).slice(0, 12);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} className="text-amber-400" />
            Dashboard Operadores de Carga
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Cobertura nacional · Red de puntos de carga Ecuador</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-all border border-neutral-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-20 justify-center text-neutral-500">
          <Loader2 size={20} className="animate-spin text-amber-500" />
          <span>Cargando datos…</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-rose-400 text-sm mb-6">
          Error al cargar: {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`rounded-2xl border bg-${color}-500/10 border-${color}-500/20 p-5`}>
                <Icon size={18} className={`text-${color}-400 mb-3`} />
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-neutral-400 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Row 1: Province bar + Speed pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Province bar (2/3) */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-1">Cargadores por provincia</p>
              <p className="text-neutral-500 text-xs mb-4">Top {topProvincias.length} provincias</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProvincias} layout="vertical" margin={{ top: 0, right: 20, left: 90, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#737373', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="provincia" tick={{ fill: '#a3a3a3', fontSize: 11 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Cargadores" radius={[0, 4, 4, 0]}>
                    {topProvincias.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Speed pie (1/3) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-4">Tipo de carga</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={speedPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                    {speedPie.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a3a3a3' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {speedPie.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                      <span className="text-neutral-400">{s.name}</span>
                    </div>
                    <span className="text-white font-semibold">{s.total} ({data.kpis.totalChargers > 0 ? Math.round(s.total / data.kpis.totalChargers * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Cost pie + Power bar + Type bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Cost pie */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-4">Distribución por costo</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={costPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                    {costPie.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {costPie.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.fill }} />
                      <span className="text-neutral-400">{c.name}</span>
                    </div>
                    <span className="text-white font-semibold">{c.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Power bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-4">Potencia disponible</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byPower} margin={{ top: 0, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="potencia" tick={{ fill: '#737373', fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#737373', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Cargadores" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {data.byPower.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Connector type bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-4">Tipo de conector</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byType} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#737373', fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="tipo" tick={{ fill: '#a3a3a3', fontSize: 9 }} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Cargadores" radius={[0, 4, 4, 0]}>
                    {data.byType.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charger Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-white text-sm font-semibold">Directorio de estaciones (primeros 50)</p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar por nombre, provincia o cantón…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500/50 w-64"
                />
                <select
                  value={sortCol}
                  onChange={e => setSortCol(e.target.value as any)}
                  className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none"
                >
                  <option value="provincia">Ordenar: Provincia</option>
                  <option value="nombre">Ordenar: Nombre</option>
                  <option value="potencia">Ordenar: Potencia</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950/40">
                    {['Nombre', 'Provincia', 'Cantón', 'Velocidad', 'Potencia', 'Costo', 'Horario'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const isRapido = c.velocidad.toLowerCase().includes('rápid') || c.velocidad.includes('🟢');
                    return (
                      <tr key={c.id} className={`border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-neutral-950/20'}`}>
                        <td className="px-4 py-3 font-medium text-white max-w-[160px] truncate">{c.nombre}</td>
                        <td className="px-4 py-3 text-neutral-300">{c.provincia}</td>
                        <td className="px-4 py-3 text-neutral-400">{c.canton}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${isRapido ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                            {isRapido ? '⚡ Rápida' : '🔌 Normal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-300 font-mono">{c.potencia}</td>
                        <td className="px-4 py-3 text-neutral-400">{c.costo}</td>
                        <td className="px-4 py-3 text-neutral-500">{c.horario}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-neutral-600 text-sm">Sin resultados para "{search}"</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
