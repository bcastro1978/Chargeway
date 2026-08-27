'use client';

import { useEffect, useRef, useState } from 'react';
import { useTripStore } from '@/lib/store/useTripStore';

interface GPSPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useRealtimeSpeed(isNavigating: boolean, isSimulating: boolean) {
  const [speedKmH, setSpeedKmH] = useState<number>(0);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const prevPosRef = useRef<GPSPosition | null>(null);
  const speedHistoryRef = useRef<number[]>([]);

  const setRealtimeSpeedInStore = useTripStore(state => state.setRealtimeSpeed);
  const simulatedSpeed = useTripStore(state => state.simulatedSpeedKmH);

  useEffect(() => {
    if (!isNavigating) {
      setSpeedKmH(0);
      setIsGpsActive(false);
      setRealtimeSpeedInStore(0);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (isSimulating) {
      // In simulation mode, use the simulated speed setting (default ~70 km/h)
      setSpeedKmH(simulatedSpeed);
      setIsGpsActive(true);
      setRealtimeSpeedInStore(simulatedSpeed);
      return;
    }

    if (!navigator.geolocation) {
      setIsGpsActive(false);
      return;
    }

    setIsGpsActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        let calculatedSpeedKmH = 0;

        // 1. Direct GPS speed (meters per second -> km/h)
        if (pos.coords.speed !== null && pos.coords.speed >= 0) {
          calculatedSpeedKmH = pos.coords.speed * 3.6;
        } else {
          // 2. Fallback: derive speed from delta distance / delta time
          const currentPos: GPSPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: pos.timestamp || Date.now()
          };

          if (prevPosRef.current) {
            const deltaMeters = haversineMeters(
              prevPosRef.current.lat,
              prevPosRef.current.lng,
              currentPos.lat,
              currentPos.lng
            );
            const deltaTimeSec = (currentPos.timestamp - prevPosRef.current.timestamp) / 1000;

            if (deltaTimeSec > 0.5 && deltaMeters > 1) {
              const speedMS = deltaMeters / deltaTimeSec;
              calculatedSpeedKmH = speedMS * 3.6;
            }
          }
          prevPosRef.current = currentPos;
        }

        // Apply moving average filter (3 samples) to smooth out GPS noise
        const history = speedHistoryRef.current;
        history.push(calculatedSpeedKmH);
        if (history.length > 3) history.shift();

        const smoothedSpeed = Math.round(
          history.reduce((a, b) => a + b, 0) / history.length
        );

        setSpeedKmH(smoothedSpeed);
        setRealtimeSpeedInStore(smoothedSpeed);
      },
      (err) => {
        console.warn('GPS Telemetry error:', err.message);
        setIsGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isNavigating, isSimulating, simulatedSpeed, setRealtimeSpeedInStore]);

  return { speedKmH, isGpsActive };
}
