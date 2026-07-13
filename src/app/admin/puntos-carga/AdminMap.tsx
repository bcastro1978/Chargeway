'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ChargingStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface AdminMapProps {
  stations: ChargingStation[];
  onStationClick?: (station: ChargingStation) => void;
}

export const AdminMap: React.FC<AdminMapProps> = ({ stations, onStationClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-78.1834, -1.8312], // Ecuador center
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
    };
  }, []);

  // Update markers when stations change
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    stations.forEach(station => {
      if (!station.lat || !station.lng) return;

      const el = document.createElement('div');
      el.className = 'w-4 h-4 bg-emerald-500 rounded-full border-2 border-black cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([station.lng, station.lat])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        if (onStationClick) {
          onStationClick(station);
        }
      });

      markersRef.current.push(marker);
    });
  }, [stations, onStationClick]);

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-white/10 relative">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};
