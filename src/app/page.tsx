'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { RouteDistanceCard } from '@/components/Dashboard/RouteDistanceCard';
import { RouteMap } from '@/components/Map/RouteMap';
import { ElevationProfile } from '@/components/Dashboard/ElevationProfile';
import { ChargerCard } from '@/components/Dashboard/ChargerCard';
import { VehicleSelector } from '@/components/Dashboard/VehicleSelector';
import { RouteSearch, Waypoint } from '@/components/Dashboard/RouteSearch';
import { AuthButton } from '@/components/Dashboard/AuthButton';
import { ConsentModal, ExpandableDoc, TERMS_TEXT, PRIVACY_TEXT } from '@/components/Dashboard/ConsentModal';
import { PwaInstallButton } from '@/components/Dashboard/PwaInstallButton';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAllEcuadorChargers, Charger } from '@/lib/services/charging';
import { useTripStore } from '@/lib/store/useTripStore';

const EV_FACTS = [
  {
    icon: '🔋',
    title: 'Frenado Regenerativo',
    description: 'Las pendientes de Ecuador permiten recuperar hasta un 15% de autonomía al descender usando el motor como generador.'
  },
  {
    icon: '⛰️',
    title: 'Efecto de la Altitud',
    description: 'La densidad del aire disminuye con la altitud, reduciendo la fricción aerodinámica y mejorando la eficiencia en la sierra.'
  },
  {
    icon: '🔌',
    title: 'Velocidad de Carga',
    description: 'La carga DC (Rápida) protege la vida útil de la celda al regular automáticamente la potencia a partir del 80% de SoC.'
  },
  {
    icon: '🌡️',
    title: 'Temperatura y Vida Útil',
    description: 'Mantener la batería entre el 20% y 80% de carga minimiza el estrés térmico y maximiza los ciclos de vida útil.'
  },
  {
    icon: '⚡',
    title: 'Torque Instantáneo',
    description: 'Los motores eléctricos entregan todo su torque desde 0 RPM, brindando una aceleración inmediata y eficiente en subidas empinadas.'
  }
];

