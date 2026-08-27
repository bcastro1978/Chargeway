'use client';

import React, { useState } from 'react';
import { Navigation, Battery, MapPin, ArrowRight, CheckCircle, RefreshCw, Car } from 'lucide-react';

interface RouteOption {
  id: string;
  name: string;
  distance: string;
  elevationDiff: string;
  stopsCount: number;
  stops: { name: string; power: string; time: string; batteryAdded: string }[];
}

const PRESET_ROUTES: RouteOption[] = [
  {
    id: 'quito-guayaquil',
    name: 'Quito ➔ Guayaquil (Vía Santo Domingo)',
    distance: '420 km',
    elevationDiff: '-2,800m (Descenso a Costa)',
    stopsCount: 1,
    stops: [
      { name: 'Electrolinera Santo Domingo DC', power: '60 kW DC', time: '22 min', batteryAdded: '+45%' }
    ]
  },
  {
    id: 'quito-cuenca',
    name: 'Quito ➔ Cuenca (Vía Panamericana)',
    distance: '440 km',
    elevationDiff: '±1,200m (Alta Montaña Andina)',
    stopsCount: 2,
    stops: [
      { name: 'Estación Latacunga Centro DC', power: '50 kW DC', time: '18 min', batteryAdded: '+35%' },
      { name: 'EcoCarga Riobamba Sur DC', power: '60 kW DC', time: '20 min', batteryAdded: '+40%' }
    ]
  },
  {
    id: 'guayaquil-manta',
    name: 'Guayaquil ➔ Manta (Ruta del Spondylus)',
    distance: '190 km',
    elevationDiff: 'Plano (Costa Pacífico)',
    stopsCount: 0,
    stops: []
  }
];

const PRESET_VEHICLES = [
  { name: 'BYD Yuan Plus EV', battery: '60.4 kWh' },
  { name: 'Chevrolet Bolt EV', battery: '66.0 kWh' },
  { name: 'Kia EV6 GT-Line', battery: '77.4 kWh' },
  { name: 'Nissan Leaf', battery: '40.0 kWh' }
];

interface LivePlannerWidgetProps {
  onGoToApp: () => void;
}

export const LivePlannerWidget: React.FC<LivePlannerWidgetProps> = ({ onGoToApp }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('quito-guayaquil');
  const [selectedVehicle, setSelectedVehicle] = useState(PRESET_VEHICLES[0].name);
  const [initialSoc, setInitialSoc] = useState<number>(90);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const activeRoute = PRESET_ROUTES.find((r) => r.id === selectedRouteId) || PRESET_ROUTES[0];

  const handleRecalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
    }, 350);
  };

  return (
    <section id="simulador" className="py-20 lg:py-28 bg-[#0c0e12] relative border-t border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-emerald-400 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-block mb-3">
            Prueba Interactiva en Vivo
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Simula tu viaje interprovincial
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base">
            Selecciona una ruta habitual en Ecuador y tu modelo de auto eléctrico para ver el plan sugerido de carga.
          </p>
        </div>

        {/* Simulator Container */}
        <div className="max-w-4xl mx-auto bg-[#171a1f] border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-xl">
          
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-400" />
                <span>Ruta en Ecuador</span>
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => { setSelectedRouteId(e.target.value); handleRecalculate(); }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {PRESET_ROUTES.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Car size={14} className="text-emerald-400" />
                <span>Modelo EV</span>
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => { setSelectedVehicle(e.target.value); handleRecalculate(); }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {PRESET_VEHICLES.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.battery})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Battery size={14} className="text-emerald-400" />
                  <span>Batería Inicial</span>
                </label>
                <span className="text-xs font-extrabold text-emerald-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  {initialSoc}%
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={initialSoc}
                onChange={(e) => { setInitialSoc(Number(e.target.value)); handleRecalculate(); }}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

          </div>

          {/* Results Box */}
          <div className="bg-neutral-950/80 border border-neutral-800/90 rounded-2xl p-6 relative">
            {isCalculating && (
              <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Calculando itinerario...</span>
                </div>
              </div>
            )}

            {/* Trip Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-neutral-800/80 mb-6 text-left">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Distancia Total</span>
                <span className="text-base font-extrabold text-white">{activeRoute.distance}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Topografía</span>
                <span className="text-xs font-bold text-emerald-400 truncate block">{activeRoute.elevationDiff}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Paradas</span>
                <span className="text-base font-extrabold text-amber-400">
                  {activeRoute.stopsCount === 0 ? '0 Paradas' : `${activeRoute.stopsCount} Parada(s)`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Llegada Estimada</span>
                <span className="text-base font-extrabold text-emerald-400">~24% SoC</span>
              </div>
            </div>

            {/* Itinerary */}
            <div className="space-y-3 mb-6">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wide block">
                Itinerario Sugerido de Carga
              </span>

              {activeRoute.stops.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>¡Viaje directo! Tu vehículo {selectedVehicle} cuenta con suficiente autonomía para realizar esta ruta sin detenerse.</span>
                </div>
              ) : (
                activeRoute.stops.map((stop, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{stop.name}</span>
                        <span className="text-[10px] text-neutral-500">{stop.power} • Carga rápida</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-400 block">{stop.time}</span>
                      <span className="text-[10px] text-neutral-400">{stop.batteryAdded} recargado</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800">
              <span className="text-xs text-neutral-400 text-center sm:text-left">
                ¿Quieres personalizar la ruta con tus propias paradas?
              </span>

              <button
                onClick={onGoToApp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Navigation size={14} />
                <span>Abrir Planificador Completo</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
