'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Charger } from '@/lib/services/charging';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export interface TripRoute {
  id: string;
  vehicle_model: string;
  dayOfWeek: string;
  origin_name: string;
  destination_name: string;
  geometry: string; // Stringified GeoJSON
}

interface DemandMapProps {
  trips: TripRoute[];
  chargers: Charger[];
}

export const DemandMap: React.FC<DemandMapProps> = ({ trips, chargers }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-78.5249, -0.1807],
      zoom: 6,
      attributionControl: false
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.on('load', () => setIsMapReady(true));
  }, []);

  // Update Routes
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Clear previous routes if any
    const existingLayers = map.current.getStyle()?.layers || [];
    existingLayers.forEach(layer => {
      if (layer.id.startsWith('trip-route-')) {
        map.current?.removeLayer(layer.id);
      }
    });
    const existingSources = map.current.getStyle()?.sources || {};
    Object.keys(existingSources).forEach(source => {
      if (source.startsWith('trip-source-')) {
        map.current?.removeSource(source);
      }
    });

    // Add new routes
    trips.forEach((trip, idx) => {
      if (!trip.geometry) return;
      try {
        const geom = JSON.parse(trip.geometry);
        const sourceId = `trip-source-${idx}`;
        const layerId = `trip-route-${idx}`;

        const decodedCoords = (geom.coordinates as number[][]).map(c => [c[0], c[1]]);
        const sourceData: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: decodedCoords } };
        
        map.current!.addSource(sourceId, { type: 'geojson', data: sourceData });
        
        // Add layer with a heatmap-like opacity so overlapping routes become brighter
        map.current!.addLayer({
          id: layerId, 
          type: 'line', 
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 
            'line-color': '#10b981', 
            'line-width': 4, 
            'line-opacity': 0.3 
          }
        });
      } catch (e) {
        // Skip invalid geometries
      }
    });

  }, [trips, isMapReady]);

  // Update Chargers
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    chargers.forEach(charger => {
      if (!charger.location && !charger.lat) return;
      const lat = charger.location?.lat || charger.lat;
      const lng = charger.location?.lng || charger.lng;
      
      const containerEl = document.createElement('div');
      containerEl.className = 'w-4 h-4 bg-blue-500 rounded-full border border-white shadow-[0_0_8px_rgba(59,130,246,0.8)] cursor-pointer';
      containerEl.title = charger.nombre || charger.name || 'Cargador';

      const marker = new mapboxgl.Marker({ element: containerEl, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current!);
      markersRef.current.push(marker);
    });
  }, [chargers, isMapReady]);

  return (
    <div className="w-full h-[600px] relative rounded-xl overflow-hidden border border-neutral-800">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-neutral-950/80 backdrop-blur border border-neutral-800 rounded-lg p-3 z-10 text-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-500"></div>
          <span className="text-neutral-300">Rutas Transitadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
          <span className="text-neutral-300">Electrolineras Actuales</span>
        </div>
      </div>
    </div>
  );
};
