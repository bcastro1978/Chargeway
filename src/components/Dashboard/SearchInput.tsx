'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, MapPin, Loader2, GripVertical, ArrowUpDown, X } from 'lucide-react';
import { fetchSuggestions, SearchSuggestion } from '../../lib/services/mapbox';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface RouteSearchProps {
  locations: Waypoint[];
  onChange: (locations: Waypoint[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchInput
// ─────────────────────────────────────────────────────────────────────────────

interface SearchInputProps {
  value: string;
  hasCoords: boolean;
  placeholder: string;
  isLast?: boolean;
  onSelect: (loc: Waypoint) => void;
  onTextChange?: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  hasCoords,
  placeholder,
  onSelect,
  onTextChange,
  onFocusChange,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [proximity, setProximity] = useState<[number, number] | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSelect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSuggestions = useRef<SearchSuggestion[]>([]);

  // Keep latestSuggestions in sync so we can read them in setTimeout callbacks
  useEffect(() => {
    latestSuggestions.current = suggestions;
  }, [suggestions]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setProximity([pos.coords.longitude, pos.coords.latitude]),
        () => {},
        { timeout: 5000 }
      );
    }

    const onFocusChangeRef = { current: onFocusChange };
    onFocusChangeRef.current = onFocusChange;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (pendingAutoSelect.current) clearTimeout(pendingAutoSelect.current);
        pendingAutoSelect.current = setTimeout(() => {
          const current = latestSuggestions.current;
          if (current.length > 0) {
            const first = current[0];
            onSelect({ id: first.id, name: first.name, lng: first.center[0], lat: first.center[1] });
            setQuery(first.name);
            onTextChange?.(first.name);
          }
          setSuggestions([]);
          setShowSuggestions(false);
          onFocusChangeRef.current?.(false);
        }, 150);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (pendingAutoSelect.current) clearTimeout(pendingAutoSelect.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (text: string) => {
    setQuery(text);
    onTextChange?.(text);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (text.length < 3) { setSuggestions([]); setIsLoading(false); return; }
    setIsLoading(true);
    debounceTimeout.current = setTimeout(async () => {
      const results = await fetchSuggestions(text, proximity || undefined);
      setSuggestions(results);
      setIsLoading(false);
      setShowSuggestions(true);
      onFocusChange?.(true);
    }, 600);
  };

  const handleSelect = (s: SearchSuggestion) => {
    if (pendingAutoSelect.current) clearTimeout(pendingAutoSelect.current);
    onSelect({ id: s.id, name: s.name, lng: s.center[0], lat: s.center[1] });
    setQuery(s.name);
    onTextChange?.(s.name);
    setSuggestions([]);
    setShowSuggestions(false);
    onFocusChange?.(false);
  };

  const useCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setIsLoading(true);
    setQuery('📍 Obteniendo ubicación...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        setProximity([lng, lat]);
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (token) {
          try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es`;
            const res = await fetch(url);
            const data = await res.json();
            const place = data.features?.[0];
            const name = place?.place_name || place?.text || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            onSelect({ id: `current-${Date.now()}`, name, lng, lat });
            setQuery(name);
          } catch {
            const name = `Mi ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            onSelect({ id: `current-${Date.now()}`, name, lng, lat });
            setQuery(name);
          }
        } else {
          const name = `Mi ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          onSelect({ id: `current-${Date.now()}`, name, lng, lat });
          setQuery(name);
        }
        setIsLoading(false);
        setShowSuggestions(false);
        onFocusChange?.(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setIsLoading(false);
        if (err.code === 1) {
          setQuery('Quito, Ecuador');
          onSelect({ id: `fallback-${Date.now()}`, name: 'Quito, Ecuador', lng: -78.5249, lat: -0.1807 });
        } else {
          setQuery('');
          alert('No se pudo obtener tu ubicación. Verifica que el GPS esté activo.');
        }
        setShowSuggestions(false);
        onFocusChange?.(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const inputBorder = hasCoords && query
    ? '1px solid rgba(16,185,129,0.4)'
    : '1px solid var(--color-outline)';

  const dotColor = hasCoords ? '#10b981' : '#f59e0b';
  const dotGlow = hasCoords
    ? '0 0 6px rgba(16,185,129,0.7)'
    : '0 0 6px rgba(245,158,11,0.7)';

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, zIndex: showSuggestions ? 100 : 1 }}>
      <div style={{ position: 'relative' }}>
        {/* Coordinate validity indicator */}
        {query && (
          <div
            title={hasCoords ? 'Coordenadas confirmadas' : 'Selecciona del menú desplegable'}
            style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              width: '7px', height: '7px', borderRadius: '50%', zIndex: 1,
              background: dotColor, boxShadow: dotGlow,
            }}
          />
        )}

        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions.length > 0) {
              e.preventDefault();
              handleSelect(suggestions[0]);
            }
          }}
          onFocus={() => {
            setShowSuggestions(true);
            onFocusChange?.(true);
            if (query.length >= 3 && suggestions.length === 0) handleSearch(query);
          }}
          style={{
            width: '100%',
            padding: query ? '12px 64px 12px 24px' : '12px 64px 12px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--color-text)',
            border: inputBorder,
            borderRadius: '8px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = hasCoords && query
              ? 'rgba(16,185,129,0.4)'
              : 'var(--color-outline)';
          }}
        />

        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          ) : (
            <>
              {query && (
                <X
                  size={16}
                  style={{ cursor: 'pointer', color: 'var(--color-text-dim)' }}
                  onClick={() => { setQuery(''); setSuggestions([]); }}
                />
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); useCurrentLocation(); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                title="Usar mi ubicación actual"
              >
                <MapPin size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {showSuggestions && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2001,
          background: '#1a1a1f', border: '1px solid var(--color-outline)',
          borderRadius: '8px', marginTop: '4px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8)', maxHeight: '280px', overflowY: 'auto',
        }}>
          <div
            onClick={useCurrentLocation}
            style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 500, transition: 'background 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <MapPin size={16} />
            <span>Usar mi ubicación actual</span>
          </div>

          {suggestions.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelect(s)}
              style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{s.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{s.place_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

