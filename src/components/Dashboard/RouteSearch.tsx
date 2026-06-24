'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, MapPin, Loader2, GripVertical, ArrowUpDown, X, Trash2 } from 'lucide-react';
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
          alert(`No se pudo obtener tu ubicación (${err.message}). Verifica que el GPS esté activo y la app tenga permisos.`);
        }
        setShowSuggestions(false);
        onFocusChange?.(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
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
                  onClick={() => { setQuery(''); setSuggestions([]); onTextChange?.(''); }}
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

// ─────────────────────────────────────────────────────────────────────────────
// RouteSearch
// ─────────────────────────────────────────────────────────────────────────────

export const RouteSearch: React.FC<RouteSearchProps> = ({ locations, onChange }) => {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);

  const addWaypoint = () => {
    const newLocations = [...locations];
    const destination = newLocations.pop()!;
    newLocations.push({ id: `wp-${Date.now()}`, name: '', lat: 0, lng: 0 });
    newLocations.push(destination);
    onChange(newLocations);
  };

  const removeLocation = (index: number) => {
    if (locations.length <= 2) return;
    const newLocations = [...locations];
    newLocations.splice(index, 1);
    onChange(newLocations);
  };

  const updateLocation = (index: number, location: Waypoint) => {
    const newLocations = [...locations];
    newLocations[index] = location;
    onChange(newLocations);
  };

  const swapOriginDestination = () => {
    const newLocations = [...locations];
    const first = newLocations[0];
    const last = newLocations[newLocations.length - 1];
    newLocations[0] = last;
    newLocations[newLocations.length - 1] = first;
    onChange(newLocations);
  };

  const clearRoute = () => {
    onChange([
      { id: 'origin', name: '', lat: 0, lng: 0 },
      { id: 'destination', name: '', lat: 0, lng: 0 }
    ]);
  };

  const handleDrop = (toIdx: number) => {
    const fromIdx = dragIdx.current;
    if (fromIdx === null || fromIdx === toIdx) return;
    const newLocations = [...locations];
    const [moved] = newLocations.splice(fromIdx, 1);
    newLocations.splice(toIdx, 0, moved);
    dragIdx.current = null;
    setDragOverIdx(null);
    onChange(newLocations);
  };

  const hasUnsetPoints = locations.some((l) => l.name !== '' && l.lat === 0 && l.lng === 0);

  // Extracted to avoid block-body arrow function inside JSX map (TypeScript 5 + Next 16 parsing issue)
  const renderRow = (loc: Waypoint, idx: number) => {
    const isOrigin = idx === 0;
    const isDestination = idx === locations.length - 1;
    const iconColor = isOrigin ? '#10b981' : isDestination ? '#ef4444' : '#3b82f6';
    const isDragTarget = dragOverIdx === idx;
    const rowZIndex = focusedIdx === idx ? 2000 : locations.length - idx;
    const rowBg = isDragTarget ? 'rgba(63,255,139,0.07)' : 'transparent';
    const rowOutline = isDragTarget ? '1px dashed var(--color-primary)' : 'none';
    const waypointLabel = isOrigin ? 'Origen' : isDestination ? 'Destino' : 'Añadir parada';

    return (
      <React.Fragment key={loc.id}>
        {isDestination && (
          <div style={{ paddingLeft: '36px', zIndex: 1, position: 'relative' }}>
            <button
              onClick={addWaypoint}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', padding: '8px 0', marginTop: '-4px', marginBottom: '-4px' }}
            >
              <Plus size={18} />
              <span>Añadir parada</span>
            </button>
          </div>
        )}

        <div

          draggable={true}
          onDragStart={() => { dragIdx.current = idx; }}
          onDragOver={(e) => { e.preventDefault(); if (dragOverIdx !== idx) setDragOverIdx(idx); }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
          onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
          style={{ display: 'flex', gap: '12px', alignItems: 'center', zIndex: rowZIndex, borderRadius: '8px', transition: 'background 0.15s', background: rowBg, outline: rowOutline, padding: '2px 0' }}
        >
          <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
            {isOrigin && <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid currentColor', background: 'transparent' }} />}
            {isDestination && <MapPin size={18} />}
            {!isOrigin && !isDestination && <div style={{ width: '8px', height: '8px', background: 'currentColor', borderRadius: '1px' }} />}
          </div>

          <SearchInput
            value={loc.name}
            hasCoords={loc.lat !== 0 && loc.lng !== 0}
            placeholder={waypointLabel}
            onSelect={(newLoc) => updateLocation(idx, newLoc)}
            onTextChange={(text) => { const u = [...locations]; u[idx] = { ...u[idx], name: text, lat: 0, lng: 0 }; onChange(u); }}
            isLast={isDestination}
            onFocusChange={(focused) => setFocusedIdx(focused ? idx : null)}
          />

          {!isOrigin && !isDestination && (
            <button onClick={() => removeLocation(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', padding: '4px' }}>
              <X size={16} />
            </button>
          )}

          <div title="Arrastrar para reordenar" style={{ width: '20px', color: 'var(--color-text-dim)', cursor: 'grab', flexShrink: 0 }}>
            <GripVertical size={16} />
          </div>
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className="glass-card" style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Planificar Ruta</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={swapOriginDestination}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }}
            title="Invertir ruta"
          >
            <ArrowUpDown size={18} />
          </button>
          <button
            onClick={clearRoute}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
            title="Borrar ruta"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <div style={{ position: 'absolute', left: '11px', top: '20px', bottom: '20px', width: '2px', background: 'linear-gradient(to bottom, var(--color-primary), var(--color-secondary))', opacity: 0.3, zIndex: 0 }} />
        {locations.map(renderRow)}
      </div>

      {hasUnsetPoints && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '8px 10px', fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚠️</span>
          <span>Selecciona los lugares del menú desplegable para confirmar coordenadas</span>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--color-outline)', paddingTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          {locations.length} puntos en el trayecto
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6' }} />
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444' }} />
        </div>
      </div>
    </div>
  );
};
