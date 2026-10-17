'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { RouteDistanceCard } from '@/components/Dashboard/RouteDistanceCard';
import { RouteMap } from '@/components/Map/RouteMap';
import { ElevationProfile } from '@/components/Dashboard/ElevationProfile';
import { ChargerCard } from '@/components/Dashboard/ChargerCard';
import { VehicleSelector } from '@/components/Dashboard/VehicleSelector';
import { RouteSearch, Waypoint } from '@/components/Dashboard/RouteSearch';
import { AuthButton } from '@/components/Dashboard/AuthButton';
import { ConsentModal, ExpandableDoc, TERMS_TEXT, PRIVACY_TEXT } from '@/components/Dashboard/ConsentModal';
import { PwaInstallButton } from '@/components/Dashboard/PwaInstallButton';
import { ProfileModal } from '@/components/Profile/ProfileModal';
import { TripSummaryModal, TripSummaryData } from '@/components/Dashboard/TripSummaryModal';
import { VoiceCopilotModal } from '@/components/Map/VoiceCopilotModal';
import { CopilotMessage } from '@/lib/services/copilot';
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sparkles, Mic, Play, Square, MapPin, Navigation, Zap, FastForward } from 'lucide-react';
import { fetchAllEcuadorChargers, Charger, isChargerBrandCompatible } from '@/lib/services/charging';
import { useTripStore } from '@/lib/store/useTripStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateSpeedConsumptionRate } from '@/lib/realtime-energy';
import { useWakeLock } from '@/hooks/useWakeLock';
import { SegmentTip } from '@/lib/agents/RouteAdvisorAgent';
import { orderRouteWithStops, isRoundTripRoute as isRoundTripRouteHelper } from '@/lib/services/route-helpers';
import { getDecodedRouteCoordinates, getRouteBoundingBox } from '@/lib/utils/route-geometry';

