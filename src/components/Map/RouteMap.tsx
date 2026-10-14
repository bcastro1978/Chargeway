'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { Charger } from '@/lib/services/charging';
import { ChargerInfoPanel } from './ChargerInfoPanel';
import { Waypoint } from '../Dashboard/RouteSearch';
import { useTripStore } from '@/lib/store/useTripStore';
import { RealtimeTripHUD } from '../Dashboard/RealtimeTripHUD';
import { getDecodedRouteCoordinates } from '@/lib/utils/route-geometry';


mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface RouteMapProps {
  geometry?: string;
  chargers: Charger[];
  routeChargerIds: Set<string>; // chargers within 5 km of the active route
  locations: Waypoint[];
  onChargerClick?: (charger: Charger) => void;
  onMapClick?: (lng: number, lat: number) => void;
  onNavigateToCharger?: (charger: Charger) => void;
  flyTo?: { lat: number; lng: number } | null;
  onArrival?: () => void;
}

const RouteMapComponent: React.FC<RouteMapProps> = ({ 
  geometry, chargers, routeChargerIds, locations, onChargerClick, onMapClick, onNavigateToCharger, flyTo, onArrival
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const chargerMarkersMapRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const waypointMarkersMapRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const gpsMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const gpsWatchId = useRef<number | null>(null);
  const simTimerId = useRef<NodeJS.Timeout | null>(null);

  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const isFollowingUserRef = useRef(true);
  isFollowingUserRef.current = isFollowingUser;
  const lastUserPosition = useRef<{ lng: number; lat: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const lastSlicedDistRef = useRef<number>(-1);
  const routeGeomCacheRef = useRef<{
    geometryStr: string;
    decodedCoords: number[][];
    fullLine: any;
    startPoint: any;
    endPoint: any;
    totalDistKm: number;
  } | null>(null);

  // Stable callback refs to avoid recreating markers on parent re-renders
  const onChargerClickRef = useRef(onChargerClick);
  onChargerClickRef.current = onChargerClick;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const isNavigating = useTripStore(state => state.isNavigating);
  const isSimulating = useTripStore(state => state.isSimulating);
  const selectedVehicle = useTripStore(state => state.selectedVehicle);
  const tripPlan = useTripStore(state => state.tripPlan);
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;
  const offRouteCountRef = useRef<number>(0);
  const lastRerouteTimeRef = useRef<number>(0);

  const updateMarkerElement = useCallback((el: HTMLElement, photoUrl: string | undefined) => {
    const currentPhoto = el.dataset.photoUrl;
    if (currentPhoto === (photoUrl || 'none') && el.children.length > 0) {
      return;
    }
    el.dataset.photoUrl = photoUrl || 'none';

    el.innerHTML = `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        <!-- Pulsing radar wave 1 -->
        <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: userRadarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
        <!-- Pulsing radar wave 2 -->
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); animation: userRadarPulse 2s ease-in-out infinite; pointer-events: none;"></div>
        
        <!-- Core Marker Badge -->
        <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid #10b981; background: #090d16; box-shadow: 0 0 18px rgba(16,185,129,0.95); display: flex; align-items: center; justify-content: center; overflow: hidden; z-index: 10;">
          ${photoUrl 
            ? `<img src="${photoUrl}" alt="Vehículo" style="width: 100%; height: 100%; object-fit: cover;" />`
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
                 <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                 <circle cx="7" cy="17" r="2"/>
                 <path d="M9 17h6"/>
                 <circle cx="17" cy="17" r="2"/>
               </svg>`
          }
        </div>
        <!-- Live GPS beacon dot -->
        <div style="position: absolute; bottom: 2px; right: 2px; width: 11px; height: 11px; border-radius: 50%; background: #34d399; border: 2px solid #090d16; z-index: 11; box-shadow: 0 0 10px #10b981;"></div>
      </div>
    `;
  }, []);

  const updateUserLocationMarker = useCallback((lng: number, lat: number) => {
    if (!map.current) return;
    lastUserPosition.current = { lng, lat };
    const vehicle = useTripStore.getState().selectedVehicle;
    const photoUrl = vehicle?.photoUrl;
    const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model} (Mi Ubicación)` : 'Mi Ubicación Actual';

    if (!gpsMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-location-marker relative flex items-center justify-center cursor-pointer';
      el.style.width = '48px';
      el.style.height = '48px';
      el.style.zIndex = '35';
      updateMarkerElement(el, photoUrl);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`<div style="font-weight:700; font-size:12px; color:#10b981; text-align:center; padding:3px 8px; font-family:sans-serif;">📍 ${vehicleLabel}</div>`);

      gpsMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);
    } else {
      const el = gpsMarkerRef.current.getElement();
      updateMarkerElement(el, photoUrl);
      gpsMarkerRef.current.setLngLat([lng, lat]);
      if (!el.parentElement && map.current) {
        gpsMarkerRef.current.addTo(map.current);
      }
      const popup = gpsMarkerRef.current.getPopup();
      if (popup) {
        popup.setHTML(`<div style="font-weight:700; font-size:12px; color:#10b981; text-align:center; padding:3px 8px; font-family:sans-serif;">📍 ${vehicleLabel}</div>`);
      }
    }
  }, [updateMarkerElement]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-78.5249, -0.1807],
      zoom: 12,
      attributionControl: false,
      cooperativeGestures: true
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.on('load', () => {
      setIsMapReady(true);
      map.current?.resize();

      const placeUserMarker = (lng: number, lat: number, shouldEase = true) => {
        updateUserLocationMarker(lng, lat);
        if (shouldEase && !geometryRef.current && map.current) {
          map.current.easeTo({ center: [lng, lat], zoom: 14, duration: 800, essential: true });
        }
      };

      // 1. Mostrar de inmediato la última ubicación conocida o la posición predeterminada en Ecuador
      if (lastUserPosition.current) {
        placeUserMarker(lastUserPosition.current.lng, lastUserPosition.current.lat, true);
      } else {
        placeUserMarker(-78.4678, -0.1807, true);
      }

      // 2. Consultar al GPS del navegador para actualizar con la ubicación exacta real
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            placeUserMarker(pos.coords.longitude, pos.coords.latitude, true);
          },
          (err) => {
            console.warn('Geolocalización inicial:', err.message);
            if (!lastUserPosition.current) {
              placeUserMarker(-78.4678, -0.1807, false);
            }
          },
          { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
        );
      }
    });

    const handleWindowResize = () => {
      map.current?.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    map.current.on('click', (e) => {
      setSelectedCharger(null);
      if (onMapClickRef.current) onMapClickRef.current(e.lngLat.lng, e.lngLat.lat);
    });

    // Detect user navigation actions (drag/pan/zoom) to stop autosteering
    const stopFollowing = (e: any) => {
      if (e && e.originalEvent) {
        setIsFollowingUser(false);
      }
    };
    map.current.on('dragstart', () => setIsFollowingUser(false));
    map.current.on('zoomstart', stopFollowing);
    map.current.on('pitchstart', stopFollowing);
    map.current.on('rotatestart', stopFollowing);
    map.current.on('touchstart', stopFollowing);
    map.current.on('wheel', stopFollowing);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [updateUserLocationMarker]);

  useEffect(() => {
    if (!map.current || !isMapReady || !flyTo) return;
    map.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 14, duration: 1500, essential: true });
  }, [flyTo, isMapReady]);

  // Reset follow user state when starting/stopping navigation
  useEffect(() => {
    if (isNavigating) {
      setIsFollowingUser(true);
    }
  }, [isNavigating]);

  // Actualizar el pin en el mapa cuando cambie el vehículo seleccionado
  useEffect(() => {
    if (lastUserPosition.current && isMapReady) {
      updateUserLocationMarker(lastUserPosition.current.lng, lastUserPosition.current.lat);
    }
  }, [selectedVehicle, isMapReady, updateUserLocationMarker]);

  // Handle Route and static markers
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const validLocations = locations.filter(loc => loc.lat !== 0 && loc.lng !== 0 && loc.name && loc.name.trim() !== '');

    if (!geometry) {
      if (map.current.getLayer('route-glow')) map.current.removeLayer('route-glow');
      if (map.current.getLayer('route-remaining')) map.current.removeLayer('route-remaining');
      if (map.current.getLayer('route-completed')) map.current.removeLayer('route-completed');
      if (map.current.getSource('route-remaining')) map.current.removeSource('route-remaining');
      if (map.current.getSource('route-completed')) map.current.removeSource('route-completed');

      // Al no tener ningún punto marcado (o al borrar la ruta activa):
      // El pin del usuario debe aparecer obligatoriamente en el mapa y la cámara debe centrarse en él
      if (validLocations.length === 0) {
        const centerAndMarkUser = (lng: number, lat: number) => {
          updateUserLocationMarker(lng, lat);
          if (map.current) {
            map.current.easeTo({ center: [lng, lat], zoom: 14, duration: 800, essential: true });
          }
        };

        if (lastUserPosition.current) {
          centerAndMarkUser(lastUserPosition.current.lng, lastUserPosition.current.lat);
        } else {
          centerAndMarkUser(-78.4678, -0.1807);
        }

        if (typeof window !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              centerAndMarkUser(pos.coords.longitude, pos.coords.latitude);
            },
            (err) => {
              console.warn('Geolocalización GPS al no haber ruta marcada:', err.message);
            },
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
          );
        }
      }
    } else {
      const decodedCoords = getDecodedRouteCoordinates(geometry);
      const fullLine = turf.lineString(decodedCoords.length > 0 ? decodedCoords : [[0, 0], [0.001, 0.001]]);
      
      // Initially, remaining is the full line, completed is empty
      const remainingData: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: decodedCoords } };
      const completedData: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } };
      
      if (map.current.getSource('route-remaining')) {
        (map.current.getSource('route-remaining') as mapboxgl.GeoJSONSource).setData(remainingData);
        (map.current.getSource('route-completed') as mapboxgl.GeoJSONSource).setData(completedData);
      } else {
        map.current.addSource('route-completed', { type: 'geojson', data: completedData });
        map.current.addSource('route-remaining', { type: 'geojson', lineMetrics: true, data: remainingData });
        
        // Completed route (gray)
        map.current.addLayer({
          id: 'route-completed', type: 'line', source: 'route-completed',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#9ca3af', 'line-width': 5, 'line-opacity': 0.6 }
        });

        // Glow layer for remaining
        map.current.addLayer({
          id: 'route-glow', type: 'line', source: 'route-remaining',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#10b981', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 8 }
        });
        
        // Main remaining route line with elevation & regeneration gradient
        map.current.addLayer({
          id: 'route-remaining', type: 'line', source: 'route-remaining',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-width': 5.5,
            'line-opacity': 0.95,
            'line-gradient': [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0, '#10b981',      // Verde Esmeralda (Salida / Regeneración inicial)
              0.25, '#06b6d4',   // Cian (Crucero plano)
              0.55, '#3b82f6',   // Azul eléctrico
              0.8, '#f59e0b',    // Ámbar (Subida andina / mayor consumo)
              0.92, '#10b981',   // Verde (Descenso / frenado regenerativo)
              1, '#10b981'       // Verde (Llegada a destino)
            ]
          }
        });
      }

      // Fit bounds only when not navigating and not dragging
      if (!isNavigating) {
        const bounds = new mapboxgl.LngLatBounds();
        decodedCoords.forEach((coord: number[]) => bounds.extend(coord as [number, number]));
        map.current.fitBounds(bounds, { padding: 60 });
      }
    }

    // 1. Waypoint markers diffing (re-uses existing DOM elements instead of recreating them)
    const activeWpKeys = new Set<string>();

    validLocations.forEach((loc, idx) => {
      if (idx === 0 && (loc.id === 'current-loc' || loc.id?.startsWith('current-') || loc.name.toLowerCase().includes('mi ubicación'))) {
        updateUserLocationMarker(loc.lng, loc.lat);
      }
      const key = `${loc.id || 'wp'}_${idx}_${loc.lat.toFixed(4)}_${loc.lng.toFixed(4)}`;
      activeWpKeys.add(key);

      if (!waypointMarkersMapRef.current.has(key)) {
        const el = document.createElement('div');
        const isOrigin = idx === 0;
        const isDestination = idx === validLocations.length - 1;
        const bgColor = isOrigin ? 'bg-emerald-500' : isDestination ? 'bg-rose-500' : 'bg-blue-500';
        const label = isOrigin ? 'A' : isDestination ? 'B' : idx.toString();
        el.className = `w-7 h-7 flex items-center justify-center text-white font-bold text-[11px] rounded-full shadow-lg border-2 border-white z-10 ${bgColor}`;
        el.textContent = label;
        el.style.boxShadow = `0 0 12px ${isOrigin ? 'rgba(16,185,129,0.6)' : isDestination ? 'rgba(244,63,94,0.6)' : 'rgba(59,130,246,0.5)'}`;
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([loc.lng, loc.lat]).addTo(map.current!);
        waypointMarkersMapRef.current.set(key, marker);
      }
    });

    waypointMarkersMapRef.current.forEach((marker, key) => {
      if (!activeWpKeys.has(key)) {
        marker.remove();
        waypointMarkersMapRef.current.delete(key);
      }
    });

    // 2. Charger markers diffing:
    // When a route is active, render corridor chargers to prevent flooding DOM
    const visibleChargers = (geometry && routeChargerIds.size > 0)
      ? chargers.filter(c => routeChargerIds.has(c.id))
      : chargers;

    const activeChargerIds = new Set<string>();

    visibleChargers.forEach(charger => {
      if (!charger.location) return;
      activeChargerIds.add(charger.id);

      if (!chargerMarkersMapRef.current.has(charger.id)) {
        const isNearRoute = routeChargerIds.has(charger.id);
        const containerEl = document.createElement('div');
        containerEl.className = 'cursor-pointer z-[5]';
        containerEl.style.width = isNearRoute ? '32px' : '26px';
        containerEl.style.height = isNearRoute ? '32px' : '26px';
        containerEl.style.willChange = 'transform';
        containerEl.style.contain = 'layout style';

        const innerEl = document.createElement('div');
        if (isNearRoute) {
          innerEl.className = 'w-full h-full rounded-full border-2 border-white flex items-center justify-center text-xs font-bold';
          innerEl.style.background = '#f59e0b';
          innerEl.style.boxShadow = '0 0 10px rgba(245,158,11,0.85)';
          innerEl.textContent = '⚡';
        } else {
          innerEl.className = 'w-full h-full bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(16,185,129,0.7)] flex items-center justify-center text-xs font-bold text-white';
          innerEl.textContent = '⚡';
        }
        containerEl.appendChild(innerEl);

        const marker = new mapboxgl.Marker({ element: containerEl, anchor: 'center' }).setLngLat([charger.location.lng, charger.location.lat]).addTo(map.current!);
        containerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedCharger(charger);
          if (onChargerClickRef.current) onChargerClickRef.current(charger);
          map.current?.easeTo({ center: [charger.location.lng, charger.location.lat], zoom: 14 });
        });

        chargerMarkersMapRef.current.set(charger.id, marker);
      }
    });

    chargerMarkersMapRef.current.forEach((marker, id) => {
      if (!activeChargerIds.has(id)) {
        marker.remove();
        chargerMarkersMapRef.current.delete(id);
      }
    });
  }, [geometry, locations, chargers, routeChargerIds, isMapReady]);

  // Phase 2: GPS Zero-Render Logic with Cached Route Geometry
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Cache parsed route geometry once to prevent JSON.parse and Turf construction on every GPS tick
    if (tripPlan?.route?.geometry) {
      if (!routeGeomCacheRef.current || routeGeomCacheRef.current.geometryStr !== tripPlan.route.geometry) {
        try {
          const decodedCoords = getDecodedRouteCoordinates(tripPlan.route.geometry);
          const fullLine = turf.lineString(decodedCoords);
          const totalDistKm = (tripPlan.route.distance || 0) / 1000;
          routeGeomCacheRef.current = {
            geometryStr: tripPlan.route.geometry,
            decodedCoords,
            fullLine,
            startPoint: turf.point(decodedCoords[0]),
            endPoint: turf.point(decodedCoords[decodedCoords.length - 1]),
            totalDistKm
          };
        } catch {
          routeGeomCacheRef.current = null;
        }
      }
    } else {
      routeGeomCacheRef.current = null;
    }

    const setCurrentDistance = useTripStore.getState().setCurrentDistance;

    const updateGpsMarker = (lng: number, lat: number, overrideDistanceKm?: number) => {
      updateUserLocationMarker(lng, lat);
      
      // Auto-recenter map with smooth 350ms transition
      if (isFollowingUserRef.current) {
        map.current?.easeTo({ center: [lng, lat], zoom: 15, duration: 350, essential: true });
      }

      // Visual Tracking: Slice the route based on current position using cached geometry
      const cached = routeGeomCacheRef.current;
      if (cached && map.current?.getSource('route-remaining')) {
        try {
          const { fullLine, decodedCoords, startPoint, endPoint, totalDistKm } = cached;
          const currentPoint = turf.point([lng, lat]);
          
          let distanceToPoint: number;
          let snapped: any;

          if (overrideDistanceKm !== undefined) {
            distanceToPoint = Math.min(totalDistKm, Math.max(0, overrideDistanceKm));
            snapped = turf.along(fullLine, distanceToPoint, { units: 'kilometers' });
          } else {
            // Anti-teleportation windowed search:
            const prevDistance = useTripStore.getState().currentDistance || 0;
            const searchStartKm = Math.max(0, prevDistance - 1.0);
            const searchEndKm = Math.min(totalDistKm, prevDistance < 1.0 ? Math.min(totalDistKm, 8.0) : prevDistance + 5.0);

            if (searchEndKm > searchStartKm + 0.05 && totalDistKm > 0.5) {
              const searchSlice = turf.lineSliceAlong(fullLine, searchStartKm, searchEndKm, { units: 'kilometers' });
              const snappedLocal = turf.nearestPointOnLine(searchSlice, currentPoint);
              distanceToPoint = Math.min(totalDistKm, searchStartKm + (snappedLocal.properties.location || 0));
              snapped = snappedLocal;
            } else {
              snapped = turf.nearestPointOnLine(fullLine, currentPoint);
              distanceToPoint = snapped.properties.location || 0;
            }
          }

          setCurrentDistance(Math.round(distanceToPoint * 10) / 10);

          // Physical distance in meters between current GPS location and closest point on the route
          const deviationKm = turf.distance(currentPoint, snapped, { units: 'kilometers' });
          const deviationMeters = deviationKm * 1000;
          const remainingDistKm = Math.max(0, totalDistKm - distanceToPoint);

          // Automatic rerouting: trigger when user deviates > 60 meters from route (2 consecutive readings)
          if (isNavigating && remainingDistKm > 0.08) {
            if (deviationMeters > 60) {
              offRouteCountRef.current += 1;
              if (offRouteCountRef.current >= 2) {
                const now = Date.now();
                if (!useTripStore.getState().isRerouting && (now - lastRerouteTimeRef.current > 7000)) {
                  lastRerouteTimeRef.current = now;
                  offRouteCountRef.current = 0;
                  useTripStore.getState().recalculateRoute({ lat, lng });
                }
              }
            } else {
              offRouteCountRef.current = 0;
            }
          }

          // Automatic arrival detection: vehicle must have actually completed the route
          const distToEndKm = turf.distance(currentPoint, endPoint, { units: 'kilometers' });
          const hasTraversedRoute = totalDistKm > 1.0
            ? (distanceToPoint >= totalDistKm * 0.95 || (distanceToPoint >= totalDistKm * 0.90 && (distToEndKm <= 0.08 || remainingDistKm <= 0.08)))
            : (distanceToPoint >= totalDistKm * 0.8 && distToEndKm <= 0.05);

          if (isNavigating && hasTraversedRoute) {
            onArrival?.();
          }
          
          // Optimize: only re-slice GeoJSON when vehicle moves at least 100 meters to eliminate WebGL buffer thrashing
          const shouldSlice = Math.abs(distanceToPoint - lastSlicedDistRef.current) >= 0.100 || lastSlicedDistRef.current < 0;
          if (shouldSlice) {
            lastSlicedDistRef.current = distanceToPoint;
            let completedGeom: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } };
            let remainingGeom: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: decodedCoords } };
            
            if (distanceToPoint > 0.05) { // If moved more than 50 meters
              completedGeom = turf.lineSlice(startPoint, snapped, fullLine);
              remainingGeom = turf.lineSlice(snapped, endPoint, fullLine);
            }

            (map.current.getSource('route-completed') as mapboxgl.GeoJSONSource).setData(completedGeom);
            (map.current.getSource('route-remaining') as mapboxgl.GeoJSONSource).setData(remainingGeom);
          }
        } catch (e) {
          console.warn('Error slicing route line:', e);
        }
      }
    };

    if (isNavigating) {
      if (isSimulating && routeGeomCacheRef.current) {
        if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);
        const { fullLine, totalDistKm } = routeGeomCacheRef.current;

        // Start simulation from exact current distance along the route
        let simDistKm = useTripStore.getState().currentDistance || 0;

        simTimerId.current = setInterval(() => {
          const currentSpeed = useTripStore.getState().simulatedSpeedKmH || 70;
          (useTripStore.getState() as any).recordSpeedSample(currentSpeed);
          // Distance in km covered per second: speed_kmh / 3600
          const stepKm = Math.max(0.005, currentSpeed / 3600);
          simDistKm = Math.min(totalDistKm, simDistKm + stepKm);

          const targetPoint = turf.along(fullLine, simDistKm, { units: 'kilometers' });
          const [lng, lat] = targetPoint.geometry.coordinates;

          updateGpsMarker(lng, lat, simDistKm);

          if (simDistKm >= totalDistKm) {
            clearInterval(simTimerId.current!);
            useTripStore.setState({ isNavigating: false, isSimulating: false });
            onArrival?.();
          }
        }, 1000);
      } else if (!isSimulating && navigator.geolocation) {
        if (simTimerId.current) clearInterval(simTimerId.current);
        gpsWatchId.current = navigator.geolocation.watchPosition(
          pos => updateGpsMarker(pos.coords.longitude, pos.coords.latitude),
          console.error,
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    } else {
      if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);
      if (simTimerId.current) clearInterval(simTimerId.current);
      
      const currentDist = useTripStore.getState().currentDistance;
      if (currentDist > 0 && tripPlan?.route?.geometry) {
        // Keep vehicle marker positioned at exact current distance while paused
        try {
          const coords = getDecodedRouteCoordinates(tripPlan.route.geometry);
          const fullLine = turf.lineString(coords.length > 0 ? coords : [[0, 0], [0.001, 0.001]]);
          const pt = turf.along(fullLine, Math.min(tripPlan.route.distance / 1000, currentDist), { units: 'kilometers' });
          const [lng, lat] = pt.geometry.coordinates;
          updateGpsMarker(lng, lat, currentDist);
        } catch (_) {}
      } else if (lastUserPosition.current) {
        // Keep user location pin visible at last known position
        updateUserLocationMarker(lastUserPosition.current.lng, lastUserPosition.current.lat);
      }
    }

    return () => {
      if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);
      if (simTimerId.current) clearInterval(simTimerId.current);
    };
  }, [isNavigating, isSimulating, isMapReady, tripPlan, updateUserLocationMarker]);

  const handleRecenter = () => {
    setIsFollowingUser(true);

    // 1. Inmediatamente enfocar y mostrar marcador en la última posición conocida
    if (lastUserPosition.current && map.current) {
      updateUserLocationMarker(lastUserPosition.current.lng, lastUserPosition.current.lat);
      map.current.easeTo({
        center: [lastUserPosition.current.lng, lastUserPosition.current.lat],
        zoom: 15,
        duration: 800
      });
    }

    // 2. Solicitar posición GPS precisa al navegador
    if (typeof window !== 'undefined' && navigator.geolocation && map.current) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          updateUserLocationMarker(lng, lat);
          map.current?.easeTo({ center: [lng, lat], zoom: 15, duration: 1000 });
        },
        (err) => {
          console.warn('GPS alta precisión demoró o falló, reintentando con red:', err);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setIsLocating(false);
              const lng = pos.coords.longitude;
              const lat = pos.coords.latitude;
              updateUserLocationMarker(lng, lat);
              map.current?.easeTo({ center: [lng, lat], zoom: 15, duration: 1000 });
            },
            (fallbackErr) => {
              setIsLocating(false);
              console.error('Error de geolocalización:', fallbackErr);
              if (!lastUserPosition.current) {
                alert('No se pudo acceder a tu ubicación. Por favor habilita los permisos de GPS en tu navegador.');
              }
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    }
  };

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Mini Leyenda de Gradiente de Ruta */}
      {geometry && (
        <div className="absolute bottom-4 left-4 z-[10] bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-3 text-[11px] font-mono text-slate-300 pointer-events-none shadow-hud">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30"></span>
            <span>Regeneración</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30"></span>
            <span>Crucero</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30"></span>
            <span>Subida</span>
          </div>
        </div>
      )}
      
      {/* Floating Centering Button */}
      <button
        onClick={handleRecenter}
        disabled={isLocating}
        className={`absolute bottom-16 right-4 z-[10] p-3 rounded-full border shadow-lg transition-all duration-300 flex items-center justify-center hover:scale-105 cursor-pointer ${
          isFollowingUser 
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            : 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:text-white'
        }`}
        title="Centrar mi ubicación"
        style={{ width: '48px', height: '48px' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isLocating ? 'animate-spin text-emerald-300' : ''}`}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      </button>

      <ChargerInfoPanel charger={selectedCharger} onClose={() => setSelectedCharger(null)} onNavigateToCharger={onNavigateToCharger} />
      <RealtimeTripHUD />
    </>
  );
};

export const RouteMap = React.memo(RouteMapComponent, (prev, next) => {
  if (prev.geometry !== next.geometry) return false;
  if (prev.flyTo?.lat !== next.flyTo?.lat || prev.flyTo?.lng !== next.flyTo?.lng) return false;
  if (prev.locations.length !== next.locations.length) return false;
  const locsChanged = prev.locations.some(
    (l, i) => l.lat !== next.locations[i]?.lat || l.lng !== next.locations[i]?.lng || l.name !== next.locations[i]?.name
  );
  if (locsChanged) return false;
  if (prev.chargers.length !== next.chargers.length) return false;
  if (prev.routeChargerIds.size !== next.routeChargerIds.size) return false;
  return true;
});

