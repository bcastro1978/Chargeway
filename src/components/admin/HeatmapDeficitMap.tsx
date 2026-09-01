'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Flame,
  Zap,
  Car,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Loader2,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface RawTrip {
  id: string;
  origin: string;
  destination: string;
  brand: string;
  model: string;
  distanceKm: number;
  kwh: number;
  coordinates: [number, number][];
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
}

interface RawCharger {
  id: string;
  name: string;
  lat: number;
  lng: number;
  power: string;
  speed: string;
  charger_type: string;
  province: string;
  connectors: string[];
}

interface CorridorAnalysis {
  id: string;
  name: string;
  origin: string;
  destination: string;
  tripsCount: number;
  distanceKm: number;
  avgKwh: number;
  coordinates: [number, number][];
  midPoint: [number, number];
  compatibleChargersCount: number;
  deficitScore: number;
  severity: 'Crítico' | 'Moderado' | 'Adecuado';
  recommendation: string;
}

export const HeatmapDeficitMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Raw data from API
  const [allTrips, setAllTrips] = useState<RawTrip[]>([]);
  const [allChargers, setAllChargers] = useState<RawCharger[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableConnectors, setAvailableConnectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('Todas');
  const [selectedConnector, setSelectedConnector] = useState<string>('Todos');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('Todos');

  // Layer Visibility
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showChargers, setShowChargers] = useState<boolean>(true);

  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // 1. Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/stats/deficit');
        if (res.ok) {
          const json = await res.json();
          setAllTrips(json.trips || []);
          setAllChargers(json.chargers || []);
          setAvailableBrands(['Todas', ...(json.brands || [])]);
          setAvailableConnectors(['Todos', ...(json.connectors || [])]);
        }
      } catch (err) {
        console.error('Error fetching deficit map data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-78.5249, -0.9],
      zoom: 6.8,
      attributionControl: false
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 3. Filtered Chargers based on connector
  const filteredChargers = useMemo(() => {
    if (selectedConnector === 'Todos') return allChargers;
    return allChargers.filter(ch =>
      ch.connectors.some(c => c.toLowerCase() === selectedConnector.toLowerCase())
    );
  }, [allChargers, selectedConnector]);

  // 4. Filtered Trips based on Brand
  const filteredTrips = useMemo(() => {
    if (selectedBrand === 'Todas') return allTrips;
    return allTrips.filter(t =>
      t.brand.toLowerCase() === selectedBrand.toLowerCase()
    );
  }, [allTrips, selectedBrand]);

  // 5. Corridors & Deficit Calculation
  const analyzedCorridors = useMemo(() => {
    const corridorsMap: Record<string, {
      name: string;
      origin: string;
      destination: string;
      trips: number;
      coords: [number, number][];
      distSum: number;
      kwhSum: number;
    }> = {};

    filteredTrips.forEach(t => {
      if (!t.coordinates || t.coordinates.length < 2) return;
      const key = `${t.origin} ➔ ${t.destination}`;
      if (!corridorsMap[key]) {
        corridorsMap[key] = {
          name: key,
          origin: t.origin,
          destination: t.destination,
          trips: 0,
          coords: t.coordinates,
          distSum: 0,
          kwhSum: 0
        };
      }
      corridorsMap[key].trips += 1;
      corridorsMap[key].distSum += t.distanceKm;
      corridorsMap[key].kwhSum += t.kwh;
    });

    // Helper: Haversine distance in km
    function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const results: CorridorAnalysis[] = Object.entries(corridorsMap).map(([id, c]) => {
      const midIdx = Math.floor(c.coords.length / 2);
      const midPoint = c.coords[midIdx] || [-78.5, -0.2];

      // Count compatible chargers within a 20 km buffer of the midpoint
      const compatibleNear = filteredChargers.filter(ch => {
        const d = haversine(midPoint[1], midPoint[0], ch.lat, ch.lng);
        return d <= 20;
      }).length;

      // Deficit Index
      const deficitScore = Number((c.trips / Math.max(1, compatibleNear * 2.5)).toFixed(1));

      let severity: 'Crítico' | 'Moderado' | 'Adecuado' = 'Adecuado';
      let recommendation = 'Cobertura adecuada para el flujo actual.';

      if (deficitScore >= 5.0 || (c.trips >= 8 && compatibleNear === 0)) {
        severity = 'Crítico';
        recommendation = `Instalación urgente de estación rápida DC (≥60 kW con conector ${selectedConnector === 'Todos' ? 'CCS2' : selectedConnector}).`;
      } else if (deficitScore >= 2.0 || (c.trips >= 5 && compatibleNear <= 1)) {
        severity = 'Moderado';
        recommendation = `Densificación recomendada de 1 punto de carga adicional semirrápido (22-40 kW).`;
      }

      return {
        id,
        name: c.name,
        origin: c.origin,
        destination: c.destination,
        tripsCount: c.trips,
        distanceKm: Math.round(c.distSum / c.trips),
        avgKwh: Number((c.kwhSum / c.trips).toFixed(1)),
        coordinates: c.coords,
        midPoint,
        compatibleChargersCount: compatibleNear,
        deficitScore,
        severity,
        recommendation
      };
    });

    // Apply Severity filter
    if (selectedSeverity === 'Crítico') {
      return results.filter(c => c.severity === 'Crítico').sort((a, b) => b.deficitScore - a.deficitScore);
    }
    if (selectedSeverity === 'Moderado') {
      return results.filter(c => c.severity === 'Moderado').sort((a, b) => b.deficitScore - a.deficitScore);
    }
    return results.sort((a, b) => b.deficitScore - a.deficitScore);
  }, [filteredTrips, filteredChargers, selectedSeverity, selectedConnector]);

  // 6. Update Mapbox Layers (Heatmap & Corridors)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // --- Heatmap Data: Sample points along all filtered trip routes ---
    const heatPoints: any[] = [];
    filteredTrips.forEach(t => {
      (t.coordinates || []).forEach(coord => {
        heatPoints.push({
          type: 'Feature',
          properties: { weight: 1 },
          geometry: { type: 'Point', coordinates: coord }
        });
      });
    });

    const heatmapGeoJson: any = {
      type: 'FeatureCollection',
      features: heatPoints
    };

    if (map.current.getSource('demand-heatmap-source')) {
      (map.current.getSource('demand-heatmap-source') as mapboxgl.GeoJSONSource).setData(heatmapGeoJson);
    } else {
      map.current.addSource('demand-heatmap-source', {
        type: 'geojson',
        data: heatmapGeoJson
      });

      map.current.addLayer({
        id: 'demand-heatmap-layer',
        type: 'heatmap',
        source: 'demand-heatmap-source',
        maxzoom: 13,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(6, 182, 212, 0)',
            0.15, 'rgba(6, 182, 212, 0.4)',
            0.35, 'rgba(16, 185, 129, 0.7)',
            0.6, 'rgba(245, 158, 11, 0.85)',
            0.85, 'rgba(239, 68, 68, 0.95)',
            1.0, '#ffffff'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 9, 22],
          'heatmap-opacity': 0.85
        }
      });
    }

    // Toggle heatmap visibility
    if (map.current.getLayer('demand-heatmap-layer')) {
      map.current.setLayoutProperty(
        'demand-heatmap-layer',
        'visibility',
        showHeatmap ? 'visible' : 'none'
      );
    }

    // --- Corridors Deficit Lines ---
    const corridorFeatures: any[] = analyzedCorridors.map(c => ({
      type: 'Feature',
      properties: {
        id: c.id,
        name: c.name,
        severity: c.severity,
        trips: c.tripsCount,
        color: c.severity === 'Crítico' ? '#ef4444' : c.severity === 'Moderado' ? '#f59e0b' : '#10b981',
        width: Math.min(8, Math.max(3, c.tripsCount * 0.4))
      },
      geometry: {
        type: 'LineString',
        coordinates: c.coordinates
      }
    }));

    const corridorsGeoJson: any = {
      type: 'FeatureCollection',
      features: corridorFeatures
    };

    if (map.current.getSource('corridors-source')) {
      (map.current.getSource('corridors-source') as mapboxgl.GeoJSONSource).setData(corridorsGeoJson);
    } else {
      map.current.addSource('corridors-source', {
        type: 'geojson',
        data: corridorsGeoJson
      });

      map.current.addLayer({
        id: 'corridors-layer',
        type: 'line',
        source: 'corridors-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': 0.75
        }
      });
    }

    // Toggle corridors visibility
    if (map.current.getLayer('corridors-layer')) {
      map.current.setLayoutProperty(
        'corridors-layer',
        'visibility',
        showCorridors ? 'visible' : 'none'
      );
    }
  }, [isMapLoaded, filteredTrips, analyzedCorridors, showHeatmap, showCorridors]);

  // 7. Update Charging Markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!showChargers) return;

    filteredChargers.forEach(ch => {
      const el = document.createElement('div');
      const isFast = (ch.power && parseInt(ch.power) >= 50) || ch.speed?.toLowerCase().includes('rápida');

      el.className = `group relative cursor-pointer flex items-center justify-center transition-transform hover:scale-125 z-10`;
      el.innerHTML = `
        <div class="w-4 h-4 rounded-full ${isFast ? 'bg-amber-400 border-2 border-white shadow-[0_0_12px_rgba(251,191,36,0.9)]' : 'bg-emerald-400 border-2 border-white shadow-[0_0_10px_rgba(52,211,153,0.8)]'}"></div>
      `;

      const popupContent = `
        <div style="color: #fff; background: #0f0f13; border: 1px solid #27272a; border-radius: 12px; padding: 12px; font-family: sans-serif; font-size: 12px; max-width: 220px;">
          <div style="font-weight: bold; font-size: 13px; color: #fff; margin-bottom: 4px;">${ch.name}</div>
          <div style="color: #10b981; font-weight: bold; margin-bottom: 4px;">⚡ Potencia: ${ch.power} (${ch.speed})</div>
          <div style="color: #a1a1aa; font-size: 11px; margin-bottom: 4px;">📍 ${ch.province}</div>
          <div style="color: #38bdf8; font-size: 11px; font-weight: 600;">🔌 Conectores: ${ch.connectors.join(', ')}</div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(popupContent);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([ch.lng, ch.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [isMapLoaded, filteredChargers, showChargers]);

  // Counts for summary
  const criticalCount = analyzedCorridors.filter(c => c.severity === 'Crítico').length;
  const moderateCount = analyzedCorridors.filter(c => c.severity === 'Moderado').length;

  return (
    <div className="bg-[#0f0f13] border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
      
      {/* ── TOP CONTROLS & FILTER BAR ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1.5">
              <Flame size={12} /> Análisis de Déficit de Infraestructura
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            Mapa de Calor y Demanda Insatisfecha
          </h2>
          <p className="text-xs text-neutral-400">
            Detección de trayectos de alta frecuencia con escasez de cargadores compatibles.
          </p>
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Brand Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
            <Car size={14} className="text-emerald-400 shrink-0" />
            <span className="text-neutral-400">Marca:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {availableBrands.map(b => (
                <option key={b} value={b} className="bg-neutral-900 text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Connector Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
            <Zap size={14} className="text-amber-400 shrink-0" />
            <span className="text-neutral-400">Conector:</span>
            <select
              value={selectedConnector}
              onChange={(e) => setSelectedConnector(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {availableConnectors.map(c => (
                <option key={c} value={c} className="bg-neutral-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
            <Filter size={14} className="text-rose-400 shrink-0" />
            <span className="text-neutral-400">Déficit:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              <option value="Todos" className="bg-neutral-900 text-white">Todos los Corredores</option>
              <option value="Crítico" className="bg-neutral-900 text-rose-400">Solo Déficit Crítico 🔴</option>
              <option value="Moderado" className="bg-neutral-900 text-amber-400">Déficit Moderado 🟡</option>
            </select>
          </div>

        </div>
      </div>

      {/* ── KPI MINI-CARDS FOR THE FILTERS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-400 uppercase font-semibold">Viajes Analizados</div>
            <div className="text-lg font-black text-white">{filteredTrips.length}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-400 uppercase font-semibold">Cargadores Compatibles</div>
            <div className="text-lg font-black text-white">{filteredChargers.length}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap size={16} />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-rose-900/40 p-3 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-rose-400 uppercase font-bold">Déficit Crítico</div>
            <div className="text-lg font-black text-rose-400">{criticalCount} <span className="text-xs font-normal">tramos</span></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-amber-900/40 p-3 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-400 uppercase font-bold">Déficit Moderado</div>
            <div className="text-lg font-black text-amber-400">{moderateCount} <span className="text-xs font-normal">tramos</span></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame size={16} />
          </div>
        </div>
      </div>

      {/* ── MAP CONTAINER WITH FLOATING LAYER TOGGLES ────────────────────────── */}
      <div className="relative w-full h-[540px] rounded-3xl overflow-hidden border border-neutral-800 shadow-inner">
        <div ref={mapContainer} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="flex items-center gap-2 text-sm text-neutral-300 font-medium">
              <Loader2 className="animate-spin text-emerald-400" size={20} />
              Cargando coordenadas y red de cargadores...
            </div>
          </div>
        )}

        {/* Floating Layer Toggles (Top-Left) */}
        <div className="absolute top-4 left-4 bg-neutral-950/85 backdrop-blur-md border border-neutral-800 rounded-2xl p-3.5 z-20 flex flex-col gap-2.5 shadow-xl text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-1 flex items-center gap-1.5">
            <Layers size={13} /> Capas de Visualización
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="accent-emerald-500 cursor-pointer rounded"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-rose-500 inline-block" />
              Mapa de Calor (Densidad)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={showCorridors}
              onChange={(e) => setShowCorridors(e.target.checked)}
              className="accent-emerald-500 cursor-pointer rounded"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-rose-500 inline-block rounded" />
              Corredores de Déficit
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={showChargers}
              onChange={(e) => setShowChargers(e.target.checked)}
              className="accent-emerald-500 cursor-pointer rounded"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white inline-block" />
              Puntos de Carga ({filteredChargers.length})
            </span>
          </label>
        </div>

        {/* Heatmap Legend (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 bg-neutral-950/85 backdrop-blur-md border border-neutral-800 rounded-xl px-3 py-2 z-20 flex items-center gap-2 text-[10px] text-neutral-300">
          <span className="text-neutral-500 font-semibold">Densidad:</span>
          <span>Baja</span>
          <div className="w-20 h-2 rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 via-amber-500 to-rose-500" />
          <span className="font-bold text-rose-400">Muy Alta</span>
        </div>
      </div>

      {/* ── DEFICIT RANKING & STRATEGIC RECOMMENDATIONS TABLE ───────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-400" />
            <h3 className="font-bold text-base text-white">
              Tramos con Mayor Déficit de Carga ({analyzedCorridors.length} identificados)
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            Filtro activo: {selectedBrand} · Conector: {selectedConnector}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-900/60 uppercase tracking-wider text-[10px] text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Corredor / Tramo</th>
                <th className="py-2.5 px-3 font-semibold text-center">Viajes</th>
                <th className="py-2.5 px-3 font-semibold text-center">Cargadores Compatibles</th>
                <th className="py-2.5 px-3 font-semibold text-center">Nivel de Déficit</th>
                <th className="py-2.5 px-3 font-semibold">Acción Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {analyzedCorridors.slice(0, 8).map((corridor, i) => (
                <tr key={i} className="hover:bg-neutral-900/40 transition">
                  <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      corridor.severity === 'Crítico' ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : corridor.severity === 'Moderado' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="truncate max-w-xs md:max-w-sm">{corridor.name}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-white">
                    {corridor.tripsCount}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`font-bold ${corridor.compatibleChargersCount === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {corridor.compatibleChargersCount} {corridor.compatibleChargersCount === 1 ? 'punto' : 'puntos'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      corridor.severity === 'Crítico'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : corridor.severity === 'Moderado'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {corridor.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-neutral-300 font-medium">
                    {corridor.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