export default function Home() {
  const {
    selectedVehicle,
    setSelectedVehicle,
    soc,
    setSoc,
    routePoints,
    setRoutePoints,
    tripPlan,
    isLoadingPlan,
    isNavigating,
    setIsNavigating,
    isSimulating,
    setIsSimulating,
    mapFlyTo,
    setMapFlyTo,
    planRoute,
    checkSession,
    saveTripToDatabase,
    filterCompatibleChargers,
    user,
    isLoadingUser,
    loginWithGoogle,
    needsConsent,
    saveConsent,
  } = useTripStore();

  const [allChargers, setAllChargers] = useState<Charger[]>([]);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFactIndex((prevIndex) => (prevIndex + 1) % EV_FACTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevFact = () => {
    setCurrentFactIndex((prev) => (prev - 1 + EV_FACTS.length) % EV_FACTS.length);
  };

  const handleNextFact = () => {
    setCurrentFactIndex((prev) => (prev + 1) % EV_FACTS.length);
  };

  useEffect(() => {
    fetchAllEcuadorChargers().then(setAllChargers).catch(console.error);
    checkSession();
  }, []);

  // Debounce planRoute so it doesn't fire on every keystroke.
  // Wait 800ms after the last change before calculating the route.
  useEffect(() => {
    const timer = setTimeout(() => {
      planRoute();
    }, 800);
    return () => clearTimeout(timer);
  }, [selectedVehicle, routePoints]); // intentionally omit planRoute (stable store fn)

  const handleMapClick = (lng: number, lat: number) => {
    const { mapSelectionIndex, setMapSelectionIndex, routePoints: currentRoutePoints, setRoutePoints: storeSetRoutePoints } = useTripStore.getState();
    const newRoute = [...currentRoutePoints];
    
    if (mapSelectionIndex !== null) {
      newRoute[mapSelectionIndex] = {
        ...newRoute[mapSelectionIndex],
        name: `Punto en el mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng
      };
      setMapSelectionIndex(null);
    } else {
      const newPoint: Waypoint = {
        id: `map-${Date.now()}`,
        name: `Punto en el mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng
      };
      
      // Find if there is any empty point (origin, destination or waypoint) to fill first
      const emptyIndex = newRoute.findIndex(p => !p.name.trim() || (p.lat === 0 && p.lng === 0));
      
      if (emptyIndex !== -1) {
        newRoute[emptyIndex] = {
          ...newRoute[emptyIndex],
          name: `Punto en el mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          lat,
          lng
        };
      } else {
        // If all are filled, add it as a new waypoint before destination
        if (newRoute.length < 7) {
          newRoute.splice(newRoute.length - 1, 0, newPoint);
        } else {
          alert('Máximo 5 paradas intermedias permitidas.');
        }
      }
    }
    
    storeSetRoutePoints(newRoute);
  };

  const handleRouteChange = (newPoints: Waypoint[]) => {
    setRoutePoints(newPoints);
    if (!tripPlan) {
      const firstValid = newPoints.find(p => p.lat !== 0 && p.lng !== 0);
      if (firstValid) setMapFlyTo({ lat: firstValid.lat, lng: firstValid.lng });
    }
  };

  const addSuggestedStop = (charger: Charger) => {
    const newPoint: Waypoint = {
      id: charger.id,
      name: charger.nombre || 'Punto de Carga',
      lat: charger.location.lat,
      lng: charger.location.lng
    };
    const newRoute = [...routePoints];
    newRoute.splice(newRoute.length - 1, 0, newPoint);
    setRoutePoints(newRoute);
  };

  const handleNavigateToCharger = (charger: Charger) => {
    if (tripPlan) {
      const newPoint: Waypoint = {
        id: charger.id,
        name: charger.nombre || 'Punto de Carga',
        lat: charger.location.lat,
        lng: charger.location.lng
      };
      const newRoute = [...routePoints];
      newRoute.splice(newRoute.length - 1, 0, newPoint);
      setRoutePoints(newRoute);
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      useTripStore.setState({ isLoadingPlan: true });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin: Waypoint = {
            id: 'current-loc',
            name: 'Mi ubicacion',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          const dest: Waypoint = {
            id: charger.id,
            name: charger.nombre || 'Punto de Carga',
            lat: charger.location.lat,
            lng: charger.location.lng
          };
          setRoutePoints([origin, dest]);
          setIsNavigating(true);
          setIsSimulating(false);
        },
        () => {
          useTripStore.setState({ isLoadingPlan: false });
          alert('No se pudo obtener tu ubicacion para iniciar la ruta.');
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      alert('Tu navegador no soporta geolocalizacion.');
    }
  };

  const mergedChargers = useMemo(() => {
    let merged = [...allChargers];
    (tripPlan?.chargers || []).forEach(ch => {
      if (!merged.some(c => c.id === ch.id)) merged.push(ch);
    });

    if (filterCompatibleChargers && selectedVehicle?.specs?.charger_type) {
      const vType = selectedVehicle.specs.charger_type.toLowerCase().replace(/[^a-z0-9]/g, '');
      merged = merged.filter(c => {
        if (!c.tipo_cargador) return true; // keep if unknown just in case
        const cType = c.tipo_cargador.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (vType === 'type2' || vType === 'tipo2') {
           return cType.includes('type2') || cType.includes('tipo2') || cType.includes('ac');
        }
        if (vType === 'ccs2' || vType === 'ccs1') {
           return cType.includes(vType) || cType.includes('ccs') || cType.includes('combo') || cType.includes('cs2') || cType.includes('cs1');
        }
        if (vType === 'gbt') {
           return cType.includes('gbt') || cType.includes('chino');
        }
        return cType.includes(vType);
      });
    }

    return merged;
  }, [allChargers, tripPlan?.chargers, filterCompatibleChargers, selectedVehicle]);

  // Compute which chargers are within 5 km of the active route geometry.
  // Only those get the orange "En ruta" highlight; the rest stay teal.
  const routeChargerIds = useMemo(() => {
    if (!tripPlan?.route?.geometry) return new Set<string>();
    let routeCoords: [number, number][] = [];
    try {
      const geom = JSON.parse(tripPlan.route.geometry);
      routeCoords = (geom.coordinates as number[][]).map(c => [c[0], c[1]] as [number, number]);
    } catch { return new Set<string>(); }

    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const NEAR_KM = 5;
    // Sample route coords every ~10 points for performance
    const sampled = routeCoords.filter((_, i) => i % 10 === 0);

    const ids = new Set<string>();
    mergedChargers.forEach(ch => {
      if (!ch.location) return;
      const close = sampled.some(([lng, lat]) =>
        haversineKm(ch.location!.lat, ch.location!.lng, lat, lng) <= NEAR_KM
      );
      if (close) ids.add(ch.id);
    });
    return ids;
  }, [tripPlan?.route?.geometry, mergedChargers]);

  const routeDistanceKm = tripPlan ? tripPlan.route.distance / 1000 : 0;
  const routeDurationMin = tripPlan ? tripPlan.route.duration / 60 : 0;
  const totalConsumptionKwh = tripPlan ? tripPlan.totalConsumptionWh / 1000 : 0;

  // Recalculate arrival stats live whenever SoC slider changes.
  // Uses fixed totalConsumptionWh from plan + current soc state.
  const liveStats = useMemo(() => {
    if (!tripPlan || !selectedVehicle) return null;
    const SAFETY_BUFFER = 0.20;
    const battery = selectedVehicle.specs.usable_battery_kwh;
    const wltpRange = (selectedVehicle.specs as any).wltp_range_km || 400;
    const avgRateWhKm = routeDistanceKm > 0
      ? tripPlan.totalConsumptionWh / routeDistanceKm
      : (battery * 1000) / wltpRange;

    const usableAtStart = battery * soc;
    const usableAtEnd = Math.max(0, usableAtStart - tripPlan.totalConsumptionWh / 1000);
    const arrivalSoc = usableAtEnd / battery;
    const arrivalRangeKm = Math.round((usableAtEnd * 1000) / avgRateWhKm);
    const safetyMarginKm = Math.round(((usableAtEnd - battery * SAFETY_BUFFER) * 1000) / avgRateWhKm);
    return { arrivalSoc, arrivalRangeKm, safetyMarginKm };
  }, [tripPlan, soc, selectedVehicle, routeDistanceKm]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center gap-4">
        <div className="relative">
          <img 
            src="/logo.png" 
            alt="ChargeWay Logo" 
            className="w-24 h-24 rounded-2xl object-cover border border-neutral-800 shadow-[0_0_50px_rgba(16,185,129,0.25)] animate-pulse"
          />
          <div className="absolute inset-0 rounded-2xl border border-emerald-500/20 animate-ping pointer-events-none" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-emerald-500" />
          <span className="text-sm text-neutral-400 font-semibold">Cargando aplicación...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-6 relative z-10 animate-fade-in">
          <div className="relative mb-2">
            <img 
              src="/logo.png" 
              alt="ChargeWay Logo" 
              className="w-32 h-32 rounded-3xl object-cover border border-neutral-800 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute -inset-1.5 rounded-[34px] border border-emerald-500/25 blur-sm opacity-50" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">ChargeWay</h1>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">Drive with Electric Tranquility</p>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-xs mx-auto">
              Planifica tus viajes eléctricos en Ecuador sin preocuparte por la autonomía ni la disponibilidad de carga.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-sm mx-auto mt-4 mb-2">
            <ExpandableDoc title="Leer Términos y Condiciones de Uso" content={TERMS_TEXT} />
            <ExpandableDoc title="Leer Política de Privacidad" content={PRIVACY_TEXT} />
          </div>

          <button
            onClick={loginWithGoogle}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-4 px-6 text-sm font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] cursor-pointer"
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#ffffff"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#ffffff"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#ffffff"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#ffffff"
              />
            </svg>
            <span>Iniciar con Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen relative">
      {/* Consent Modal – shown to logged-in users who haven't accepted current T&C version */}
      {user && needsConsent && (
        <ConsentModal onAccept={saveConsent} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 pt-4">
        {/* Left Sidebar */}
        <aside className="flex flex-col gap-6">
          <PwaInstallButton />
          <AuthButton />
          <VehicleSelector 
            selectedId={selectedVehicle?.id || ''} 
            onSelect={setSelectedVehicle} 
            soc={soc}
            onSocChange={setSoc}
            rangeKm={selectedVehicle ? Math.round(selectedVehicle.specs.wltp_range_km * soc) : 0}
          />

          <div className="relative z-[100]">
            <RouteSearch locations={routePoints} onChange={handleRouteChange} />
          </div>

          {/* Action Buttons */}
          {isLoadingPlan ? (
            <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-4 rounded-2xl flex justify-center">
              <span className="text-emerald-500 font-semibold text-sm animate-pulse">Calculando ruta...</span>
            </div>
          ) : tripPlan ? (
            <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-4 rounded-2xl flex flex-col gap-3">
              <button
                onClick={() => {
                  const nextNav = !isNavigating;
                  setIsNavigating(nextNav);
                  if (!nextNav) {
                    setIsSimulating(false);
                  } else {
                    saveTripToDatabase();
                  }
                }}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  isNavigating
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                }`}
              >
                <span>{isNavigating ? 'Detener Viaje' : 'Iniciar Viaje'}</span>
              </button>
              {isNavigating && (
                <>
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm bg-neutral-800 hover:bg-neutral-700 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <span>{isSimulating ? 'Pausar Simulacion' : 'Simular Viaje'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const validPoints = routePoints.filter(p => p.lat !== 0 && p.lng !== 0);
                      if (validPoints.length < 2) return;
                      const origin = validPoints[0];
                      const destination = validPoints[validPoints.length - 1];
                      const waypoints = validPoints.slice(1, validPoints.length - 1);
                      let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
                      if (waypoints.length > 0) {
                        url += `&waypoints=${waypoints.map(w => `${w.lat},${w.lng}`).join('|')}`;
                      }
                      window.open(url, '_blank');
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  >
                    <span>🗺️ Abrir en Google Maps</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl text-center">
              <span className="text-neutral-500 text-sm">Ingresa origen y destino para planificar</span>
            </div>
          )}

          {/* Suggested charging stop */}
          {tripPlan?.suggestedChargingStop && !isNavigating && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-amber-400 font-semibold text-sm">Parada de carga recomendada</p>
                  <p className="text-neutral-300 text-xs mt-0.5">Bateria insuficiente para llegar con margen de seguridad.</p>
                </div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-white font-semibold text-sm">{tripPlan.suggestedChargingStop.nombre}</p>
                <p className="text-neutral-400 text-xs mt-0.5">
                  {tripPlan.suggestedChargingStop.canton}, {tripPlan.suggestedChargingStop.provincia}
                  {' · '}{tripPlan.suggestedChargingStop.potencia}
                  {' · '}{tripPlan.suggestedChargingStop.velocidad}
                </p>
              </div>
              <button
                onClick={() => addSuggestedStop(tripPlan.suggestedChargingStop!)}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-black transition-colors"
              >
                + Añadir parada a la ruta
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-8">
            {/* Información sobre vehículos eléctricos */}
            <div className="h-44 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>INFORMACION SOBRE VEHICULOS ELECTRICOS</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevFact}
                    className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextFact}
                    className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative flex-1 flex flex-col justify-center min-h-0">
                <div
                  key={currentFactIndex}
                  className="animate-fade-in bg-neutral-950/40 rounded-xl p-3 border border-neutral-800/40 flex flex-col justify-center h-full"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-emerald-400 text-sm">{EV_FACTS[currentFactIndex].icon}</span>
                    <h4 className="text-[11px] font-bold text-neutral-200">{EV_FACTS[currentFactIndex].title}</h4>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    {EV_FACTS[currentFactIndex].description}
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-1.5 mt-2">
                {EV_FACTS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFactIndex(index)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      currentFactIndex === index ? 'bg-emerald-500 w-3' : 'bg-neutral-700 hover:bg-neutral-600'
                    }`}
                    aria-label={`Ir al hecho ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="h-[500px] overflow-hidden rounded-2xl border border-neutral-800 relative bg-neutral-900 shadow-2xl">
              {isNavigating && (
                <div className="absolute top-4 left-4 z-10 bg-neutral-950/80 backdrop-blur-md p-4 rounded-xl border border-emerald-500/50 flex flex-col gap-1 text-white pointer-events-none">
                  <span className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Modo Navegacion</span>
                  <span className="text-lg font-bold">{isSimulating ? 'Simulando viaje...' : 'Siguiendo ubicacion...'}</span>
                </div>
              )}
              {tripPlan && routeChargerIds.size > 0 && (
                <div className="absolute bottom-4 left-4 z-10 bg-neutral-950/80 backdrop-blur-md px-3 py-2 rounded-lg border border-neutral-700/50 flex items-center gap-4 text-[11px] text-neutral-300 pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
                    <span>En ruta</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
                    <span>Otros cargadores</span>
                  </div>
                </div>
              )}
              <RouteMap
                geometry={tripPlan?.route.geometry}
                chargers={mergedChargers}
                routeChargerIds={routeChargerIds}
                locations={routePoints}
                onMapClick={handleMapClick}
                onNavigateToCharger={handleNavigateToCharger}
                flyTo={mapFlyTo}
              />
            </div>

            {/* Stats below map */}
            {isLoadingPlan ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 h-48 bg-neutral-900/40 rounded-2xl border border-neutral-800 animate-pulse" />
                <div className="md:col-span-2 h-48 bg-neutral-900/40 rounded-2xl border border-neutral-800 animate-pulse" />
              </div>
            ) : tripPlan ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <RouteDistanceCard
                      distanceKm={routeDistanceKm}
                      durationMin={routeDurationMin}
                      totalConsumptionKwh={totalConsumptionKwh}
                      arrivalSoc={liveStats?.arrivalSoc ?? tripPlan.arrivalSoc}
                      arrivalRangeKm={liveStats?.arrivalRangeKm ?? tripPlan.arrivalRangeKm}
                      safetyMarginKm={liveStats?.safetyMarginKm ?? tripPlan.safetyMarginKm}
                      advisorFeedback={tripPlan.advisorFeedback}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <ElevationProfile 
                      data={tripPlan.elevation} 
                      totalDistanceKm={routeDistanceKm} 
                      segmentTips={tripPlan.advisorFeedback.segmentTips} 
                      hoveredSegment={hoveredSegment}
                    />
                  </div>
                </div>

                {/* Copilot EV Recommendations - Full Width */}
                {tripPlan.advisorFeedback.segmentTips && tripPlan.advisorFeedback.segmentTips.length > 0 && (
                  <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-5 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      <span>🤖 Recomendaciones del Copiloto EV</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tripPlan.advisorFeedback.segmentTips.map((tip, idx) => {
                        const borderCol =
                          tip.type === 'subida' ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' :
                          tip.type === 'bajada' ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' :
                          'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10';

                        const icon =
                          tip.type === 'subida' ? '⛰️' :
                          tip.type === 'bajada' ? '🔋' : '🛣️';

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-[11px] flex justify-between items-center gap-3 transition-all duration-200 cursor-default ${borderCol}`}
                            onMouseEnter={() => setHoveredSegment(idx)}
                            onMouseLeave={() => setHoveredSegment(null)}
                          >
                            <div className="min-w-0 flex-1 flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base leading-none">{icon}</span>
                                <span className="font-bold text-neutral-200">{tip.title}</span>
                                <span className="text-[9px] text-neutral-400 bg-neutral-800/60 px-1 py-0.2 rounded font-medium">
                                  {tip.startKm}-{tip.endKm} km
                                </span>
                              </div>
                              <p className="text-neutral-300 text-[10px] leading-tight line-clamp-2">{tip.advice}</p>
                            </div>
                            
                            {/* Visual Gauges */}
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Speed limit sign */}
                              <div className="flex flex-col items-center">
                                <div className="w-7 h-7 rounded-full border-2 border-red-600 bg-white flex items-center justify-center font-extrabold text-neutral-950 text-[10px] shadow-md tracking-tighter" title="Velocidad Recomendada">
                                  {tip.speedRecommendation}
                                </div>
                                <span className="text-[8px] text-neutral-500 font-semibold mt-0.5">km/h</span>
                              </div>

                              {/* Regen level indicator */}
                              <div className="flex flex-col items-center">
                                <div className="flex gap-0.5 items-end h-5 pb-0.5" title={`Regeneración: ${tip.regenLevel}`}>
                                  {[1, 2, 3, 4].map((barVal) => {
                                    const active =
                                      tip.regenLevel === 'Máximo' ? barVal <= 4 :
                                      tip.regenLevel === 'Alto' ? barVal <= 3 :
                                      tip.regenLevel === 'Medio' ? barVal <= 2 : barVal <= 1;
                                    
                                    const heightClass =
                                      barVal === 1 ? 'h-1.5' :
                                      barVal === 2 ? 'h-2.5' :
                                      barVal === 3 ? 'h-3.5' : 'h-4.5';

                                    return (
                                      <span
                                        key={barVal}
                                        className={`w-1 rounded-sm ${heightClass} transition-colors ${
                                          active ? 'bg-emerald-400' : 'bg-neutral-800'
                                        }`}
                                      />
                                    );
                                  })}
                                </div>
                                <span className="text-[8px] text-neutral-500 font-semibold">Regen</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-neutral-900/30 rounded-2xl border border-neutral-800 border-dashed">
                <p className="text-neutral-500 text-sm">Ingresa origen y destino para ver el analisis de ruta</p>
              </div>
            )}
          </section>

          {/* Chargers section */}
          <section className="mb-12">
            <h3 className="text-xl font-semibold mb-4 text-white">Cargadores en Ruta</h3>
            {isLoadingPlan ? (
              <div className="p-8 text-center text-neutral-400 bg-neutral-900/30 rounded-2xl border border-neutral-800 border-dashed animate-pulse">
                Analizando estaciones de carga en el trayecto...
              </div>
            ) : !tripPlan ? (
              <div className="p-8 text-center text-neutral-500 bg-neutral-900/30 rounded-2xl border border-neutral-800 border-dashed">
                Los cargadores en ruta apareceran una vez calculado el trayecto
              </div>
            ) : tripPlan.chargers.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 bg-neutral-900/30 rounded-2xl border border-neutral-800 border-dashed">
                No se encontraron cargadores en un radio de 30 km del trayecto
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tripPlan.chargers.slice(0, 8).map(charger => (
                  <ChargerCard key={charger.id} charger={charger} onNavigateToCharger={handleNavigateToCharger} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="mt-12 py-8 border-t border-neutral-800 text-center">
        <p className="text-neutral-500 text-sm">
          &copy; 2026 ChargeWay AI - Powered by SolAI Ecuador
        </p>
        <p className="text-neutral-400 text-xs mt-2">
          Contacto: <a href="mailto:chargewayec@gmail.com" className="text-emerald-500 hover:underline">chargewayec@gmail.com</a>
        </p>
      </footer>
    </main>
  );
}
