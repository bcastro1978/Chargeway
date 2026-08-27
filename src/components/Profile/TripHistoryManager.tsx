'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Clock, Gauge, Navigation, Zap, Battery, Trash2, Calendar, 
  Loader2, Route, Leaf, 
  Lightbulb, ZapOff, Scale, Filter, Car
} from 'lucide-react';

interface StoredTrip {
  id: string;
  user_id: string;
  origin_name: string;
  destination_name: string;
  vehicle_model: string;
  start_soc: number;
  arrival_soc: number;
  distance_km: number;
  duration_min: number;
  consumption_kwh: number;
  waypoints?: any[];
  created_at: string;
}

export const TripHistoryManager: React.FC<{ userId: string }> = ({ userId }) => {
  const [trips, setTrips] = useState<StoredTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');

  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      // Strictly filter trips created on or after August 27, 2026
      const cutoffDate = '2026-08-27T00:00:00.000Z';
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trips history:', error.message);
      } else if (data) {
        setTrips(data);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchTrips();
  }, [userId]);

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('¿Estás seguro de eliminar este viaje de tu historial?')) return;
    try {
      await supabase.from('trips').delete().eq('id', tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (err) {
      console.error('Error deleting trip:', err);
    }
  };

  // Parsed metrics for each trip
  const parsedTrips = useMemo(() => {
    return trips.map(trip => {
      const telemetryItem = (trip.waypoints || []).find((w: any) => w._telemetry);
      const telemetry = telemetryItem?._telemetry || {};

      const durationMin = telemetry.actual_duration_min || trip.duration_min || 1;
      const distanceKm = telemetry.actual_distance_km || trip.distance_km || 0;
      const consumptionKwh = telemetry.consumed_kwh || trip.consumption_kwh || 0;
      const avgSpeedKmh = telemetry.avg_speed_kmh || (durationMin > 0 ? (distanceKm / (durationMin / 60)) : 65);
      
      const startSocPct = Math.round((trip.start_soc || 0.8) * 100);
      const arrivalSocPct = Math.round((trip.arrival_soc || 0.5) * 100);
      const consumedSocPct = telemetry.consumed_soc_pct || Math.max(0, startSocPct - arrivalSocPct);

      // Efficiency in Wh/km: (consumptionKwh * 1000) / distanceKm
      const whKm = distanceKm > 0 ? Math.round((consumptionKwh * 1000) / distanceKm) : 150;

      const routeKey = `${trip.origin_name.trim().toLowerCase()} ➔ ${trip.destination_name.trim().toLowerCase()}`;

      return {
        ...trip,
        durationMin,
        distanceKm,
        consumptionKwh,
        avgSpeedKmh,
        startSocPct,
        arrivalSocPct,
        consumedSocPct,
        whKm,
        routeKey,
        formattedRouteName: `${trip.origin_name.trim()} ➔ ${trip.destination_name.trim()}`
      };
    });
  }, [trips]);

  // Distinct Route Groups registered by this specific user
  const userRegisteredRoutes = useMemo(() => {
    const map = new Map<string, { routeKey: string; name: string; count: number }>();
    parsedTrips.forEach(t => {
      if (!map.has(t.routeKey)) {
        map.set(t.routeKey, { routeKey: t.routeKey, name: t.formattedRouteName, count: 1 });
      } else {
        map.get(t.routeKey)!.count += 1;
      }
    });
    return Array.from(map.values());
  }, [parsedTrips]);

  // Route Grouping for Comparative Analysis
  const routeGroups = useMemo(() => {
    const groups: { [key: string]: typeof parsedTrips } = {};
    parsedTrips.forEach(t => {
      if (!groups[t.routeKey]) groups[t.routeKey] = [];
      groups[t.routeKey].push(t);
    });
    return groups;
  }, [parsedTrips]);

  // Filtered trips for list view and dynamic KPI dashboard recalculation
  const filteredTrips = useMemo(() => {
    if (selectedRouteFilter === 'all') return parsedTrips;
    return parsedTrips.filter(t => t.routeKey === selectedRouteFilter);
  }, [parsedTrips, selectedRouteFilter]);

  // Dynamic Global KPI Summary (Recalculates based on selected route filter / number of trips)
  const dynamicKpis = useMemo(() => {
    if (filteredTrips.length === 0) return null;
    const totalDist = filteredTrips.reduce((acc, t) => acc + t.distanceKm, 0);
    const totalEnergy = filteredTrips.reduce((acc, t) => acc + t.consumptionKwh, 0);
    const avgSpeed = filteredTrips.reduce((acc, t) => acc + t.avgSpeedKmh, 0) / filteredTrips.length;
    const avgWhKm = totalDist > 0 ? Math.round((totalEnergy * 1000) / totalDist) : 0;

    return {
      totalDist: Math.round(totalDist),
      totalEnergy: totalEnergy.toFixed(1),
      avgSpeed: avgSpeed.toFixed(1),
      avgWhKm,
      count: filteredTrips.length
    };
  }, [filteredTrips]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-neutral-400 gap-3">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
        <span className="text-sm font-medium">Cargando tu reporte analítico de viajes...</span>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-neutral-400 gap-3 border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40">
        <Route size={40} className="text-neutral-600 mb-1" />
        <h3 className="text-lg font-bold text-neutral-200">Sin viajes desde el 27 de Agosto de 2026</h3>
        <p className="text-xs text-neutral-500 max-w-sm">
          Aún no se registran viajes a partir del 27 de agosto de 2026. Realiza un trayecto con la aplicación para ver tu reporte analítico de velocidad vs consumo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Route Filter Dropdown Header (Loads User Registered Routes) */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
          <Filter size={16} className="text-emerald-400" />
          <span>Filtrar por Trayecto Registrado:</span>
        </div>

        <select
          value={selectedRouteFilter}
          onChange={e => setSelectedRouteFilter(e.target.value)}
          className="bg-neutral-950 border border-emerald-500/40 text-xs font-bold text-emerald-400 rounded-xl px-3 py-2 focus:outline-none cursor-pointer max-w-full truncate shadow-[0_0_10px_rgba(16,185,129,0.15)]"
        >
          <option value="all">Todas las Rutas ({parsedTrips.length} viajes)</option>
          {userRegisteredRoutes.map(r => (
            <option key={r.routeKey} value={r.routeKey}>
              {r.name} ({r.count} {r.count === 1 ? 'viaje' : 'viajes'})
            </option>
          ))}
        </select>
      </div>

      {/* 1. Dynamic EV Driver KPIs Header (Recalculates based on route selection & trip count) */}
      {dynamicKpis && (
        <div className="bg-neutral-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Leaf size={14} /> Reporte Analítico EV {selectedRouteFilter !== 'all' ? `— ${dynamicKpis.count} ${dynamicKpis.count === 1 ? 'Viaje' : 'Viajes'}` : `(${dynamicKpis.count} Trayectos)`}
            </span>
            <span className="text-[10px] text-neutral-400 font-semibold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
              Desde 27 Ago 2026
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {/* KPI 1 */}
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/60">
              <span className="text-[9px] text-neutral-400 font-extrabold uppercase block">Distancia Recorrida</span>
              <span className="text-lg font-black text-white">{dynamicKpis.totalDist} <span className="text-xs font-normal text-neutral-400">km</span></span>
            </div>
            {/* KPI 2 */}
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/60">
              <span className="text-[9px] text-neutral-400 font-extrabold uppercase block">Consumo Total</span>
              <span className="text-lg font-black text-yellow-400">{dynamicKpis.totalEnergy} <span className="text-xs font-normal text-neutral-400">kWh</span></span>
            </div>
            {/* KPI 3 */}
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/60">
              <span className="text-[9px] text-neutral-400 font-extrabold uppercase block">Eficiencia Media</span>
              <span className="text-lg font-black text-emerald-400">{dynamicKpis.avgWhKm} <span className="text-xs font-normal text-neutral-400">Wh/km</span></span>
            </div>
            {/* KPI 4 */}
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/60">
              <span className="text-[9px] text-neutral-400 font-extrabold uppercase block">Velocidad Media</span>
              <span className="text-lg font-black text-amber-400">{dynamicKpis.avgSpeed} <span className="text-xs font-normal text-neutral-400">km/h</span></span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Route Comparison Section (Velocidad vs Consumo en Trayectos Repetidos) */}
      {Object.keys(routeGroups).some(key => routeGroups[key].length >= 2 && (selectedRouteFilter === 'all' || selectedRouteFilter === key)) && (
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
            <Scale size={15} className="text-cyan-400" /> Comparativa de Consumo por Velocidad en Trayectos Repetidos
          </h4>

          {Object.keys(routeGroups)
            .filter(key => routeGroups[key].length >= 2 && (selectedRouteFilter === 'all' || selectedRouteFilter === key))
            .map(routeKey => {
              const routeTrips = routeGroups[routeKey];
              const sortedBySpeed = [...routeTrips].sort((a, b) => a.avgSpeedKmh - b.avgSpeedKmh);
              const slowest = sortedBySpeed[0];
              const fastest = sortedBySpeed[sortedBySpeed.length - 1];

              const speedDiff = Math.round(fastest.avgSpeedKmh - slowest.avgSpeedKmh);
              const socDiff = fastest.consumedSocPct - slowest.consumedSocPct;
              const energyDiffKwh = (fastest.consumptionKwh - slowest.consumptionKwh).toFixed(1);

              return (
                <div 
                  key={routeKey}
                  className="bg-neutral-950/90 border border-cyan-500/30 rounded-2xl p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="text-sm font-black text-cyan-400 truncate">
                      🛣️ {slowest.formattedRouteName}
                    </span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-2.5 py-0.5 rounded-full border border-cyan-800 shrink-0">
                      {routeTrips.length} viajes registrados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <Leaf size={12} /> Manejo Más Eficiente
                        </span>
                        <span className="text-[10px] text-neutral-400">{slowest.avgSpeedKmh.toFixed(1)} km/h</span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-xl font-black text-white">-{slowest.consumedSocPct}% <span className="text-xs font-normal text-neutral-400">batería</span></span>
                        <span className="text-xs font-bold text-emerald-400">{slowest.consumptionKwh.toFixed(1)} kWh ({slowest.whKm} Wh/km)</span>
                      </div>
                    </div>

                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <ZapOff size={12} /> Mayor Velocidad
                        </span>
                        <span className="text-[10px] text-neutral-400">{fastest.avgSpeedKmh.toFixed(1)} km/h</span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-xl font-black text-rose-400">-{fastest.consumedSocPct}% <span className="text-xs font-normal text-neutral-400">batería</span></span>
                        <span className="text-xs font-bold text-amber-400">{fastest.consumptionKwh.toFixed(1)} kWh ({fastest.whKm} Wh/km)</span>
                      </div>
                    </div>
                  </div>

                  {speedDiff > 3 && (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 flex items-start gap-2 text-xs">
                      <Lightbulb className="text-yellow-400 shrink-0 mt-0.5" size={16} />
                      <p className="text-neutral-300 leading-snug">
                        <strong className="text-emerald-400">Insight de Eficiencia:</strong> Conducir a un promedio de{' '}
                        <strong className="text-white">{slowest.avgSpeedKmh.toFixed(0)} km/h</strong> en lugar de{' '}
                        <strong className="text-white">{fastest.avgSpeedKmh.toFixed(0)} km/h</strong> en esta ruta te ahorra un{' '}
                        <strong className="text-emerald-400">+{socDiff}% de batería</strong> ({energyDiffKwh} kWh menos consumidos).
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* 3. Proposal 1: EV Telemetry Flow Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Navigation size={14} /> Detalle de Trayectos Seleccionados ({filteredTrips.length})
          </span>
        </div>

        {/* Trips Cards List matching Proposal 1 identical layout */}
        <div className="space-y-4">
          {filteredTrips.map(trip => {
            const hours = Math.floor(trip.durationMin / 60);
            const mins = Math.round(trip.durationMin % 60);
            const durationText = hours > 0 ? `${hours}h ${mins.toString().padStart(2, '0')}m` : `${mins}m`;

            const formattedDate = new Date(trip.created_at).toLocaleDateString('es-EC', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Efficiency Tag Badge
            let effBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
            let effBadgeLabel = '🍃 ECO-EFICIENTE';
            if (trip.whKm > 180) {
              effBadgeClass = 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
              effBadgeLabel = '⚡ ALTO CONSUMO';
            } else if (trip.whKm > 145) {
              effBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
              effBadgeLabel = '⚡ MODERADO';
            }

            return (
              <div
                key={trip.id}
                className="bg-neutral-950/90 border border-emerald-500/30 rounded-3xl p-5 shadow-[0_0_25px_rgba(16,185,129,0.12)] transition-all hover:border-emerald-500/60 space-y-4 group relative"
              >
                {/* 1. Top Row: Route Title Header + Badges + Delete Button */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 text-xl font-black text-white tracking-tight flex-wrap">
                      <span className="uppercase">{trip.origin_name}</span>
                      <span className="text-emerald-400 font-normal">➔</span>
                      <span className="uppercase text-emerald-400">{trip.destination_name}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <Car size={13} /> {trip.vehicle_model.toUpperCase()}
                      </span>
                      <span className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Calendar size={13} className="text-neutral-500" /> {formattedDate}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${effBadgeClass}`}>
                        {effBadgeLabel}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTrip(trip.id)}
                    className="text-neutral-600 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition opacity-80 group-hover:opacity-100"
                    title="Eliminar viaje"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* 2. Middle Horizontal 5-Column Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-y border-neutral-800/80 text-left">
                  {/* Metric 1: Distance */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Navigation size={12} className="text-emerald-400" /> Distance
                    </span>
                    <div className="text-lg sm:text-xl font-black text-emerald-400">
                      {trip.distanceKm.toFixed(1)} <span className="text-xs font-normal text-neutral-400">km</span>
                    </div>
                  </div>

                  {/* Metric 2: Duration */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Clock size={12} className="text-emerald-400" /> Duration
                    </span>
                    <div className="text-lg sm:text-xl font-black text-emerald-400">
                      {durationText}
                    </div>
                  </div>

                  {/* Metric 3: Avg Speed */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Gauge size={12} className="text-emerald-400" /> Avg Speed
                    </span>
                    <div className="text-lg sm:text-xl font-black text-emerald-400">
                      {trip.avgSpeedKmh.toFixed(1)} <span className="text-xs font-normal text-neutral-400">km/h</span>
                    </div>
                  </div>

                  {/* Metric 4: Total Energy */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Zap size={12} className="text-emerald-400" /> Total Energy
                    </span>
                    <div className="text-lg sm:text-xl font-black text-emerald-400">
                      {trip.consumptionKwh.toFixed(1)} <span className="text-xs font-normal text-neutral-400">kWh</span>
                    </div>
                  </div>

                  {/* Metric 5: Efficiency Rate */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Leaf size={12} className="text-emerald-400" /> Efficiency Rate
                    </span>
                    <div className="text-lg sm:text-xl font-black text-emerald-400">
                      {trip.whKm} <span className="text-xs font-normal text-neutral-400">Wh/km</span>
                    </div>
                  </div>
                </div>

                {/* 3. Bottom Battery Progress Bar Box */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                      Battery Progress
                    </span>
                    <span className="text-[10px] font-bold text-rose-400">
                      -{trip.consumedSocPct}% USED
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-3 bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden flex p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-500" 
                      style={{ width: `${trip.arrivalSocPct}%` }}
                    />
                    <div 
                      className="h-full bg-rose-500/80 rounded-full ml-0.5" 
                      style={{ width: `${trip.consumedSocPct}%` }}
                    />
                  </div>

                  {/* Footer SOC Values */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      STATE OF CHARGE (SOC)
                    </span>
                    <div className="flex items-center gap-4 text-xs font-black">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Battery size={14} className="text-emerald-400" /> {trip.arrivalSocPct}% REMAINING
                      </span>
                      <span className="text-rose-400 flex items-center gap-1">
                        <ZapOff size={14} className="text-rose-400" /> -{trip.consumedSocPct}% USED
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TripHistoryManager;
