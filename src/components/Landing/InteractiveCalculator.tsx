'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Menu, Car, MapPin, Settings, SlidersHorizontal, BatteryCharging,
  DollarSign, Fuel, Tag, ChevronDown, ArrowRightLeft,
  Zap, Route, BatteryFull, AlertTriangle, Loader2, Leaf,
  Navigation, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ECUADOR_GEO } from '@/data/ecuador-geo';
import { ChargeWayShowcase } from './ChargeWayShowcase';
import { CANTON_COORDS, PROV_CAPITAL_COORDS, TARIFA_KWH, CO2_PER_GALON_KG, CO2_PER_KWH_KG, routeDistanceKm } from '@/data/ev-calculator';
import vehiclesData from '@/lib/vehicles.json';

import { calculateSegmentConsumption, VehicleSpecs, EnvironmentFactors } from '@/lib/energy-core';

interface InteractiveCalculatorProps {
  onGoToApp: () => void;
}

const ELEVATION_PROFILE_DATA = [
  { km: 0, alt: 2850 },
  { km: 30, alt: 3100 },
  { km: 70, alt: 2200 },
  { km: 120, alt: 1400 },
  { km: 180, alt: 450 },
  { km: 240, alt: 120 },
  { km: 290, alt: 4 },
];

/* ─── Selector Jerárquico de Geolocalización ─── */
function GeoSelector({
  label, icon, provCode, cantonCode, onProvChange, onCantonChange,
}: {
  label: string; icon: string; provCode: string; cantonCode: string;
  onProvChange: (v: string) => void; onCantonChange: (v: string) => void;
}) {
  const cantones = useMemo(
    () => ECUADOR_GEO.find((p) => p.code === provCode)?.cantones ?? [],
    [provCode]
  );
  return (
    <div className="bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl px-4 py-3 flex flex-col gap-2 transition-colors">
      <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-widest flex items-center gap-1">
        <span>{icon}</span> {label}
      </span>
      <div className="relative">
        <select
          value={provCode}
          onChange={(e) => { onProvChange(e.target.value); onCantonChange(''); }}
          className="w-full bg-transparent text-sm font-bold text-white focus:outline-none appearance-none pr-6 cursor-pointer"
        >
          <option value="" className="bg-[#080E18]">— Provincia —</option>
          {ECUADOR_GEO.map((p) => (
            <option key={p.code} value={p.code} className="bg-[#080E18]">{p.name}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
      </div>
      <div className="relative">
        <select
          value={cantonCode}
          onChange={(e) => onCantonChange(e.target.value)}
          disabled={!provCode}
          className="w-full bg-transparent text-xs font-medium text-neutral-300 focus:outline-none appearance-none pr-6 cursor-pointer disabled:opacity-40"
        >
          <option value="" className="bg-[#080E18]">— Cantón —</option>
          {cantones.map((c) => (
            <option key={c.code} value={c.code} className="bg-[#080E18]">{c.name}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
      </div>
    </div>
  );
}

/* ─── Propuesta 1: Cyber Cockpit Dashboard ─── */
export const InteractiveCalculator: React.FC<InteractiveCalculatorProps> = ({ onGoToApp }) => {
  const [mobileTab, setMobileTab] = useState<'calc' | 'profile'>('calc');
  const [activeDockTab, setActiveDockTab] = useState<number>(0);

  // Origen / Destino
  const [origenProv, setOrigenProv] = useState('PI');
  const [origenCanton, setOrigenCanton] = useState('PI01');
  const [destinoProv, setDestinoProv] = useState('GU');
  const [destinoCanton, setDestinoCanton] = useState('GU01');

  // Selección de Marca y Modelo EV (desde vehicles.json)
  const brands = useMemo(() => {
    return Array.from(new Set(vehiclesData.map(v => v.brand))).sort();
  }, []);

  const [selectedBrand, setSelectedBrand] = useState<string>('BYD');
  
  const modelsForBrand = useMemo(() => {
    return vehiclesData.filter(v => v.brand === selectedBrand);
  }, [selectedBrand]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('byd-atto3');

  const activeVehicle = useMemo(() => {
    return vehiclesData.find(v => v.id === selectedVehicleId) ?? vehiclesData[0];
  }, [selectedVehicleId]);

  // Combustible — default plataforma Ecuador (6 gal/100km, $3.60/gal)
  const [galones, setGalones] = useState<number>(6);
  const [precioPorGalon, setPrecioPorGalon] = useState<number>(3.6);

  // Distancia real inicial Quito -> Guayaquil (414 km)
  const [distanciaKm, setDistanciaKm] = useState<number>(() => 
    routeDistanceKm('PI', 'PI01', 'GU', 'GU01') || 414
  );
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  // Obtiene distancia real via Mapbox Directions API
  useEffect(() => {
    const getCoords = (prov: string, canton: string): [number, number] | null => {
      return CANTON_COORDS[canton] ?? PROV_CAPITAL_COORDS[prov] ?? null;
    };

    const originCoords  = getCoords(origenProv, origenCanton);
    const destCoords    = getCoords(destinoProv, destinoCanton);
    if (!originCoords || !destCoords) return;
    if (originCoords[0] === destCoords[0] && originCoords[1] === destCoords[1]) {
      setDistanciaKm(0); return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingRoute(true);
    const [olat, olng] = originCoords;
    const [dlat, dlng] = destCoords;

    fetch(`/api/route-distance?olng=${olng}&olat=${olat}&dlng=${dlng}&dlat=${dlat}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json().catch(() => null);
      })
      .then(data => {
        if (data?.distanceKm) setDistanciaKm(data.distanceKm);
        setLoadingRoute(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setLoadingRoute(false);
      });

    return () => controller.abort();
  }, [origenProv, origenCanton, destinoProv, destinoCanton]);

  const physicsSpec: VehicleSpecs = useMemo(() => ({
    usable_battery_kwh: activeVehicle.specs.usable_battery_kwh,
    drag_coefficient: activeVehicle.specs.drag_coefficient,
    frontal_area_m2: activeVehicle.specs.frontal_area_m2,
    weight_kg: activeVehicle.specs.weight_kg,
    peak_charging_kw: activeVehicle.specs.peak_charging_kw,
  }), [activeVehicle]);

  const wltpRangeKm = activeVehicle.specs.wltp_range_km || activeVehicle.specs.commercial_range_km || 400;

  // ⚡ METODOLOGÍA FÍSICA REAL (Igual a /app energy-core.ts):
  // Segmentos topográficos, densidad de aire por altitud, resistencia aerodinámica y freno regenerativo
  const kwhTotal = useMemo(() => {
    if (distanciaKm <= 0) return 0;
    
    // Perfil topográfico dinámico (Quito 2850m -> Guayaquil 4m)
    const profile = [
      { kmRatio: 0.00, alt: 2850 },
      { kmRatio: 0.07, alt: 3100 },
      { kmRatio: 0.17, alt: 2200 },
      { kmRatio: 0.29, alt: 1400 },
      { kmRatio: 0.43, alt: 450 },
      { kmRatio: 0.58, alt: 120 },
      { kmRatio: 0.70, alt: 4 },
      { kmRatio: 1.00, alt: 4 },
    ];

    const env: EnvironmentFactors = {
      wind_speed_ms: 2.0,
      wind_direction_deg: 0,
      ambient_temp_c: 21,
      road_condition: 'dry',
    };

    let totalWh = 0;
    for (let i = 0; i < profile.length - 1; i++) {
      const p1 = profile[i];
      const p2 = profile[i + 1];
      const segDistM = (p2.kmRatio - p1.kmRatio) * distanciaKm * 1000;
      if (segDistM <= 0) continue;

      const elevGainM = p2.alt - p1.alt;
      const segAltM = (p1.alt + p2.alt) / 2;
      const speedMs = 20.8; // ~75 km/h promedio

      const segWh = calculateSegmentConsumption(physicsSpec, env, {
        distance_m: segDistM,
        elevation_gain_m: elevGainM,
        speed_ms: speedMs,
        altitude_m: segAltM,
      } as any);

      totalWh += segWh;
    }

    // Floor a nivel WLTP mínimo por seguridad de batería
    const wltpMinWh = (physicsSpec.usable_battery_kwh * 1000 / wltpRangeKm) * distanciaKm * 0.85;
    const finalWh = Math.max(totalWh, wltpMinWh);
    return Number((finalWh / 1000).toFixed(1));
  }, [distanciaKm, physicsSpec, wltpRangeKm]);

  const costoEV = kwhTotal * TARIFA_KWH;

  const costoCombustionTotal = (distanciaKm / 100) * galones * precioPorGalon;
  const ahorro    = Math.max(0, costoCombustionTotal - costoEV);
  const pctAhorro = costoCombustionTotal > 0 ? Math.round((ahorro / costoCombustionTotal) * 100) : 0;

  const co2GasolinaKg = (distanciaKm / 100) * galones * CO2_PER_GALON_KG;
  const co2EvKg       = kwhTotal * CO2_PER_KWH_KG;
  const co2AhorroKg   = Math.max(0, co2GasolinaKg - co2EvKg);

  const paradasCarga  = distanciaKm > wltpRangeKm
    ? Math.ceil(distanciaKm / wltpRangeKm) - 1
    : 0;
  const llegaSinParar = distanciaKm <= wltpRangeKm;

  const origenNombre = useMemo(() => {
    const prov = ECUADOR_GEO.find((p) => p.code === origenProv);
    const canton = prov?.cantones.find((c) => c.code === origenCanton);
    return canton ? `${canton.name}` : prov?.name ?? '—';
  }, [origenProv, origenCanton]);

  const destinoNombre = useMemo(() => {
    const prov = ECUADOR_GEO.find((p) => p.code === destinoProv);
    const canton = prov?.cantones.find((c) => c.code === destinoCanton);
    return canton ? `${canton.name}` : prov?.name ?? '—';
  }, [destinoProv, destinoCanton]);

  const swapRuta = () => {
    const [tp, tc] = [origenProv, origenCanton];
    setOrigenProv(destinoProv); setOrigenCanton(destinoCanton);
    setDestinoProv(tp); setDestinoCanton(tc);
  };

  return (
    <section id="calculadora" className="py-6 w-full relative">
      <div className="w-full space-y-6">

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden bg-[#091512] border border-[#1A3028] p-1 rounded-2xl">
          <button
            onClick={() => setMobileTab('calc')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
              mobileTab === 'calc'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            📊 Calculadora & Parámetros
          </button>
          <button
            onClick={() => setMobileTab('profile')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
              mobileTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            ⚡ Plataforma ChargeWay AI
          </button>
        </div>

        {/* Main 2-Column Split Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full">
          {/* Left panel content... */}


          {/* ══ LEFT PANEL: HUD CONTROL & ECONOMIC EFFICIENCY (Matching Image 1) ══ */}
          <div
            className={`${mobileTab === 'calc' ? 'flex' : 'hidden lg:flex'} relative overflow-hidden bg-[#061610]/95 backdrop-blur-2xl border border-[#00FF87]/40 rounded-3xl flex-col gap-5 shadow-[0_0_30px_rgba(0,255,135,0.15)] justify-between`}
            style={{ padding: '28px' }}
          >

            {/* Background Watermark */}
            <div className="absolute right-3 top-3 opacity-[0.05] pointer-events-none text-emerald-400">
              <DollarSign size={160} strokeWidth={1} />
            </div>

            {/* Route Parameters Box */}
            <div
              className="relative z-10 bg-[#080E18]/60 border border-[#1A3028] rounded-2xl space-y-4"
              style={{ padding: '24px', paddingLeft: '36px' }}
            >
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest block" style={{ paddingLeft: '12px' }}>
                Selecciona tu origen y destino de viaje
              </span>

              {/* Origen / Destino */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <GeoSelector label="Origen" icon="📍"
                  provCode={origenProv} cantonCode={origenCanton}
                  onProvChange={setOrigenProv} onCantonChange={setOrigenCanton} />
                <button onClick={swapRuta} title="Intercambiar"
                  className="w-8 h-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-all hover:scale-110 cursor-pointer shrink-0">
                  <ArrowRightLeft size={14} />
                </button>
                <GeoSelector label="Destino" icon="🏁"
                  provCode={destinoProv} cantonCode={destinoCanton}
                  onProvChange={setDestinoProv} onCantonChange={setDestinoCanton} />
              </div>

              {/* Selección de Marca y Modelo EV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Marca EV */}
                <div className="bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl px-4 py-2.5 transition-colors">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-widest block mb-1">🏷️ Marca EV</span>
                  <div className="relative">
                    <select value={selectedBrand}
                      className="w-full bg-transparent text-xs font-bold text-white focus:outline-none appearance-none pr-6 cursor-pointer"
                      onChange={(e) => {
                        const newBrand = e.target.value;
                        setSelectedBrand(newBrand);
                        const firstModel = vehiclesData.find(v => v.brand === newBrand);
                        if (firstModel) setSelectedVehicleId(firstModel.id);
                      }}>
                      {brands.map((b) => (
                        <option key={b} value={b} className="bg-[#080E18]">{b}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                </div>

                {/* Modelo EV */}
                <div className="bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl px-4 py-2.5 transition-colors">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-widest block mb-1">🚗 Modelo EV</span>
                  <div className="relative">
                    <select value={selectedVehicleId}
                      className="w-full bg-transparent text-xs font-bold text-white focus:outline-none appearance-none pr-6 cursor-pointer"
                      onChange={(e) => setSelectedVehicleId(e.target.value)}>
                      {modelsForBrand.map((m) => (
                        <option key={m.id} value={m.id} className="bg-[#080E18]">{m.model}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                </div>

              </div>

              {/* Especificaciones del Modelo Seleccionado */}
              <div className="flex flex-wrap items-center justify-between text-[9px] font-mono text-neutral-400 bg-[#06100C] border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <span>Batería: <strong className="text-white">{activeVehicle.specs.usable_battery_kwh} kWh</strong></span>
                <span>Autonomía WLTP: <strong className="text-emerald-400">{wltpRangeKm} km</strong></span>
                <span>Carga Máx: <strong className="text-white">{activeVehicle.specs.peak_charging_kw} kW</strong></span>
              </div>

              {/* Fuel Consumption & Price */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest block">
                  Ingresa la información de consumo de tu actual vehículo de combustión
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl px-4 py-2.5 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Fuel size={11} className="text-emerald-400" />
                      <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">Consumo/100km</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={galones}
                        onChange={(e) => setGalones(Math.max(0.1, parseFloat(e.target.value) || 0))}
                        min={0.1} max={30} step={0.5}
                        className="bg-transparent text-sm font-black text-white focus:outline-none w-full font-mono" />
                      <span className="text-[10px] text-neutral-500 shrink-0 font-mono">gal</span>
                    </div>
                  </div>
                  <div className="bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl px-4 py-2.5 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag size={11} className="text-emerald-400" />
                      <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">Precio galón</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400 font-mono font-bold text-sm shrink-0">$</span>
                      <input type="number" value={precioPorGalon}
                        onChange={(e) => setPrecioPorGalon(Math.max(0.01, parseFloat(e.target.value) || 0))}
                        min={0.01} step={0.10}
                        className="bg-transparent text-sm font-black text-white focus:outline-none w-full font-mono" />
                      <span className="text-[10px] text-neutral-500 shrink-0 font-mono">/gal</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Real Route Metrics (Distancia Real | Consumo EV | Consumo Combustible) */}
            <div className="relative z-10 space-y-3">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Distance */}
                <div className="bg-[#080E18]/80 border border-[#1A3028] rounded-2xl px-3.5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Route size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">Distancia Real</span>
                    {loadingRoute ? (
                      <span className="flex items-center gap-1.5 text-neutral-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs font-mono">calculando…</span>
                      </span>
                    ) : (
                      <span className="text-base font-black text-white font-mono">
                        {distanciaKm > 0 ? `${distanciaKm.toLocaleString()} km` : '—'}
                      </span>
                    )}
                  </div>
                </div>

                {/* EV Consumption */}
                <div className="bg-[#080E18]/80 border border-[#1A3028] rounded-2xl px-3.5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">Consumo EV</span>
                    <span className="text-base font-black text-white font-mono">{kwhTotal.toFixed(1)} kWh</span>
                    <span className="text-[9px] font-mono text-emerald-400 block">${costoEV.toFixed(2)} a $0.10/kWh</span>
                  </div>
                </div>

                {/* Fuel Consumption in Gallons */}
                <div className="bg-[#080E18]/80 border border-[#1A3028] rounded-2xl px-3.5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <Fuel size={14} className="text-rose-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">Consumo Gasolina</span>
                    <span className="text-base font-black text-white font-mono">{((distanciaKm / 100) * galones).toFixed(1)} gal</span>
                    <span className="text-[9px] font-mono text-rose-400 block">${costoCombustionTotal.toFixed(2)} a ${precioPorGalon}/gal</span>
                  </div>
                </div>
              </div>

              {/* Stop status */}
              <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 border ${
                llegaSinParar
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-amber-500/5 border-amber-500/40'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  llegaSinParar ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                }`}>
                  {llegaSinParar
                    ? <BatteryFull size={14} className="text-emerald-400" />
                    : <AlertTriangle size={14} className="text-amber-400" />
                  }
                </div>
                <div className="flex-1">
                  {llegaSinParar ? (
                    <>
                      <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold block">✓ Ruta sin paradas</span>
                      <span className="text-xs text-neutral-300">
                        Autonomía suficiente ({wltpRangeKm} km). Llegas con {wltpRangeKm - distanciaKm} km de reserva.
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-mono text-amber-400 uppercase font-bold block">
                        ⚡ {paradasCarga} parada{paradasCarga > 1 ? 's' : ''} de carga requerida{paradasCarga > 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-neutral-300">
                        Distancia ({distanciaKm} km) supera autonomía ({wltpRangeKm} km). La app te indica los puntos de recarga en ruta.
                      </span>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Telemetría de Eficiencia Económica (Calcula tu ahorro al pasar a un EV) */}
            <div className="relative z-10 space-y-2.5">
              <span className="text-sm font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Calcula tu ahorro al pasar a un EV.
              </span>

              {/* Grid Desglose: Costo Combustible | Costo Carga EV (domicilio) | Ahorro Estimado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono pt-1">
                <div className="bg-[#080E18] border border-[#1A3028] hover:border-rose-500/30 rounded-xl p-3 transition-colors">
                  <span className="text-[11px] font-bold text-neutral-400 block mb-1 uppercase tracking-tight">COSTO COMBUSTIBLE</span>
                  <span className="text-base sm:text-lg font-black text-rose-400 block leading-tight">${costoCombustionTotal.toFixed(2)}</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">{((distanciaKm / 100) * galones).toFixed(1)} gal @ ${precioPorGalon}</span>
                </div>
                <div className="bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/30 rounded-xl p-3 transition-colors">
                  <span className="text-[11px] font-bold text-neutral-400 block mb-1 uppercase tracking-tight">CARGA EV (DOMICILIO)</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 block leading-tight">${costoEV.toFixed(2)}</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">{kwhTotal.toFixed(1)} kWh @ $0.10</span>
                </div>
                <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-emerald-300 block mb-1 uppercase tracking-tight">AHORRO ESTIMADO</span>
                  <span className="text-base sm:text-lg font-black text-emerald-300 block leading-tight">+${ahorro.toFixed(2)}</span>
                  <span className="text-[10px] text-emerald-400 block font-bold mt-0.5">{pctAhorro}% ahorro neto</span>
                </div>
              </div>
            </div>

          </div>

          {/* ══ RIGHT PANEL: PLATAFORMA CHARGEWAY AI & BENEFICIOS ══ */}
          <div className={`${mobileTab === 'profile' ? 'flex' : 'hidden lg:flex'} flex-col justify-between`}>
            <ChargeWayShowcase onGoToApp={onGoToApp} />
          </div>

        </div>

      </div>
    </section>
  );
};
