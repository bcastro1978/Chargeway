'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ECUADOR_CHARGERS_FALLBACK } from '@/lib/data/ecuador-chargers';
import polyline from 'polyline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Loader2, Zap, MapPin, Globe, RefreshCw, Activity, Map as MapIcon, TableProperties } from 'lucide-react';
import { DemandMap, TripRoute } from '@/components/admin/DemandMap';

interface OpData {
  kpis: { totalChargers: number; totalProvincias: number; rapidos: number; normales: number };
  byProvincia: { provincia: string; total: number }[];
  bySpeed: { tipo: string; total: number }[];
  byType: { tipo: string; total: number }[];
  byPower: { potencia: string; total: number }[];
  tripsList: TripRoute[];
  chargerList: any[];
}

function getDayOfWeek(dateString: string) {
  const date = new Date(dateString);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
  const [sortCol, setSortCol] = useState<'nombre' | 'provincia' | 'potencia' | 'traffic'>('provincia');
  const [activeTab, setActiveTab] = useState<'tabla' | 'mapa'>('tabla');

  // Map Filters
  const [filterDay, setFilterDay] = useState<string>('Todos');
  const [filterBrand, setFilterBrand] = useState<string>('Todas');
  const [filterModel, setFilterModel] = useState<string>('Todos');
  const [filterProvince, setFilterProvince] = useState<string>('Todas');
  const [filterCanton, setFilterCanton] = useState<string>('Todos');

  async function load() {
    setLoading(true); setError(null);
    try {
      // Load chargers: try Supabase first, fall back to bundled data
      let chargers: any[] = [];
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('charging_points')
          .select('*');
        chargers = (!dbError && dbData && dbData.length > 0) ? dbData : ECUADOR_CHARGERS_FALLBACK;
      } catch {
        chargers = ECUADOR_CHARGERS_FALLBACK;
      }

      // Fetch trips to calculate traffic
      const { data: trips } = await supabase.from('trips').select('id, created_at, origin_name, destination_name, vehicle_model, route_geometry');
      
      const mappedTrips: TripRoute[] = (trips || []).map(t => ({
        id: t.id,
        vehicle_model: t.vehicle_model || 'Desconocido',
        dayOfWeek: t.created_at ? getDayOfWeek(t.created_at) : 'Desconocido',
        origin_name: t.origin_name || '',
        destination_name: t.destination_name || '',
        geometry: t.route_geometry || ''
      }));

      setData({
        kpis: { totalChargers: 0, totalProvincias: 0, rapidos: 0, normales: 0 },
        byProvincia: [], bySpeed: [], byType: [], byPower: [],
        chargerList: chargers,
        tripsList: mappedTrips
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Calculate derived state
  const {
    filteredTrips,
    processedChargers,
    kpis,
    bySpeed,
    byCost,
    byType,
    byPower,
    byProvincia,
    trafficByDay
  } = React.useMemo(() => {
    const rawChargers = data?.chargerList || [];
    const rawTrips = data?.tripsList || [];
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // 1. Filter Trips
    let trips = rawTrips;
    if (filterDay !== 'Todos') trips = trips.filter(t => t.dayOfWeek === filterDay);
    if (filterProvince !== 'Todas') trips = trips.filter(t => t.origin_name.includes(filterProvince) || t.destination_name.includes(filterProvince));
    if (filterCanton !== 'Todos') trips = trips.filter(t => t.origin_name.includes(filterCanton) || t.destination_name.includes(filterCanton));
    if (filterBrand !== 'Todas') trips = trips.filter(t => t.vehicle_model.split(' ')[0] === filterBrand);
    if (filterModel !== 'Todos') trips = trips.filter(t => {
      const parts = t.vehicle_model.split(' ');
      const m = parts.slice(1).join(' ');
      return m === filterModel;
    });

    const trafficByDayMap: Record<string, number> = {};
    trips.forEach(t => trafficByDayMap[t.dayOfWeek] = (trafficByDayMap[t.dayOfWeek] || 0) + 1);
    const computedTrafficByDay = days.map(day => ({ day, total: trafficByDayMap[day] || 0 }));

    // Decode trips for distance calc
    const decodedTrips = trips.map(t => {
      let points: [number, number][] = [];
      if (t.geometry) {
        try {
          const geom = JSON.parse(t.geometry);
          if (geom && geom.coordinates) {
            points = (geom.coordinates as number[][]).map(c => [c[1], c[0]]);
          }
        } catch(e) {}
      }
      return { model: t.vehicle_model, points };
    });

    // 2. Filter Chargers
    let chargers = rawChargers;
    if (filterProvince !== 'Todas') chargers = chargers.filter(c => (c.provincia || c.province || '') === filterProvince);
    if (filterCanton !== 'Todos') chargers = chargers.filter(c => (c.canton || c.city_or_canton || '') === filterCanton);
    if (search) {
      const q = search.toLowerCase();
      chargers = chargers.filter(c => (c.nombre || c.name || '').toLowerCase().includes(q) || (c.provincia || c.province || '').toLowerCase().includes(q) || (c.canton || c.city_or_canton || '').toLowerCase().includes(q));
    }

    // 3. Process Chargers (Traffic + Formatting)
    const procChargers = chargers.map(c => {
      const lat = c.location?.lat || c.lat || 0;
      const lng = c.location?.lng || c.lng || 0;
      const traffic: Record<string, number> = {};

      if (lat && lng) {
        for (let i = 0; i < decodedTrips.length; i++) {
          const trip = decodedTrips[i];
          let passes = false;
          for (const pt of trip.points) {
            if (getDistance(lat, lng, pt[0], pt[1]) <= 5) { passes = true; break; }
          }
          if (passes) traffic[trip.model] = (traffic[trip.model] || 0) + 1;
        }
      }

      return {
        id: c.id,
        nombre: c.nombre || c.name || 'Sin nombre',
        provincia: c.provincia || c.province || '',
        canton: c.canton || c.city_or_canton || '',
        lat, lng,
        velocidad: c.velocidad || c.speed || '',
        potencia: c.potencia || c.power || '',
        costo: c.costo || c.cost_type || '',
        horario: c.horario || c.schedule || '',
        traffic
      };
    });

    // Sort procChargers
    procChargers.sort((a, b) => {
      if (sortCol === 'traffic') {
        const aT = Object.values(a.traffic).reduce((s, v) => s + v, 0);
        const bT = Object.values(b.traffic).reduce((s, v) => s + v, 0);
        return bT - aT;
      }
      return a[sortCol].localeCompare(b[sortCol]);
    });

    // 4. Aggregations on procChargers
    let rapidos = 0, normales = 0;
    const provMap: Record<string, number> = {};
    const costMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    const powerMap: Record<string, number> = {};

    for (const c of chargers) {
      // Speed
      const speed = (c.velocidad || c.speed || '').toLowerCase();
      if (speed.includes('rápid') || speed.includes('rapido') || speed.includes('rapid') || speed.includes('verde')) rapidos++;
      else normales++;

      // Province
      const prov = c.provincia || c.province || 'Sin provincia';
      provMap[prov] = (provMap[prov] || 0) + 1;

      // Cost
      const cost = c.costo || c.cost_type || 'Desconocido';
      const costKey = cost.includes('Gratuito') || cost.includes('gratuito') ? 'Gratuito' : cost.includes('Consultar') || cost.includes('consultar') ? 'Consultar' : cost.includes('$') || cost.includes('USD') ? 'Pago' : 'Desconocido';
      costMap[costKey] = (costMap[costKey] || 0) + 1;

      // Type
      const tipo = c.tipo_cargador || c.charger_type || 'Desconocido';
      const typeKey = tipo.length > 30 ? tipo.substring(0, 30) + '…' : tipo;
      typeMap[typeKey] = (typeMap[typeKey] || 0) + 1;

      // Power
      const potencia = c.potencia || c.power || '?';
      powerMap[potencia] = (powerMap[potencia] || 0) + 1;
    }

    return {
      filteredTrips: trips,
      processedChargers: procChargers,
      kpis: {
        totalChargers: procChargers.length,
        totalProvincias: Object.keys(provMap).length,
        rapidos, normales
      },
      byProvincia: Object.entries(provMap).map(([provincia, total]) => ({ provincia, total })).sort((a, b) => b.total - a.total),
      bySpeed: [{ tipo: 'Carga Rápida', total: rapidos }, { tipo: 'Carga Normal', total: normales }],
      byCost: Object.entries(costMap).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total),
      byType: Object.entries(typeMap).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total).slice(0, 8),
      byPower: Object.entries(powerMap).map(([potencia, total]) => ({ potencia, total })).sort((a, b) => b.total - a.total).slice(0, 8),
      trafficByDay: computedTrafficByDay
    };
  }, [data, filterDay, filterProvince, filterCanton, filterBrand, filterModel, search, sortCol]);

  const speedPie = bySpeed.map(d => ({ ...d, name: d.tipo, value: d.total, fill: SPEED_COLORS[d.tipo] || '#525252' }));
  const costPie = byCost.map(d => ({ ...d, name: d.tipo, value: d.total, fill: COST_COLORS[d.tipo] || '#525252' }));

  // Options for Dropdowns
  const allProvinces = Array.from(new Set(data?.chargerList.map(c => c.provincia || c.province || ''))).filter(Boolean).sort();
  const allCantons = Array.from(new Set(data?.chargerList.filter(c => filterProvince === 'Todas' || (c.provincia || c.province) === filterProvince).map(c => c.canton || c.city_or_canton || ''))).filter(Boolean).sort();
  const allBrands = Array.from(new Set(data?.tripsList.map(t => t.vehicle_model.split(' ')[0]))).filter(Boolean).sort();
  const allModels = Array.from(new Set(data?.tripsList.filter(t => filterBrand === 'Todas' || t.vehicle_model.split(' ')[0] === filterBrand).map(t => t.vehicle_model.split(' ').slice(1).join(' ')))).filter(Boolean).sort();
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const topProvincias = byProvincia.slice(0, 12);

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
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
            {[
              { label: 'Puntos de carga en red', value: kpis.totalChargers, icon: Zap, color: 'emerald' },
              { label: 'Provincias cubiertas', value: kpis.totalProvincias, icon: Globe, color: 'blue' },
              { label: 'Cargadores rápidos (DC)', value: kpis.rapidos, icon: Activity, color: 'amber' },
              { label: 'Cargadores normales (AC)', value: kpis.normales, icon: MapPin, color: 'purple' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`rounded-2xl border bg-${color}-500/10 border-${color}-500/20 p-5`}>
                <Icon size={18} className={`text-${color}-400 mb-3`} />
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-neutral-400 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Row 1: Province bar + Speed pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
            
            {/* Power bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-4">Potencia disponible</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byPower} margin={{ top: 0, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="potencia" tick={{ fill: '#737373', fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#737373', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Cargadores" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {byPower.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Connector type bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <p className="text-white text-sm font-semibold mb-4">Tipo de conector</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byType} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#737373', fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="tipo" tick={{ fill: '#a3a3a3', fontSize: 9 }} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Cargadores" radius={[0, 4, 4, 0]}>
                    {byType.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
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

          {/* Row 2: Tabs and Content */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="border-b border-neutral-800 flex items-center justify-between p-2">
              <div className="flex gap-1">
                <button onClick={() => setActiveTab('tabla')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'tabla' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  <TableProperties size={14} /> Directorio de Estaciones
                </button>
                <button onClick={() => setActiveTab('mapa')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'mapa' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  <MapIcon size={14} /> Demanda de Rutas (Mapa)
                </button>
              </div>
            </div>

            {activeTab === 'mapa' && (
              <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-2 flex flex-col gap-4">
                  {/* Map Header with Filters */}
                  <div className="flex flex-wrap gap-3 items-center">
                    <select 
                      value={filterProvince} 
                      onChange={e => { setFilterProvince(e.target.value); setFilterCanton('Todos'); }}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 w-36"
                    >
                      <option value="Todas">Todas las Provincias</option>
                      {allProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select 
                      value={filterCanton} 
                      onChange={e => setFilterCanton(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 w-36"
                    >
                      <option value="Todos">Todos los Cantones</option>
                      {allCantons.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                      value={filterDay} 
                      onChange={e => setFilterDay(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Todos">Todos los Días</option>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select 
                      value={filterBrand} 
                      onChange={e => { setFilterBrand(e.target.value); setFilterModel('Todos'); }}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 max-w-[150px]"
                    >
                      <option value="Todas">Todas las Marcas</option>
                      {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select 
                      value={filterModel} 
                      onChange={e => setFilterModel(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 max-w-[150px]"
                    >
                      <option value="Todos">Todos los Modelos</option>
                      {allModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="ml-auto text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      {filteredTrips.length} viajes filtrados
                    </div>
                  </div>
                  <div className="h-[550px] w-full relative">
                    <DemandMap chargers={processedChargers as any[]} trips={filteredTrips} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 shadow-inner h-full flex flex-col">
                    <h3 className="text-sm font-semibold text-neutral-300 mb-6">Tráfico Histórico por Día</h3>
                    <div className="flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trafficByDay} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                          <XAxis type="number" stroke="#525252" fontSize={10} allowDecimals={false} />
                          <YAxis dataKey="day" type="category" stroke="#525252" fontSize={10} width={70} />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: '#171717'}} />
                          <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                            {trafficByDay.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-neutral-500 text-center mt-4">
                      Basado en las rutas filtradas en el mapa actual.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tabla' && (
              <div>
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
                      onChange={(e) => setSortCol(e.target.value as any)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="provincia">Ordenar: Provincia</option>
                      <option value="nombre">Ordenar: Nombre</option>
                      <option value="potencia">Ordenar: Potencia</option>
                      <option value="traffic">Ordenar: Tráfico (5km)</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-950/40">
                      {['Nombre', 'Provincia', 'Cantón', 'Velocidad', 'Potencia', 'Tráfico (5km)', 'Costo'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processedChargers.map((c, i) => {
                      const isRapido = c.velocidad.toLowerCase().includes('rápid') || c.velocidad.includes('🟢');
                      const trafficEntries = Object.entries(c.traffic);
                      const totalTraffic = trafficEntries.reduce((sum, [, count]) => sum + count, 0);
                      const trafficTooltip = trafficEntries.map(([model, count]) => `${model}: ${count} viaje(s)`).join('\n') || 'Sin tráfico en 5km';

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
                          <td className="px-4 py-3" title={trafficTooltip}>
                            {totalTraffic > 0 ? (
                              <span className="px-2 py-1 rounded-md bg-indigo-500/15 text-indigo-400 font-semibold text-[10px] cursor-help">
                                {totalTraffic} viajes
                              </span>
                            ) : (
                              <span className="text-neutral-600 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-400">{c.costo}</td>
                        </tr>
                      );
                    })}
                    {processedChargers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-neutral-600 text-sm">Sin resultados para &ldquo;{search}&rdquo; o los filtros actuales</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