import { EvFactsCarousel } from '@/components/Dashboard/EvFactsCarousel';

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
  } = useTripStore(
    useShallow((state) => ({
      selectedVehicle: state.selectedVehicle,
      setSelectedVehicle: state.setSelectedVehicle,
      soc: state.soc,
      setSoc: state.setSoc,
      routePoints: state.routePoints,
      setRoutePoints: state.setRoutePoints,
      tripPlan: state.tripPlan,
      isLoadingPlan: state.isLoadingPlan,
      isNavigating: state.isNavigating,
      setIsNavigating: state.setIsNavigating,
      isSimulating: state.isSimulating,
      setIsSimulating: state.setIsSimulating,
      mapFlyTo: state.mapFlyTo,
      setMapFlyTo: state.setMapFlyTo,
      planRoute: state.planRoute,
      checkSession: state.checkSession,
      saveTripToDatabase: state.saveTripToDatabase,
      filterCompatibleChargers: state.filterCompatibleChargers,
      user: state.user,
      isLoadingUser: state.isLoadingUser,
      loginWithGoogle: state.loginWithGoogle,
      needsConsent: state.needsConsent,
      saveConsent: state.saveConsent,
    }))
  );

  // Subscribed with quantization to 0.2 km increments to prevent 1 Hz re-renders of the root page tree
  const currentDistance = useTripStore(
    useCallback((state) => Math.round((state.currentDistance || 0) * 5) / 5, [])
  );

  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  };

  useWakeLock(isNavigating);

  const [allChargers, setAllChargers] = useState<Charger[]>([]);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [routeChargersFilter, setRouteChargersFilter] = useState<'contextual' | 'all'>('contextual');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'garage' | 'locations' | 'history'>('profile');
  const [summaryData, setSummaryData] = useState<TripSummaryData | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isStopsCardExpanded, setIsStopsCardExpanded] = useState(false);
  const [isDirectCardExpanded, setIsDirectCardExpanded] = useState(false);
  const [isRouteChargersExpanded, setIsRouteChargersExpanded] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: `¡Hola! Soy tu copiloto ChargeWay. Puedes preguntarme por voz sobre tu autonomía, estaciones de carga o consultar cualquier destino, y trazaré tu ruta en el mapa en tiempo real.`,
    },
  ]);
  const [buttonProposal, setButtonProposal] = useState<'hud' | 'glass' | 'aero'>('hud');

  const handleFinishTrip = useCallback(() => {
    const state = useTripStore.getState();
    const activeTripPlan = state.tripPlan;
    const currentRoutePoints = state.routePoints;
    const currentVehicle = state.selectedVehicle;
    const currentSoc = state.soc;
    const validPoints = currentRoutePoints.filter(p => p.lat !== 0 && p.lng !== 0);
    const origin = validPoints[0]?.name || currentRoutePoints[0]?.name || 'Origen';
    const destination = validPoints[validPoints.length - 1]?.name || currentRoutePoints[currentRoutePoints.length - 1]?.name || 'Destino';
    const vehicleModel = currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model}` : 'Vehículo EV';
    const totalPlannedDistKm = activeTripPlan ? Math.round((activeTripPlan.route.distance / 1000) * 10) / 10 : 0;

    // 1. Distancia real recorrida ÚNICAMENTE hasta este momento exacto
    const currentDist = state.currentDistance || 0;
    const accumulatedDist = (state as any).accumulatedDistanceKm || 0;
    const totalDrivenKm = accumulatedDist + currentDist;
    const actualDistanceKm = Math.round(totalDrivenKm * 10) / 10;

    // 2. Tiempo real transcurrido en el trayecto
    const startTime = (state as any).navigationStartTime;
    const samples: number[] = (state as any).speedSamples || [];
    let actualDurationMin = 0.1;
    if (startTime) {
      const elapsedMs = Date.now() - startTime;
      actualDurationMin = Math.max(0.1, Math.round((elapsedMs / 60000) * 10) / 10);
    } else if (samples.length > 0) {
      actualDurationMin = Math.max(0.1, Math.round((samples.length / 60) * 10) / 10);
    }

    // 3. Velocidad promedio real basada en muestras registradas o distancia/tiempo
    let avgSpeedKmh = 0.0;
    if (actualDistanceKm < 0.05) {
      avgSpeedKmh = 0.0;
    } else if (samples.length > 0) {
      avgSpeedKmh = Math.round((samples.reduce((a, b) => a + b, 0) / samples.length) * 10) / 10;
    } else if (actualDistanceKm >= 0.05 && actualDurationMin > 0) {
      avgSpeedKmh = Math.min(130, Math.round((actualDistanceKm / (actualDurationMin / 60)) * 10) / 10);
    } else {
      avgSpeedKmh = 0.0;
    }

    // 4. Consumo de energía (kWh) calculado ÚNICAMENTE para los km realmente transitados
    const usableKwh = currentVehicle?.specs?.usable_battery_kwh || 38.8;
    const baseWhKm = totalPlannedDistKm > 0 && activeTripPlan ? (activeTripPlan.totalConsumptionWh / totalPlannedDistKm) : 160;
    const effectiveWhKm = baseWhKm;
    
    // Si no se ha recorrido distancia significativa (< 50m), el consumo es 0.0 kWh
    const consumedKwh = actualDistanceKm >= 0.05
      ? Math.max(0.01, Math.round((actualDistanceKm * effectiveWhKm / 1000) * 10) / 10)
      : 0.0;

    // 5. Estado de Batería (SoC): Consumido real y disponible actual
    const initialSocFrac = (state as any).navigationStartSoc ?? currentSoc ?? 0.8;
    const startSocPct = Math.round(initialSocFrac * 100);
    const consumedSocPct = actualDistanceKm >= 0.05 && usableKwh > 0
      ? Math.min(100, Math.max(0, Math.round((consumedKwh / usableKwh) * 100)))
      : 0;
    const remainingSocPct = Math.max(0, startSocPct - consumedSocPct);

    // 6. Determinar si el viaje llegó a la meta final (>=95% de la ruta planeada)
    const isCompleted = totalPlannedDistKm > 0 && actualDistanceKm >= (totalPlannedDistKm * 0.95);

    setSummaryData({
      originName: origin,
      destinationName: destination,
      vehicleModel,
      actualDistanceKm,
      actualDurationMin,
      avgSpeedKmh,
      consumedKwh,
      consumedSocPct,
      remainingSocPct,
      startSocPct,
      totalPlannedDistKm,
      isCompleted
    });

    state.setIsNavigating(false);
    state.setIsSimulating(false);
  }, []);

  const handleToggleNavigation = () => {
    triggerHaptic(40);
    if (isNavigating && !isSimulating) {
      handleFinishTrip();
    } else {
      setIsNavigating(true);
      setIsSimulating(false);
      saveTripToDatabase();
    }
  };

  const handleToggleSimulation = () => {
    triggerHaptic(40);
    if (isNavigating && isSimulating) {
      handleFinishTrip();
    } else {
      setIsNavigating(true);
      setIsSimulating(true);
      saveTripToDatabase();
    }
  };

  useEffect(() => {
    fetchAllEcuadorChargers().then(setAllChargers).catch(console.error);
    checkSession();
  }, []);

  // Debounce planRoute: Trigger whenever there are at least 2 named points, or clear stale tripPlan if < 2
  useEffect(() => {
    const namedPoints = routePoints.filter(p => p.name.trim());
    if (namedPoints.length >= 2) {
      const timer = setTimeout(() => {
        planRoute();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // If user removed stops and fewer than 2 valid points remain, clear the old route immediately
      useTripStore.setState({ tripPlan: null });
    }
  }, [selectedVehicle, routePoints, planRoute]);

  const handleMapClick = useCallback((lng: number, lat: number) => {
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
      
      const emptyIndex = newRoute.findIndex(p => !p.name.trim() || (p.lat === 0 && p.lng === 0));
      
      if (emptyIndex !== -1) {
        newRoute[emptyIndex] = {
          ...newRoute[emptyIndex],
          name: `Punto en el mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          lat,
          lng
        };
      } else {
        if (newRoute.length < 12) {
          newRoute.splice(newRoute.length - 1, 0, newPoint);
        } else {
          alert('Máximo 10 paradas intermedias permitidas.');
        }
      }
    }
    
    storeSetRoutePoints(newRoute);
  }, []);

  const handleRouteChange = (newPoints: Waypoint[]) => {
    setRoutePoints(newPoints);
    const validPoints = newPoints.filter(p => p.lat !== 0 && p.lng !== 0 && p.name && p.name.trim() !== '');
    if (validPoints.length === 0) {
      useTripStore.setState({ tripPlan: null });
    } else if (!tripPlan) {
      const firstValid = validPoints[0];
      if (firstValid) setMapFlyTo({ lat: firstValid.lat, lng: firstValid.lng });
    }
  };

  const getWaypointProgressKm = (wp: { lat: number; lng: number; posKm?: number; _km?: number }): number => {
    if (wp.posKm !== undefined && wp.posKm !== null) return wp.posKm;
    if (wp._km !== undefined && wp._km !== null) return wp._km;

    if (tripPlan?.route?.geometry) {
      try {
        const coords = getDecodedRouteCoordinates(tripPlan.route.geometry);
        if (coords.length > 0) {
          let closestIdx = 0;
          let minDist = Infinity;
          const step = Math.max(1, Math.floor(coords.length / 150));
          for (let i = 0; i < coords.length; i += step) {
            const d = (wp.lat - coords[i][1])**2 + (wp.lng - coords[i][0])**2;
            if (d < minDist) { minDist = d; closestIdx = i; }
          }
          const startRefine = Math.max(0, closestIdx - step);
          const endRefine = Math.min(coords.length - 1, closestIdx + step);
          for (let i = startRefine; i <= endRefine; i++) {
            const d = (wp.lat - coords[i][1])**2 + (wp.lng - coords[i][0])**2;
            if (d < minDist) { minDist = d; closestIdx = i; }
          }
          const totalDist = (tripPlan.route.distance || 0) / 1000;
          return totalDist * (closestIdx / Math.max(1, coords.length - 1));
        }
      } catch (_) {}
    }

    const origin = routePoints[0] || { lat: -0.18, lng: -78.48 };
    const dLat = (wp.lat - origin.lat) * 111;
    const dLng = (wp.lng - origin.lng) * 111 * Math.cos((origin.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };

  const addSuggestedStop = (charger: Charger & { posKm?: number; isInbound?: boolean }) => {
    const totalDist = tripPlan?.route?.distance ? tripPlan.route.distance / 1000 : undefined;
    const newRoute = orderRouteWithStops(
      routePoints,
      [{
        id: charger.id || `stop-${Date.now()}`,
        name: charger.nombre || 'Punto de Carga',
        lat: charger.location.lat,
        lng: charger.location.lng,
        posKm: charger.posKm,
        isInbound: (charger as any).isInbound,
      }],
      totalDist
    );
    setRoutePoints(newRoute);
  };

  const addAllSuggestedStops = (chargers: Array<Charger & { posKm?: number; isInbound?: boolean }>) => {
    if (!chargers || chargers.length === 0) return;
    const totalDist = tripPlan?.route?.distance ? tripPlan.route.distance / 1000 : undefined;
    const isRound = isRoundTripRouteHelper(routePoints);
    const stopsToAdd = chargers.map((c, idx) => ({
      id: c.id || `stop-${Date.now()}-${Math.random()}`,
      name: c.nombre || 'Punto de Carga',
      lat: c.location.lat,
      lng: c.location.lng,
      posKm: c.posKm,
      isInbound: (c as any).isInbound ?? (isRound ? (idx > 0) : false),
    }));
    const newRoute = orderRouteWithStops(routePoints, stopsToAdd, totalDist);
    setRoutePoints(newRoute);
  };

  const handleNavigateToCharger = useCallback((charger: Charger) => {
    const state = useTripStore.getState();
    if (state.tripPlan) {
      const totalDist = state.tripPlan?.route?.distance ? state.tripPlan.route.distance / 1000 : undefined;
      const newRoute = orderRouteWithStops(
        state.routePoints,
        [{
          id: charger.id,
          name: charger.nombre || 'Punto de Carga',
          lat: charger.location.lat,
          lng: charger.location.lng
        }],
        totalDist
      );
      state.setRoutePoints(newRoute);
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      useTripStore.setState({ isLoadingPlan: true });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin: Waypoint = {
            id: 'current-loc',
            name: 'Mi ubicación',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          const dest: Waypoint = {
            id: charger.id,
            name: charger.nombre || 'Punto de Carga',
            lat: charger.location.lat,
            lng: charger.location.lng
          };
          state.setRoutePoints([origin, dest]);
          state.setIsNavigating(true);
          state.setIsSimulating(false);
        },
        () => {
          useTripStore.setState({ isLoadingPlan: false });
          alert('No se pudo obtener tu ubicación para iniciar la ruta.');
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      alert('Tu navegador no soporta geolocalización.');
    }
  }, []);

  const mergedChargers = useMemo(() => {
    let merged = [...allChargers];
    (tripPlan?.chargers || []).forEach(ch => {
      if (!merged.some(c => c.id === ch.id)) merged.push(ch);
    });

    if (filterCompatibleChargers && selectedVehicle) {
      const vBrand = selectedVehicle.brand;
      const vType = selectedVehicle.specs?.charger_type?.toLowerCase().replace(/[^a-z0-9]/g, '');
      merged = merged.filter(c => {
        // 1. Exclusión de marcas exclusivas (cargadores de marca como BYD, KIA o JAC son exclusivos)
        if (!isChargerBrandCompatible(c, vBrand)) {
          return false;
        }

        // 2. Compatibilidad de conector
        if (!vType || !c.tipo_cargador) return true;
        const cType = c.tipo_cargador.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (vType === 'type2' || vType === 'tipo2') {
           return cType.includes('type2') || cType.includes('tipo2') || cType.includes('ac');
        }
        if (vType === 'ccs2') {
           // Un vehículo CCS2 (Combo 2) es físicamente compatible con cargadores rápidos CCS2 y cargadores AC Tipo 2 (Mennekes)
           return cType.includes('ccs2') || cType.includes('cs2') || cType.includes('combo2') || cType.includes('combo 2') || cType.includes('type2') || cType.includes('tipo2') || cType.includes('tipo 2') || cType.includes('type 2') || cType.includes('ac');
        }
        if (vType === 'ccs1') {
           // Un vehículo CCS1 (Combo 1) es físicamente compatible con cargadores rápidos CCS1 y cargadores AC Tipo 1 (J1772)
           return cType.includes('ccs1') || cType.includes('cs1') || cType.includes('combo1') || cType.includes('combo 1') || cType.includes('type1') || cType.includes('tipo1') || cType.includes('j1772') || cType.includes('ac');
        }
        if (vType === 'gbt') {
           return cType.includes('gbt') || cType.includes('chino');
        }
        return cType.includes(vType);
      });
    }

    return merged;
  }, [allChargers, tripPlan?.chargers, filterCompatibleChargers, selectedVehicle]);

  const routeChargerIds = useMemo(() => {
    if (!tripPlan?.route?.geometry) return new Set<string>();
    const routeCoords = getDecodedRouteCoordinates(tripPlan.route.geometry);
    if (!routeCoords || routeCoords.length === 0) return new Set<string>();

    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const NEAR_KM = 5;
    const sampled = routeCoords.filter((_, i) => i % 10 === 0);
    const bbox = getRouteBoundingBox(sampled, 0.05);

    const ids = new Set<string>();
    mergedChargers.forEach(ch => {
      if (!ch.location) return;
      const cLat = ch.location.lat;
      const cLng = ch.location.lng;

      // Spatial AABB pre-filtering: descarta >95% de estaciones fuera del cuadrante de viaje en O(1)
      if (cLat < bbox.minLat || cLat > bbox.maxLat || cLng < bbox.minLng || cLng > bbox.maxLng) {
        return;
      }

      // Verificación de proximidad con radio de corte
      const close = sampled.some(([lng, lat]) =>
        Math.abs(cLat - lat) <= 0.05 &&
        Math.abs(cLng - lng) <= 0.05 &&
        haversineKm(cLat, cLng, lat, lng) <= NEAR_KM
      );
      if (close) ids.add(ch.id);
    });
    return ids;
  }, [tripPlan?.route?.geometry, mergedChargers]);

  const routeDistanceKm = tripPlan ? tripPlan.route.distance / 1000 : 0;
  const routeDurationMin = tripPlan ? tripPlan.route.duration / 60 : 0;
  const totalConsumptionKwh = tripPlan ? tripPlan.totalConsumptionWh / 1000 : 0;

  // 1. Tramos / Segmentos de la ruta (sincronizados con ElevationProfile)
  const resolvedTips: SegmentTip[] = useMemo(() => {
    if (tripPlan?.advisorFeedback?.segmentTips && tripPlan.advisorFeedback.segmentTips.length > 0) {
      return tripPlan.advisorFeedback.segmentTips;
    }
    const totalDist = routeDistanceKm || 120;
    return [
      {
        startKm: 0,
        endKm: +(totalDist * 0.14).toFixed(1),
        type: 'plano' as const,
        title: 'Plano - Eficiente',
        advice: 'Mantén aceleración progresiva y velocidad crucero constante en autovía.',
        speedRecommendation: 80,
        regenLevel: 'Medio' as const
      },
      {
        startKm: +(totalDist * 0.14).toFixed(1),
        endKm: +(totalDist * 0.42).toFixed(1),
        type: 'subida' as const,
        title: 'Subida a la Cumbre',
        advice: 'Dosifica acelerador a 72 km/h para estabilizar el consumo y evitar picos térmicos.',
        speedRecommendation: 72,
        regenLevel: 'Bajo' as const
      },
      {
        startKm: +(totalDist * 0.42).toFixed(1),
        endKm: +(totalDist * 0.75).toFixed(1),
        type: 'bajada' as const,
        title: 'Descenso Interandino',
        advice: 'Aprovecha la inercia del vehículo y activa regeneración alta para recuperar batería.',
        speedRecommendation: 80,
        regenLevel: 'Alto' as const
      },
      {
        startKm: +(totalDist * 0.75).toFixed(1),
        endKm: +totalDist.toFixed(1),
        type: 'plano' as const,
        title: 'Llegada y Zona Urbana',
        advice: 'Conducción suave anticipando frenadas hacia el punto de carga.',
        speedRecommendation: 60,
        regenLevel: 'Medio' as const
      }
    ];
  }, [tripPlan?.advisorFeedback?.segmentTips, routeDistanceKm]);

  const currentVehicleSegmentIndex = useMemo(() => {
    if (!resolvedTips.length) return 0;
    const curDist = currentDistance || 0;
    const foundIdx = resolvedTips.findIndex(t => curDist >= t.startKm && curDist <= t.endKm);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [resolvedTips, currentDistance]);

  const activeSegment = useMemo(() => {
    if (hoveredSegment !== null && hoveredSegment !== undefined) {
      return resolvedTips[hoveredSegment] || null;
    }
    // Si no hay tramo inspeccionado manualmente, tomar el tramo actual del avance del vehículo
    return resolvedTips[currentVehicleSegmentIndex] || resolvedTips[0] || null;
  }, [hoveredSegment, currentVehicleSegmentIndex, resolvedTips]);

  // 2. Geometría acumulativa de la ruta para proyectar el punto kilométrico exacto
  const routePolylineData = useMemo(() => {
    if (!tripPlan?.route?.geometry) return null;
    const routeCoords = getDecodedRouteCoordinates(tripPlan.route.geometry);
    if (!routeCoords || routeCoords.length === 0) return null;

    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const cumDist: number[] = [0];
    for (let i = 1; i < routeCoords.length; i++) {
      const d = haversineKm(routeCoords[i - 1][1], routeCoords[i - 1][0], routeCoords[i][1], routeCoords[i][0]);
      cumDist.push(cumDist[i - 1] + d);
    }
    const totalCalcDist = cumDist[cumDist.length - 1] || 1;
    const officialTotalDist = (tripPlan.route.distance / 1000) || totalCalcDist;
    const distScale = officialTotalDist / totalCalcDist;

    return { routeCoords, cumDist, distScale, officialTotalDist };
  }, [tripPlan?.route?.geometry, tripPlan?.route?.distance]);

  // 3a. Proyección estática de cargadores a su punto kilométrico de la ruta (se ejecuta SOLO al cambiar ruta o cargadores)
  const staticChargerProjections = useMemo(() => {
    if (!routePolylineData || routeChargerIds.size === 0) return [];
    const { routeCoords, cumDist, distScale } = routePolylineData;

    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const chargersOnRoute = mergedChargers.filter(c => routeChargerIds.has(c.id));
    const userBrand = (selectedVehicle?.brand || '').toLowerCase().trim();

    const isBrand = (name?: string, op?: string) => {
      if (!userBrand) return false;
      const text = `${name || ''} ${op || ''}`.toLowerCase();
      if (text.includes(userBrand)) return true;
      if (userBrand.includes('byd') && text.includes('byd')) return true;
      if (userBrand.includes('kia') && text.includes('kia')) return true;
      if (userBrand.includes('tesla') && (text.includes('tesla') || text.includes('supercharger'))) return true;
      if (userBrand.includes('porsche') && text.includes('porsche')) return true;
      if (userBrand.includes('audi') && text.includes('audi')) return true;
      return false;
    };

    const projections = chargersOnRoute.map(ch => {
      let closestIdx = 0;
      let minDist = Infinity;
      const step = Math.max(1, Math.floor(routeCoords.length / 150));
      for (let i = 0; i < routeCoords.length; i += step) {
        const [lng, lat] = routeCoords[i];
        const d = haversineKm(ch.location.lat, ch.location.lng, lat, lng);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }

      const startRefine = Math.max(0, closestIdx - step);
      const endRefine = Math.min(routeCoords.length - 1, closestIdx + step);
      for (let i = startRefine; i <= endRefine; i++) {
        const [lng, lat] = routeCoords[i];
        const d = haversineKm(ch.location.lat, ch.location.lng, lat, lng);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }

      // Si el cargador se encuentra a más de 3 km de la vía de la ruta, descarta por no pertenecer al eje vial
      if (minDist > 3.0) return null;

      const routeKm = Math.round((cumDist[closestIdx] * distScale) * 10) / 10;
      const pStr = (ch.potencia || '').toLowerCase();
      const sStr = (ch.velocidad || '').toLowerCase();
      const isFast = sStr.includes('ráp') || sStr.includes('rap') || pStr.includes('50') || pStr.includes('90') || pStr.includes('60') || pStr.includes('120') || (parseInt(pStr) || 0) >= 22;
      const isBrandMatch = isBrand(ch.nombre, (ch as any).operador || ch.operator);

      return {
        charger: ch,
        routeKm,
        isFast,
        isBrandMatch,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return projections;
  }, [routePolylineData, routeChargerIds, mergedChargers, selectedVehicle?.brand]);

  // 3b. Métricas dinámicas basadas en el avance kilométrico (cómputo escalar ultra-rápido en cada tick GPS)
  const allRouteChargersWithMetrics = useMemo(() => {
    if (!staticChargerProjections.length) return [];
    const curDist = currentDistance || 0;

    return staticChargerProjections.map(item => {
      const distAhead = Math.round((item.routeKm - curDist) * 10) / 10;
      const isPassed = distAhead < -1.0;

      // Pertenencia estricta al tramo activo del vehículo o seleccionado en Cockpit Táctico (dentro del rango startKm y endKm del tramo)
      const isInSelectedSegment = activeSegment
        ? (item.routeKm >= activeSegment.startKm && item.routeKm <= activeSegment.endKm)
        : false;

      const distToSegment = activeSegment
        ? (item.routeKm < activeSegment.startKm ? activeSegment.startKm - item.routeKm : item.routeKm > activeSegment.endKm ? item.routeKm - activeSegment.endKm : 0)
        : 0;

      return {
        charger: item.charger,
        routeKm: item.routeKm,
        distAhead,
        isPassed,
        isFast: item.isFast,
        isBrandMatch: item.isBrandMatch,
        isInSelectedSegment,
        distToSegment
      };
    });
  }, [staticChargerProjections, currentDistance, activeSegment]);

  // 4. Lista filtrada estrictamente: SOLO las estaciones que pertenecen a este tramo
  const displayedRouteChargers = useMemo(() => {
    if (!allRouteChargersWithMetrics.length) return [];

    if (activeSegment) {
      const segmentMatches = allRouteChargersWithMetrics.filter(item => item.isInSelectedSegment);
      segmentMatches.sort((a, b) => a.routeKm - b.routeKm);
      return segmentMatches;
    }

    return allRouteChargersWithMetrics;
  }, [allRouteChargersWithMetrics, activeSegment]);

  const liveStats = useMemo(() => {
    if (!tripPlan || !selectedVehicle) return null;
    const SAFETY_BUFFER = 0.20;
    const battery = selectedVehicle.specs.usable_battery_kwh;
    const wltpRange = (selectedVehicle.specs as any).wltp_range_km || 400;
    const nominalRateWhKm = (battery * 1000) / Math.max(wltpRange, 200);
    const routeRateWhKm = routeDistanceKm > 0
      ? tripPlan.totalConsumptionWh / routeDistanceKm
      : nominalRateWhKm;
    // Acotar tasa para autonomía remanente y evitar proyecciones infinitas en descensos
    const safeRemainingRateWhKm = Math.max(nominalRateWhKm * 0.8, Math.min(nominalRateWhKm * 1.3, routeRateWhKm > 80 ? routeRateWhKm : nominalRateWhKm));

    // Verificar si la ruta incluye paradas de recarga intermedias (agregadas por usuario o sugeridas)
    const chargingWaypointsCount = routePoints.slice(1, -1).filter(wp =>
      /byd|kia|jac|cargador|electrolinera|ultra|evinka|condor|rayo|primax|terpel/i.test(wp.name)
    ).length;
    const suggestedStopsCount = tripPlan.suggestedChargingStops?.length || (tripPlan.suggestedChargingStop ? 1 : 0);
    const hasChargingStops = chargingWaypointsCount > 0 || suggestedStopsCount > 0;

    let arrivalSoc = 0;
    let usableAtEnd = 0;

    if (tripPlan.arrivalSoc !== undefined && tripPlan.arrivalSoc !== null && (tripPlan.arrivalSoc > 0 || !hasChargingStops)) {
      arrivalSoc = Math.max(0, Math.min(1.0, tripPlan.arrivalSoc));
      usableAtEnd = battery * arrivalSoc;
    } else if (hasChargingStops) {
      arrivalSoc = 0.28;
      usableAtEnd = battery * arrivalSoc;
    } else {
      const usableAtStart = battery * soc;
      usableAtEnd = Math.max(0, usableAtStart - tripPlan.totalConsumptionWh / 1000);
      arrivalSoc = usableAtEnd / battery;
    }

    const arrivalRangeKm = Math.max(0, Math.round((usableAtEnd * 1000) / safeRemainingRateWhKm));
    const safetyMarginKm = Math.round(((usableAtEnd - battery * SAFETY_BUFFER) * 1000) / safeRemainingRateWhKm);
    return { arrivalSoc, arrivalRangeKm, safetyMarginKm };
  }, [tripPlan, soc, selectedVehicle, routeDistanceKm, routePoints]);

  const isRoundTripRoute = routePoints.length >= 3 && (
    (routePoints[routePoints.length - 1]?.name || '').includes('(Retorno)') ||
    (Math.abs(routePoints[routePoints.length - 1]?.lat - (routePoints[0]?.lat || 0)) < 0.01 &&
     Math.abs(routePoints[routePoints.length - 1]?.lng - (routePoints[0]?.lng || 0)) < 0.01)
  );

  const primaryDestinationPoint = isRoundTripRoute
    ? routePoints.find((p, idx) => idx > 0 && idx < routePoints.length - 1 && !p.name.includes('(Retorno)')) || routePoints[1]
    : routePoints[routePoints.length - 1];

  const copilotContext = useMemo(() => ({
    userId: user?.id,
    userEmail: user?.email,
    vehicleBrand: selectedVehicle?.brand,
    vehicleModel: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : undefined,
    batteryCapacityKwh: selectedVehicle?.specs?.usable_battery_kwh,
    currentSoC: Math.round((soc || 0.5) * 100),
    currentCoords: (routePoints[0]?.lat && routePoints[0]?.lng && routePoints[0].lat !== 0)
      ? [routePoints[0].lng, routePoints[0].lat] as [number, number]
      : undefined,
    destinationCity: primaryDestinationPoint?.name,
    estimatedRangeKm: selectedVehicle ? Math.round(selectedVehicle.specs.wltp_range_km * soc) : undefined,
    wltpRangeKm: selectedVehicle?.specs?.wltp_range_km,
    activeTrip: tripPlan ? {
      originName: routePoints[0]?.name || 'Origen',
      originLat: routePoints[0]?.lat,
      originLng: routePoints[0]?.lng,
      destinationName: primaryDestinationPoint?.name || 'Destino',
      destinationLat: primaryDestinationPoint?.lat,
      destinationLng: primaryDestinationPoint?.lng,
      waypoints: routePoints.slice(1, isRoundTripRoute ? -1 : undefined).filter(p => p.lat !== 0).map(p => ({ name: p.name, lat: p.lat, lng: p.lng })),
      isRoundTrip: isRoundTripRoute,
      distanceKm: routeDistanceKm,
      durationMin: routeDurationMin,
      consumptionKwh: totalConsumptionKwh,
      arrivalSoc: (() => {
        const val = liveStats?.arrivalSoc ?? tripPlan.arrivalSoc;
        if (val === undefined || isNaN(Number(val))) return 0;
        const num = Number(val);
        return Math.abs(num) <= 1.0 ? Math.round(num * 100) : Math.round(num);
      })(),
      arrivalRangeKm: liveStats?.arrivalRangeKm ?? tripPlan.arrivalRangeKm,
      safetyMarginKm: liveStats?.safetyMarginKm ?? tripPlan.safetyMarginKm,
      recommendedChargerName: tripPlan.suggestedChargingStop?.nombre || (tripPlan as any).chargingStops?.[0]?.name || staticChargerProjections?.[0]?.charger?.nombre || 'Estación en la ruta',
      suggestedStop: tripPlan.suggestedChargingStop ? {
        name: tripPlan.suggestedChargingStop.nombre,
        lat: tripPlan.suggestedChargingStop.location.lat,
        lng: tripPlan.suggestedChargingStop.location.lng,
        power: tripPlan.suggestedChargingStop.potencia || '50 kW',
        canton: tripPlan.suggestedChargingStop.canton,
        kwhToCharge: tripPlan.suggestedChargingStop.recommendedCharge?.kwhToCharge,
        estMinutes: tripPlan.suggestedChargingStop.recommendedCharge?.estMinutes,
        targetSocPct: tripPlan.suggestedChargingStop.recommendedCharge?.targetSocPct,
        arrivalSocPct: tripPlan.suggestedChargingStop.recommendedCharge?.arrivalSocPct,
        posKm: tripPlan.suggestedChargingStop.posKm,
        isInbound: (tripPlan.suggestedChargingStop as any).isInbound ?? (tripPlan.suggestedChargingStop.posKm && routeDistanceKm ? tripPlan.suggestedChargingStop.posKm > (routeDistanceKm / 2) : false),
      } : undefined,
      suggestedStops: (tripPlan.suggestedChargingStops || (tripPlan.suggestedChargingStop ? [tripPlan.suggestedChargingStop] : [])).map((s, idx, arr) => ({
        name: s.nombre,
        lat: s.location.lat,
        lng: s.location.lng,
        power: s.potencia || '50 kW',
        canton: s.canton,
        kwhToCharge: s.recommendedCharge?.kwhToCharge,
        estMinutes: s.recommendedCharge?.estMinutes,
        targetSocPct: s.recommendedCharge?.targetSocPct,
        arrivalSocPct: s.recommendedCharge?.arrivalSocPct,
        legIndex: s.recommendedCharge?.legIndex ?? (idx + 1),
        totalLegs: s.recommendedCharge?.totalLegs ?? arr.length,
        posKm: s.posKm,
        isInbound: (s as any).isInbound ?? (s.posKm && routeDistanceKm ? s.posKm > (routeDistanceKm / 2) : false),
      })),
    } : undefined,
    routeChargers: (() => {
      const necStops = tripPlan?.suggestedChargingStops && tripPlan.suggestedChargingStops.length > 0
        ? tripPlan.suggestedChargingStops
        : (tripPlan?.suggestedChargingStop ? [tripPlan.suggestedChargingStop] : []);

      if (necStops.length > 0) {
        return necStops.map((nec, idx) => ({
          id: nec.id || nec.nombre,
          name: nec.nombre,
          power: nec.potencia || '50 kW',
          speed: nec.velocidad || 'Rápida',
          lat: nec.location.lat,
          lng: nec.location.lng,
          operator: (nec as any).operador || nec.operator || 'Supabase',
          isNecessaryStop: true,
          legIndex: nec.recommendedCharge?.legIndex ?? (idx + 1),
          totalLegs: nec.recommendedCharge?.totalLegs ?? necStops.length,
          kwhToCharge: nec.recommendedCharge?.kwhToCharge,
          estMinutes: nec.recommendedCharge?.estMinutes,
          posKm: nec.posKm,
          isInbound: (nec as any).isInbound ?? (nec.posKm && routeDistanceKm ? nec.posKm > (routeDistanceKm / 2) : false),
        }));
      }
      return [];
    })(),
  }), [
    selectedVehicle,
    soc,
    primaryDestinationPoint,
    tripPlan,
    routePoints,
    isRoundTripRoute,
    routeDistanceKm,
    routeDurationMin,
    totalConsumptionKwh,
    Math.round((liveStats?.arrivalSoc ?? tripPlan?.arrivalSoc ?? 0) * 100),
    staticChargerProjections,
  ]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 select-none">
        <div className="relative">
          <img 
            src="/logo.png" 
            alt="ChargeWay Logo" 
            className="w-20 h-20 rounded-2xl object-cover ring-1 ring-brand-cyan/40 shadow-glow-cyan animate-pulse"
          />
          <div className="absolute inset-0 rounded-2xl border border-brand-cyan/30 animate-ping pointer-events-none" />
        </div>
        <div className="flex items-center gap-2 font-mono">
          <Loader2 size={16} className="animate-spin text-brand-cyan" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Cargando ChargeWay...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-lime/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="hud-panel max-w-md w-full p-8 rounded-3xl border border-white/10 shadow-hud flex flex-col items-center text-center gap-6 relative z-10">
          <div className="relative mb-1">
            <img 
              src="/logo.png" 
              alt="ChargeWay Logo" 
              className="w-28 h-28 rounded-2xl object-cover ring-2 ring-brand-cyan/40 shadow-glow-cyan hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white tracking-wider">CHARGEWAY</h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-mono">ECUADOR</span>
            </div>
            <p className="text-brand-lime text-[11px] font-mono font-bold uppercase tracking-widest mb-3">Drive with Electric Tranquility</p>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              Planifica tus viajes eléctricos en Ecuador sin preocuparte por la autonomía ni la disponibilidad de carga.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-sm mx-auto mt-2 mb-2 text-left">
            <ExpandableDoc title="Leer Términos y Condiciones de Uso" content={TERMS_TEXT} />
            <ExpandableDoc title="Leer Política de Privacidad" content={PRIVACY_TEXT} />
          </div>

          <button
            onClick={loginWithGoogle}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-cyan via-emerald-400 to-brand-lime hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 shadow-glow-cyan cursor-pointer ring-1 ring-brand-cyan/40"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#030712" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#030712" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#030712" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#030712" />
            </svg>
            <span>Iniciar con Google</span>
          </button>

        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-4 sm:py-6 px-3 sm:px-6 lg:px-8 max-w-7xl 2xl:max-w-[1440px] mx-auto relative font-sans text-slate-100 flex flex-col items-center">
      {/* Cockpit Shell Outer Border & Background (Optimized for 60fps GPU Compositor) */}
      <div className="w-full rounded-3xl border border-white/10 bg-[#080d17] p-3 sm:p-5 lg:p-6 shadow-[0_0_50px_-15px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/20 relative" style={{ transform: 'translateZ(0)' }}>
        {/* Consent Modal */}
        {user && needsConsent && (
          <ConsentModal onAccept={saveConsent} />
        )}

        {/* Profile Modal */}
        {isProfileModalOpen && user && (
          <ProfileModal 
            userId={user.id} 
            initialTab={profileTab}
            onClose={() => setIsProfileModalOpen(false)} 
          />
        )}

        {/* Top HUD Branding Bar */}
        <div className="hud-panel rounded-2xl px-5 py-3 border border-white/10 shadow-hud flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="ChargeWay Logo" 
            className="h-8 w-8 object-contain rounded-xl ring-1 ring-brand-cyan/40 shadow-glow-cyan"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black tracking-wider text-white">CHARGEWAY</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-mono">ECUADOR</span>
            </div>
            <p className="text-[9px] font-mono text-slate-400">RED NACIONAL ULTRA-FAST EV</p>
          </div>
        </div>



        <div className="flex items-center space-x-3">
          <PwaInstallButton />
          <AuthButton 
            onOpenProfile={() => {
              setProfileTab('profile');
              setIsProfileModalOpen(true);
            }} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
        {/* Left Sidebar */}
        <aside className="flex flex-col gap-5">
          {/* New Redesigned Vehicle Selector */}
          <VehicleSelector 
            selectedId={selectedVehicle?.id || ''} 
            onSelect={setSelectedVehicle} 
            soc={soc}
            onSocChange={setSoc}
            rangeKm={selectedVehicle ? Math.round(selectedVehicle.specs.wltp_range_km * soc) : 0}
            onOpenProfile={() => {
              setProfileTab('garage');
              setIsProfileModalOpen(true);
            }}
          />

          {/* New Redesigned Route Search */}
          <div className="relative z-[100]">
            <RouteSearch locations={routePoints} onChange={handleRouteChange} />
          </div>

          {/* Action Buttons Row: Exact Apple VisionOS Frosted Crystal Glassmorphism Design */}
          {/* Action Buttons Row: Structured HUD Panel with Centered VisionOS Glass Buttons */}
          <div className="hud-panel p-2.5 sm:p-3 rounded-2xl border border-white/10 shadow-hud flex flex-col gap-2 w-full relative">
            {isLoadingPlan && (
              <div className="flex items-center justify-center gap-2 py-1 px-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10.5px] font-mono text-cyan-300 font-semibold animate-pulse backdrop-blur-md">
                <Loader2 size={12} className="animate-spin text-cyan-300" />
                <span>Calculando telemetría de ruta...</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full items-center justify-center">
              {/* ─── Botón 1: INICIAR VIAJE (Navegación GPS) ─── */}
              <button
                type="button"
                onClick={handleToggleNavigation}
                disabled={!tripPlan && !isNavigating}
                className={`group relative overflow-hidden w-full h-[70px] sm:h-[74px] rounded-[18px] sm:rounded-[22px] p-1.5 flex flex-col items-center justify-between border transition-all duration-300 cursor-pointer ${
                  !tripPlan && !isNavigating
                    ? 'vision-glass-panel border-white/10 opacity-40 cursor-not-allowed'
                    : isNavigating && !isSimulating
                    ? 'vision-glass-panel border-rose-400/50 hover:border-rose-300 shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.4),0_0_15px_rgba(244,63,94,0.3)]'
                    : 'vision-glass-panel border-white/25 hover:border-emerald-300/60 shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.4),0_0_15px_rgba(16,185,129,0.2)]'
                }`}
                title={!tripPlan && !isNavigating ? 'Ingresa origen y destino para iniciar viaje' : isNavigating && !isSimulating ? 'Detener navegación GPS real' : 'Iniciar navegación GPS real'}
              >
                {/* Curved Specular Glass Reflection Sheen */}
                <div className="absolute inset-0 rounded-[18px] sm:rounded-[22px] pointer-events-none vision-glass-reflection" />

                {/* 3D Crystal Orb Sphere */}
                <div className="relative z-10 w-full flex-1 flex items-center justify-center pt-0.5">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full relative flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${
                    isNavigating && !isSimulating ? 'crystal-orb-active' : 'crystal-orb'
                  }`}>
                    {/* Glass orb internal highlight specular arc */}
                    <div className="absolute top-0.5 left-1 w-2.5 h-1.5 rounded-full bg-white/40 blur-[0.5px] transform -rotate-12 pointer-events-none" />

                    {/* Play / Stop Icon */}
                    {isNavigating && !isSimulating ? (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-rose-300 drop-shadow-[0_0_6px_rgba(244,63,94,0.9)]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="5" width="14" height="14" rx="2" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.95)]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="7 4 19 12 7 20 7 4" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Label */}
                <div className="relative z-10 text-center w-full pb-1 flex items-center justify-center min-h-[24px]">
                  <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-white tracking-tight uppercase font-sans drop-shadow leading-[1.1] text-center px-0.5">
                    {isNavigating && !isSimulating ? (
                      <>DETENER<br />GPS</>
                    ) : (
                      <>INICIAR<br />VIAJE</>
                    )}
                  </span>
                </div>
              </button>

              {/* ─── Botón 2: SIMULAR VIAJE ─── */}
              <button
                type="button"
                onClick={handleToggleSimulation}
                disabled={!tripPlan && !isNavigating}
                className={`group relative overflow-hidden w-full h-[70px] sm:h-[74px] rounded-[18px] sm:rounded-[22px] p-1.5 flex flex-col items-center justify-between border transition-all duration-300 cursor-pointer ${
                  !tripPlan && !isNavigating
                    ? 'vision-glass-panel border-white/10 opacity-40 cursor-not-allowed'
                    : isNavigating && isSimulating
                    ? 'vision-glass-panel border-amber-400/60 hover:border-amber-300 bg-amber-950/40 shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.4),0_0_18px_rgba(245,158,11,0.4)]'
                    : 'vision-glass-panel border-cyan-400/30 hover:border-cyan-300/70 shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.4),0_0_15px_rgba(6,182,212,0.2)]'
                }`}
                title={!tripPlan && !isNavigating ? 'Ingresa origen y destino para simular' : isNavigating && isSimulating ? 'Detener simulación' : 'Simular recorrido animado a lo largo de la ruta'}
              >
                {/* Curved Specular Glass Reflection Sheen */}
                <div className="absolute inset-0 rounded-[18px] sm:rounded-[22px] pointer-events-none vision-glass-reflection" />

                <div className="relative z-10 w-full flex-1 flex items-center justify-center pt-0.5">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full relative flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${
                    isNavigating && isSimulating ? 'bg-amber-500/30 border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'bg-cyan-500/20 border border-cyan-400/40'
                  }`}>
                    {isNavigating && isSimulating ? (
                      <Square className="w-3.5 h-3.5 text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
                    ) : (
                      <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.95)]" />
                    )}
                  </div>
                </div>

                <div className="relative z-10 text-center w-full pb-1 flex items-center justify-center min-h-[24px]">
                  <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-white tracking-tight uppercase font-sans drop-shadow leading-[1.1] text-center px-0.5">
                    {isNavigating && isSimulating ? (
                      <>DETENER<br />SIM</>
                    ) : (
                      <>SIMULAR<br />VIAJE</>
                    )}
                  </span>
                </div>
              </button>

              {/* ─── Botón 3: GOOGLE MAPS ─── */}
              <button
                type="button"
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
                disabled={routePoints.filter(p => p.lat !== 0 && p.lng !== 0).length < 2}
                className={`group relative overflow-hidden w-full h-[70px] sm:h-[74px] rounded-[18px] sm:rounded-[22px] p-1.5 flex flex-col items-center justify-between border transition-all duration-300 cursor-pointer ${
                  routePoints.filter(p => p.lat !== 0 && p.lng !== 0).length < 2
                    ? 'vision-glass-panel border-white/10 opacity-40 cursor-not-allowed'
                    : 'vision-glass-panel border-blue-400/40 hover:border-blue-300/70 shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.4),0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.6),inset_0_1.5px_2px_rgba(255,255,255,0.5),0_0_20px_rgba(59,130,246,0.4)]'
                }`}
                title={routePoints.filter(p => p.lat !== 0 && p.lng !== 0).length < 2 ? 'Ingresa origen y destino para exportar a Google Maps' : 'Exportar y abrir ruta en Google Maps'}
              >
                {/* Curved Specular Glass Reflection Sheen */}
                <div className="absolute inset-0 rounded-[18px] sm:rounded-[22px] pointer-events-none vision-glass-reflection" />

                {/* 3D Faceted Sapphire Navigation Arrow */}
                <div className="relative z-10 w-full flex-1 flex items-center justify-center pt-0.5">
                  <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    {/* Ambient sapphire halo */}
                    <div className="absolute inset-0.5 rounded-full bg-blue-500/25 blur-md pointer-events-none" />
                    
                    <svg viewBox="0 0 100 100" className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_10px_rgba(59,130,246,0.85)]">
                      <defs>
                        <linearGradient id="sapphireLightSm" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#BFDBFE" />
                          <stop offset="40%" stopColor="#60A5FA" />
                          <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                        <linearGradient id="sapphireDarkSm" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="60%" stopColor="#1D4ED8" />
                          <stop offset="100%" stopColor="#1E3A8A" />
                        </linearGradient>
                        <linearGradient id="sapphireSpineSm" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="60%" stopColor="#93C5FD" />
                          <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                      </defs>
                      <polygon points="82,18 18,52 48,60" fill="url(#sapphireLightSm)" />
                      <polygon points="82,18 48,60 56,84" fill="url(#sapphireDarkSm)" />
                      <polygon points="18,52 48,60 56,84" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
                      <line x1="82" y1="18" x2="48" y2="60" stroke="url(#sapphireSpineSm)" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Label */}
                <div className="relative z-10 text-center w-full pb-1 flex items-center justify-center min-h-[24px]">
                  <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-white tracking-tight uppercase font-sans drop-shadow leading-[1.1] text-center px-0.5">
                    GOOGLE<br />MAPS
                  </span>
                </div>
              </button>

              {/* ─── Botón 4: ASISTENTE DE VIAJE ─── */}
              <button
                type="button"
                onClick={() => setIsCopilotOpen(prev => !prev)}
                className={`group relative overflow-hidden w-full h-[70px] sm:h-[74px] rounded-[18px] sm:rounded-[22px] p-1.5 flex flex-col items-center justify-between border vision-glass-panel transition-all duration-300 cursor-pointer ${
                  isCopilotOpen
                    ? 'border-emerald-400 bg-emerald-950/60 ring-2 ring-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.5),inset_0_1px_2px_rgba(255,255,255,0.6)]'
                    : 'border-emerald-300/35 hover:border-emerald-300/70 shadow-[0_6px_20px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.4),0_0_15px_rgba(52,211,153,0.2)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.6),inset_0_1.5px_2px_rgba(255,255,255,0.5),0_0_20px_rgba(52,211,153,0.4)]'
                }`}
                title={isCopilotOpen ? "Cerrar Asistente de Viaje" : "Abrir Asistente de Viaje AI"}
              >
                {/* Curved Specular Glass Reflection Sheen */}
                <div className="absolute inset-0 rounded-[18px] sm:rounded-[22px] pointer-events-none vision-glass-reflection" />

                {/* Microphone with Symmetrical Flanking Audio Waveforms */}
                <div className="relative z-10 w-full flex-1 flex items-center justify-center pt-0.5">
                  <div className="w-full flex items-center justify-center gap-1 px-1 group-hover:scale-105 transition-transform duration-300">
                    {/* Left Audio Waves */}
                    <div className="flex items-center gap-[1.5px] opacity-80">
                      <span className="w-[1.5px] rounded-full bg-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.8)] animate-wave-1 h-1.5" />
                      <span className="w-[1.5px] rounded-full bg-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.8)] animate-wave-2 h-2.5" />
                      <span className="w-[1.5px] rounded-full bg-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.9)] animate-wave-3 h-3.5" />
                      <span className="w-[2px] rounded-full bg-emerald-200 drop-shadow-[0_0_5px_rgba(52,211,153,1)] animate-wave-4 h-4.5" />
                    </div>

                    {/* Center Neon Mint Microphone */}
                    <div className="relative flex items-center justify-center px-0.5">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.95)]" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                        <line x1="8" y1="22" x2="16" y2="22" />
                      </svg>
                    </div>

                    {/* Right Audio Waves (Symmetric mirror) */}
                    <div className="flex items-center gap-[1.5px] opacity-80">
                      <span className="w-[2px] rounded-full bg-emerald-200 drop-shadow-[0_0_5px_rgba(52,211,153,1)] animate-wave-4 h-4.5" />
                      <span className="w-[1.5px] rounded-full bg-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.9)] animate-wave-3 h-3.5" />
                      <span className="w-[1.5px] rounded-full bg-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.8)] animate-wave-2 h-2.5" />
                      <span className="w-[1.5px] rounded-full bg-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.8)] animate-wave-1 h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Label */}
                <div className="relative z-10 text-center w-full pb-1 flex items-center justify-center min-h-[24px]">
                  <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-white tracking-tight uppercase font-sans drop-shadow leading-[1.1] text-center px-0.5">
                    ASISTENTE<br />DE VIAJE
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Copiloto EV desplegado directamente debajo de los botones en la barra lateral */}
          {isCopilotOpen && (
            <div className="w-full transition-all duration-300">
              <VoiceCopilotModal
                isOpen={isCopilotOpen}
                onClose={() => setIsCopilotOpen(false)}
                messages={copilotMessages}
                setMessages={setCopilotMessages}
                context={copilotContext}
              />
            </div>
          )}

          {/* Physical Energy Calculation Assessment Banner (Desplegable) */}
          {tripPlan && !isNavigating && (
            ((tripPlan.suggestedChargingStops && tripPlan.suggestedChargingStops.length > 0) || tripPlan.suggestedChargingStop) ? (
              (() => {
                const stops = tripPlan.suggestedChargingStops && tripPlan.suggestedChargingStops.length > 0
                  ? tripPlan.suggestedChargingStops
                  : [tripPlan.suggestedChargingStop!];
                const isMulti = stops.length > 1;

                return (
                  <div className="hud-panel p-3 sm:p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/30 shadow-hud flex flex-col gap-2.5 transition-all font-mono">
                    {/* Compact 1-Line Header Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                          <Zap size={14} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono truncate">
                            Cálculo Físico: {isMulti ? `${stops.length} Paradas Necesarias` : 'Parada Requerida'}
                          </h4>
                          <p className="text-[10.5px] text-slate-400 truncate">
                            Ruta de {Math.round(tripPlan.route.distance / 1000)} km • Recarga necesaria para evitar agotamiento
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => isMulti ? addAllSuggestedStops(stops) : addSuggestedStop(stops[0])}
                          className="px-2.5 py-1.5 rounded-xl font-bold text-[10.5px] bg-amber-400 hover:bg-amber-300 text-slate-950 uppercase tracking-wider font-mono transition shadow-md flex items-center gap-1 cursor-pointer"
                          title="Añadir automáticamente las paradas a la ruta"
                        >
                          <Zap size={11} className="fill-slate-950" />
                          <span>{isMulti ? `Añadir (${stops.length})` : 'Añadir'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsStopsCardExpanded(prev => !prev)}
                          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition cursor-pointer"
                          title={isStopsCardExpanded ? "Ocultar detalle de paradas" : "Ver detalle de paradas"}
                        >
                          {isStopsCardExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Desplegable de Detalles de Paradas */}
                    {isStopsCardExpanded && (
                      <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2.5">
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                          {stops.map((stop, idx) => (
                            <div key={idx} className="bg-slate-950/80 border border-white/10 rounded-xl p-2.5 font-mono text-xs flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isMulti && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                                        {idx + 1} / {stops.length}
                                      </span>
                                    )}
                                    <p className="text-white font-bold text-xs leading-tight">{stop.nombre}</p>
                                  </div>
                                  <p className="text-slate-400 text-[10.5px] mt-0.5">
                                    {stop.posKm ? `Km ${Math.round(stop.posKm)} • ` : ''}
                                    {stop.canton}, {stop.provincia} • {stop.potencia}
                                  </p>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0 font-bold">
                                  Llegas ~{stop.recommendedCharge?.arrivalSocPct ?? Math.round(tripPlan.arrivalSoc * 100)}%
                                </span>
                              </div>

                              {stop.recommendedCharge && (
                                <div className="pt-1.5 border-t border-white/10 grid grid-cols-2 gap-2 text-[10.5px]">
                                  <div>
                                    <span className="text-slate-400 text-[9px] block uppercase">Carga requerida</span>
                                    <span className="text-cyan-300 font-bold">+{stop.recommendedCharge.kwhToCharge} kWh</span>
                                    <span className="text-slate-400 text-[9px]"> (~{stop.recommendedCharge.estMinutes} min)</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 text-[9px] block uppercase">Meta de salida</span>
                                    <span className="text-emerald-400 font-bold">{stop.recommendedCharge.targetSocPct}% SoC</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <p className="text-slate-400 text-[9.5px] italic leading-tight flex-1">
                                  {stop.recommendedCharge?.reason || ''}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addSuggestedStop(stop)}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition shrink-0 cursor-pointer"
                                >
                                  + Añadir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              (() => {
                const arrivalSocPct = Math.round(tripPlan.arrivalSoc * 100);
                const isDeficit = arrivalSocPct < 12;

                if (isDeficit) {
                  return (
                    <div className="hud-panel p-3 sm:p-3.5 rounded-2xl border border-rose-500/40 bg-rose-950/30 shadow-hud flex flex-col gap-2.5 font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-rose-400 text-base shrink-0">⚠️</span>
                          <div className="truncate">
                            <span className="text-rose-300 font-bold text-xs uppercase tracking-wider">Déficit de Batería • Recarga Requerida</span>
                            <p className="text-[10.5px] text-slate-300 truncate">
                              Autonomía insuficiente para viaje directo • Déficit de {Math.abs(arrivalSocPct)}% SoC (~{Math.abs(liveStats?.safetyMarginKm ?? tripPlan.safetyMarginKm)} km faltantes)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-rose-400 font-bold text-xs bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                            {arrivalSocPct}% SoC
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsDirectCardExpanded(prev => !prev)}
                            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition cursor-pointer shrink-0"
                            title={isDirectCardExpanded ? "Ocultar detalles de déficit" : "Ver detalles de déficit"}
                          >
                            {isDirectCardExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Desplegable de Detalles del Déficit */}
                      {isDirectCardExpanded && (
                        <div className="pt-2 border-t border-rose-500/20 grid grid-cols-2 gap-2 text-xs animate-in fade-in duration-200">
                          <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                            <span className="text-[9px] text-slate-400 uppercase block">Margen Faltante</span>
                            <span className="text-rose-400 font-bold">{tripPlan.safetyMarginKm} km</span>
                          </div>
                          <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                            <span className="text-[9px] text-slate-400 uppercase block">Consumo Estimado</span>
                            <span className="text-cyan-300 font-bold">{totalConsumptionKwh.toFixed(1)} kWh</span>
                          </div>
                          <div className="col-span-2 text-[10.5px] text-rose-300/90 italic">
                            La batería no alcanza para completar el recorrido directo sin recargas intermedias. Selecciona o añade una estación de recarga en el mapa o asistente.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="hud-panel p-3 sm:p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 shadow-hud flex flex-col gap-2.5 font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-emerald-400 text-base shrink-0">🛡️</span>
                        <div className="truncate">
                          <span className="text-emerald-300 font-bold text-xs uppercase tracking-wider">Trayecto Directo Seguro</span>
                          <p className="text-[10.5px] text-slate-400 truncate">
                            Autonomía suficiente • Llegada con ~{arrivalSocPct}% SoC (~{liveStats?.arrivalRangeKm ?? tripPlan.arrivalRangeKm} km de reserva)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          ~{arrivalSocPct}% SoC
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDirectCardExpanded(prev => !prev)}
                          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition cursor-pointer shrink-0"
                          title={isDirectCardExpanded ? "Ocultar detalles de llegada" : "Ver detalles de llegada"}
                        >
                          {isDirectCardExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Desplegable de Detalles del Trayecto Directo */}
                    {isDirectCardExpanded && (
                      <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-xs animate-in fade-in duration-200">
                        <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 uppercase block">Margen de Seguridad</span>
                          <span className="text-emerald-400 font-bold">+{tripPlan.safetyMarginKm} km</span>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 uppercase block">Consumo Estimado</span>
                          <span className="text-cyan-300 font-bold">{totalConsumptionKwh.toFixed(1)} kWh</span>
                        </div>
                        <div className="col-span-2 text-[10.5px] text-slate-400 italic">
                          Tu batería tiene capacidad suficiente para completar el trayecto sin paradas de carga obligatorias.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )
          )}
        </aside>

        {/* Main Content Column */}
        <div className="flex flex-col gap-6">
          {/* Top Facts Carousel Banner */}
          <EvFactsCarousel />

          {/* Map Container (Promoted to GPU compositor layer for 60fps scrolling) */}
          <div className="h-[500px] overflow-hidden rounded-2xl border border-white/10 relative bg-slate-900 shadow-2xl ring-1 ring-white/5" style={{ transform: 'translateZ(0)' }}>
            {tripPlan && routeChargerIds.size > 0 && (
              <div className="absolute bottom-4 left-4 z-10 bg-slate-950/95 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-4 text-xs font-mono text-slate-300 pointer-events-none shadow-hud" style={{ transform: 'translateZ(0)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30"></span>
                  <span>En ruta</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan ring-2 ring-brand-cyan/30"></span>
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
              onArrival={handleFinishTrip}
            />
          </div>

          {/* Stats below map */}
          {isLoadingPlan ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 h-48 hud-panel rounded-2xl border border-white/10 animate-pulse" />
              <div className="md:col-span-2 h-48 hud-panel rounded-2xl border border-white/10 animate-pulse" />
            </div>
          ) : tripPlan ? (
            <div className="flex flex-col gap-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: RouteDistanceCard + Cargadores en Ruta underneath */}
                <div className="md:col-span-1 flex flex-col gap-5">
                  <RouteDistanceCard
                    distanceKm={routeDistanceKm}
                    durationMin={routeDurationMin}
                    totalConsumptionKwh={totalConsumptionKwh}
                    arrivalSoc={liveStats?.arrivalSoc ?? tripPlan.arrivalSoc}
                    arrivalRangeKm={liveStats?.arrivalRangeKm ?? tripPlan.arrivalRangeKm}
                    safetyMarginKm={liveStats?.safetyMarginKm ?? tripPlan.safetyMarginKm}
                    advisorFeedback={tripPlan.advisorFeedback}
                  />

                  {/* Cargadores en Ruta ubicados debajo de la información del trayecto */}
                  <div className="hud-panel p-4 rounded-2xl border border-white/10 shadow-hud flex flex-col gap-3">
                    <div className="flex flex-col gap-2 pb-2.5 border-b border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-brand-cyan/15 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan shrink-0">
                            <Zap size={13} />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white flex items-center gap-1.5">
                            <span>
                              {hoveredSegment !== null
                                ? '🎯 Cargadores en Tramo'
                                : activeSegment
                                  ? '🚗 Cargadores en Tramo'
                                  : 'Cargadores en Ruta'}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 rounded-md">
                              {displayedRouteChargers.length} {displayedRouteChargers.length === 1 ? 'Estación' : 'Estaciones'}
                            </span>
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsRouteChargersExpanded(prev => !prev)}
                          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition cursor-pointer shrink-0"
                          title={isRouteChargersExpanded ? "Ocultar lista de cargadores" : "Ver lista de cargadores"}
                        >
                          {isRouteChargersExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {/* Contextual Status Sub-bar */}
                      <div className="flex items-center justify-between text-[11px] font-mono bg-[#050c15] px-2.5 py-1.5 rounded-xl border border-white/5">
                        {activeSegment ? (
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${hoveredSegment !== null ? 'bg-amber-400' : 'bg-brand-cyan'}`} />
                                <span className="text-cyan-300 truncate">
                                  {hoveredSegment !== null ? 'Cockpit Táctico: ' : 'Posición Auto: '}
                                  <strong className="text-white">{activeSegment.title}</strong> ({activeSegment.startKm} - {activeSegment.endKm} km)
                                </span>
                              </div>
                              {hoveredSegment !== null && (
                                <button
                                  type="button"
                                  onClick={() => setHoveredSegment(null)}
                                  className="text-[10px] text-cyan-300 hover:text-white px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 transition shrink-0 cursor-pointer font-bold"
                                  title="Volver al tramo donde se encuentra el vehículo en tiempo real"
                                >
                                  🚗 Tramo Auto
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              <span>
                                Vehículo en <strong className="text-emerald-300">Km {(currentDistance || 0).toFixed(1)}</strong> • Próximos en avance
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Lista desplegable de cargadores */}
                    {isRouteChargersExpanded ? (
                      displayedRouteChargers.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 rounded-xl border border-white/5 border-dashed font-mono text-xs flex flex-col items-center justify-center gap-2 animate-in fade-in duration-200">
                          <span className="font-semibold text-slate-300">
                            Sin estaciones de carga en este tramo
                          </span>
                          <span className="text-[11px] text-slate-500 max-w-xs">
                            {activeSegment 
                              ? `No hay puntos de carga registrados entre el km ${activeSegment.startKm} y km ${activeSegment.endKm}.`
                              : 'No se encontraron cargadores cercanos al trayecto.'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1 animate-in fade-in duration-200">
                          {displayedRouteChargers.map(item => (
                            <ChargerCard 
                              key={item.charger.id} 
                              charger={item.charger} 
                              onNavigateToCharger={handleNavigateToCharger}
                              routeKm={item.routeKm}
                              distanceAheadKm={item.distAhead}
                              isPassed={item.isPassed}
                              isInSelectedSegment={true}
                            />
                          ))}
                        </div>
                      )
                    ) : (
                      displayedRouteChargers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsRouteChargersExpanded(true)}
                          className="w-full py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-brand-cyan/30 text-slate-400 hover:text-cyan-300 text-xs font-mono flex items-center justify-between transition cursor-pointer group"
                        >
                          <span className="text-[11px]">Ver {displayedRouteChargers.length} {displayedRouteChargers.length === 1 ? 'estación' : 'estaciones'} en este tramo...</span>
                          <span className="text-[10px] text-brand-cyan group-hover:underline flex items-center gap-1 font-bold">
                            Desplegar <ChevronDown size={12} />
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Right Column: Tactical EV Cockpit & Elevation Profile */}
                <div className="md:col-span-2">
                  <ElevationProfile 
                    data={tripPlan.elevation} 
                    totalDistanceKm={routeDistanceKm} 
                    segmentTips={tripPlan.advisorFeedback.segmentTips} 
                    hoveredSegment={hoveredSegment}
                    advisorFeedback={tripPlan.advisorFeedback}
                    onSelectSegment={(idx) => setHoveredSegment(idx)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 hud-panel rounded-2xl border border-white/10 border-dashed mb-8">
              <p className="text-slate-400 text-xs font-mono">Ingresa origen y destino para ver el análisis de ruta</p>
            </div>
          )}
        </div>
      </div>

        <footer className="mt-12 py-6 border-t border-white/10 text-center font-mono text-xs text-slate-400">
          <p>&copy; 2026 ChargeWay AI — Powered by SolAI Ecuador</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Contacto: <a href="mailto:chargewayec@gmail.com" className="text-brand-cyan hover:underline">chargewayec@gmail.com</a>
          </p>
        </footer>
      </div>

      {summaryData && (
        <TripSummaryModal
          summaryData={summaryData}
          onClose={() => {
            setSummaryData(null);
            useTripStore.getState().setCurrentDistance(0);
            useTripStore.setState({ 
              accumulatedDistanceKm: 0,
              navigationStartTime: null,
              navigationStartSoc: null,
              speedSamples: []
            } as any);
          }}
          onContinueTrip={() => {
            setSummaryData(null);
            setIsNavigating(true);
            setIsSimulating(false);
          }}
        />
      )}
    </main>
  );
}
