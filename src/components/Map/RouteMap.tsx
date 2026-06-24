'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Charger } from '@/lib/services/charging';
import { ChargerInfoPanel } from './ChargerInfoPanel';
import { Waypoint } from '../Dashboard/RouteSearch';
import { useTripStore } from '@/lib/store/useTripStore';

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
}

export const RouteMap: React.FC<RouteMapProps> = ({ 
  geometry, chargers, routeChargerIds, locations, onChargerClick, onMapClick, onNavigateToCharger, flyTo
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>(null);
  const gpsMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const gpsWatchId = useRef<number | null>(null);
  const simTimerId = useRef<NodeJS.Timeout | null>(null);

  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const lastUserPosition = useRef<{ lng: number; lat: number } | null>(null);

  // Zustand subscriptions for Navigation Zero-Render Logic
  const isNavigating = useTripStore(state => state.isNavigating);
  const isSimulating = useTripStore(state => state.isSimulating);
  const tripPlan = useTripStore(state => state.tripPlan);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-78.5249, -0.1807],
      zoom: 12,
      attributionControl: false
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.on('load', () => setIsMapReady(true));
    map.current.on('click', (e) => {
      setSelectedCharger(null);
      if (onMapClick) onMapClick(e.lngLat.lng, e.lngLat.lat);
    });

    // Detect user navigation actions (drag/pan/zoom) to stop autosteering
    const stopFollowing = () => {
      setIsFollowingUser(false);
    };
    map.current.on('dragstart', stopFollowing);
    map.current.on('zoomstart', stopFollowing);
    map.current.on('pitchstart', stopFollowing);
    map.current.on('rotatestart', stopFollowing);
    map.current.on('touchstart', stopFollowing);
    map.current.on('wheel', stopFollowing);
  }, [onMapClick]);

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

  // Handle Route and static markers
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Clear previous markers
    if (markersRef.current) {
      markersRef.current.forEach(m => m.remove());
    }
    markersRef.current = [];

    if (!geometry) {
      if (map.current.getLayer('route-glow')) map.current.removeLayer('route-glow');
      if (map.current.getLayer('route')) map.current.removeLayer('route');
      if (map.current.getSource('route')) map.current.removeSource('route');
    } else {
      const geom = JSON.parse(geometry);
      // Strip elevation (z) so Mapbox GL renders as 2D line
      const decodedCoords = (geom.coordinates as number[][]).map(c => [c[0], c[1]]);
      const sourceData: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: decodedCoords } };
      
      if (map.current.getSource('route')) {
        (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(sourceData);
      } else {
        map.current.addSource('route', { type: 'geojson', data: sourceData });
        // Glow layer underneath
        map.current.addLayer({
          id: 'route-glow', type: 'line', source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#10b981', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 8 }
        });
        // Main route line
        map.current.addLayer({
          id: 'route', type: 'line', source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.9 }
        });
      }

      if (!isNavigating) {
        const bounds = new mapboxgl.LngLatBounds();
        decodedCoords.forEach((coord: number[]) => bounds.extend(coord as [number, number]));
        map.current.fitBounds(bounds, { padding: 60 });
      }
    }

    // Add waypoint markers (origin, intermediate stops, destination)
    locations.forEach((loc, idx) => {
      if (loc.lat === 0 && loc.lng === 0) return;
      const el = document.createElement('div');
      const isOrigin = idx === 0;
      const isDestination = idx === locations.length - 1;
      const bgColor = isOrigin ? 'bg-emerald-500' : isDestination ? 'bg-rose-500' : 'bg-blue-500';
      const label = isOrigin ? 'A' : isDestination ? 'B' : idx.toString();
      el.className = `w-7 h-7 flex items-center justify-center text-white font-bold text-[11px] rounded-full shadow-lg border-2 border-white z-10 ${bgColor}`;
      el.textContent = label;
      el.style.boxShadow = `0 0 12px ${isOrigin ? 'rgba(16,185,129,0.6)' : isDestination ? 'rgba(244,63,94,0.6)' : 'rgba(59,130,246,0.5)'}`;
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([loc.lng, loc.lat]).addTo(map.current!);
      markersRef.current!.push(marker);
    });

    // Add charger markers:
    //  - Within 5 km of route → ORANGE/AMBER with pulse ("En ruta")
    //  - All others → default TEAL (unchanged)
    chargers.forEach(charger => {
      if (!charger.location) return;
      const isNearRoute = routeChargerIds.has(charger.id);
      const containerEl = document.createElement('div');
      containerEl.className = `cursor-pointer z-[5]`;
      containerEl.style.width = isNearRoute ? '32px' : '28px';
      containerEl.style.height = isNearRoute ? '32px' : '28px';

      const innerEl = document.createElement('div');
      if (isNearRoute) {
        // Near-route chargers: orange with pulsing glow
        innerEl.className = 'w-full h-full rounded-full border-2 border-white flex items-center justify-center text-xs transition-transform duration-200';
        innerEl.style.background = '#f59e0b';
        innerEl.style.boxShadow = '0 0 14px rgba(245,158,11,0.9), 0 0 28px rgba(245,158,11,0.4)';
        innerEl.style.animation = 'pulse 2s ease-in-out infinite';
        innerEl.textContent = '⚡';
      } else {
        // Far chargers: default teal (original color)
        innerEl.className = 'w-full h-full bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(16,185,129,0.8)] flex items-center justify-center text-xs transition-transform duration-200';
        innerEl.textContent = '⚡';
      }
      containerEl.appendChild(innerEl);

      const marker = new mapboxgl.Marker({ element: containerEl, anchor: 'center' }).setLngLat([charger.location.lng, charger.location.lat]).addTo(map.current!);
      containerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedCharger(charger);
        if (onChargerClick) onChargerClick(charger);
        map.current?.easeTo({ center: [charger.location.lng, charger.location.lat], zoom: 14 });
      });
      markersRef.current!.push(marker);
    });
  }, [geometry, locations, chargers, routeChargerIds, isMapReady, onChargerClick, isNavigating]);

  const isFollowingUserRef = useRef(isFollowingUser);
  useEffect(() => {
    isFollowingUserRef.current = isFollowingUser;
  }, [isFollowingUser]);

  // Phase 2: GPS Zero-Render Logic
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const updateGpsMarker = (lng: number, lat: number) => {
      lastUserPosition.current = { lng, lat };
      if (!gpsMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'w-6 h-6 bg-blue-500 border-[3px] border-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.9)] z-20';
        gpsMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map.current!);
      } else {
        gpsMarkerRef.current.setLngLat([lng, lat]);
      }
      
      // Auto-recenter map only if user follow toggle is active
      if (isFollowingUserRef.current) {
        map.current?.easeTo({ center: [lng, lat], zoom: 15, duration: 800 });
      }
    };

    if (isNavigating) {
      if (isSimulating && tripPlan?.route?.geometry) {
        if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);
        const geom = JSON.parse(tripPlan.route.geometry);
        const coords = (geom.coordinates as number[][]).map(c => [c[0], c[1]]);
        let step = 0;
        simTimerId.current = setInterval(() => {
          if (step < coords.length) {
            updateGpsMarker(coords[step][0], coords[step][1]);
            step++;
          } else {
            clearInterval(simTimerId.current!);
            useTripStore.setState({ isNavigating: false, isSimulating: false });
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
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.remove();
        gpsMarkerRef.current = null;
      }
      lastUserPosition.current = null;
    }

    return () => {
      if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);
      if (simTimerId.current) clearInterval(simTimerId.current);
    };
  }, [isNavigating, isSimulating, isMapReady, tripPlan]);

  const handleRecenter = () => {
    setIsFollowingUser(true);
    if (lastUserPosition.current && map.current) {
      map.current.easeTo({
        center: [lastUserPosition.current.lng, lastUserPosition.current.lat],
        zoom: 15,
        duration: 1000
      });
    } else if (navigator.geolocation && map.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          lastUserPosition.current = { lng, lat };
          map.current?.easeTo({ center: [lng, lat], zoom: 15, duration: 1000 });
        },
        console.error,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Floating Centering Button */}
      <button
        onClick={handleRecenter}
        className={`absolute bottom-16 right-4 z-[10] p-3 rounded-full border shadow-lg transition-all duration-300 flex items-center justify-center hover:scale-105 cursor-pointer ${
          isFollowingUser 
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            : 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:text-white'
        }`}
        title="Centrar ubicación actual"
        style={{ width: '48px', height: '48px' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      </button>

      <ChargerInfoPanel charger={selectedCharger} onClose={() => setSelectedCharger(null)} onNavigateToCharger={onNavigateToCharger} />
    </>
  );
};

