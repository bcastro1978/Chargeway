'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MapPin, Loader2, GripVertical, ArrowUpDown, X, Star, Navigation, RotateCcw, Trash2 } from 'lucide-react';
import { fetchSuggestions, resolveGooglePlaceCoords, SearchSuggestion } from '../../lib/services/mapbox';
import { useTripStore } from '@/lib/store/useTripStore';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
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
  location?: Waypoint;
  placeholder: string;
  isOrigin?: boolean;
  isDestination?: boolean;
  onSelect: (loc: Waypoint) => void;
  onSelectFromMap?: () => void;
  onTextChange?: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  hasCoords,
  location,
  placeholder,
  isOrigin,
  isDestination,
  onSelect,
  onSelectFromMap,
  onTextChange,
  onFocusChange,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [proximity, setProximity] = useState<[number, number] | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [aliasValue, setAliasValue] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  
  const favoriteLocations = useTripStore(state => state.favoriteLocations);
  const addFavorite = useTripStore(state => state.addFavorite);
  const removeFavorite = useTripStore(state => state.removeFavorite);
  const user = useTripStore(state => state.user);

  const currentFav = location ? favoriteLocations.find(f => f.lat === location.lat && f.lng === location.lng) : undefined;
  
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return setAlertMsg('Debes iniciar sesión para guardar favoritos');
    if (!location || !hasCoords) return setAlertMsg('Selecciona una ubicación válida primero');
    
    if (currentFav) {
      setDeleteConfirmOpen({ isOpen: true, id: currentFav.id });
    } else {
      if (favoriteLocations.length >= 5) {
        return setAlertMsg('Has alcanzado el límite máximo de 5 ubicaciones favoritas. Por favor, elimina una para añadir otra.');
      }
      setAliasValue(location.name);
      setPromptOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmOpen.id) {
      await removeFavorite(deleteConfirmOpen.id);
    }
    setDeleteConfirmOpen({ isOpen: false, id: '' });
  };

  const handleSaveFavorite = async () => {
    if (!location) return;
    const finalName = aliasValue.trim() || location.name;
    await addFavorite({
      id: `fav-${Date.now()}`,
      name: finalName,
      lat: location.lat,
      lng: location.lng
    }, location.name);
    setPromptOpen(false);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSelect = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const sessionTokenRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    onTextChange?.(text);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (text.trim().length < 2) { setSuggestions([]); setIsLoading(false); return; }
    setIsLoading(true);

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
    }

    debounceTimeout.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      const results = await fetchSuggestions(text, proximity || undefined, sessionTokenRef.current, abortControllerRef.current.signal);
      setSuggestions(results);
      setIsLoading(false);
      setShowSuggestions(true);
      onFocusChange?.(true);
    }, 100);
  };

  const handleSelect = async (s: SearchSuggestion) => {
    if (pendingAutoSelect.current) clearTimeout(pendingAutoSelect.current);

    let lat = s.center?.[1];
    let lng = s.center?.[0];

    // If suggestion came from Google Places without coordinates, resolve via Place Details
    if ((lat === undefined || lng === undefined) && s.placeId) {
      setIsLoading(true);
      const resolved = await resolveGooglePlaceCoords(s.placeId, sessionTokenRef.current);
      setIsLoading(false);
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      }
      sessionTokenRef.current = '';
    }

    if (lat !== undefined && lng !== undefined) {
      onSelect({ id: s.id, name: s.name, lng, lat });
      setQuery(s.name);
    }
    setSuggestions([]);
    setShowSuggestions(false);
    onFocusChange?.(false);
  };

  const useCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setAlertMsg('Tu navegador no soporta geolocalización.');
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

  const labelText = isOrigin ? 'Origen Actual' : isDestination ? 'Destino Final' : 'Parada Intermedia';

  return (
    <div ref={wrapperRef} className="relative flex-1" style={{ zIndex: showSuggestions ? 100 : 1 }}>
      <div className={`flex items-center space-x-2.5 bg-slate-900/85 border rounded-xl p-2.5 pl-3 transition ${
        hasCoords && query 
          ? 'border-white/15 focus-within:border-brand-cyan shadow-sm' 
          : 'border-white/10 focus-within:border-brand-cyan'
      }`}>
        <div className="flex-1 min-w-0">
          <label className="block text-[9px] font-mono text-slate-400 uppercase leading-none mb-1">
            {labelText}
          </label>
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
            className="w-full bg-transparent border-0 p-0 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-brand-cyan" />
          ) : (
            <>
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSuggestions([]); onTextChange?.(''); }}
                  className="p-1 hover:text-white transition"
                  title="Limpiar"
                >
                  <X size={14} />
                </button>
              )}
              {hasCoords && (
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={`p-1 transition ${currentFav ? 'text-amber-400' : 'hover:text-amber-400'}`}
                  title={currentFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                >
                  <Star size={14} fill={currentFav ? '#fbbf24' : 'none'} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); useCurrentLocation(); }}
                className="p-1 hover:text-brand-cyan transition text-slate-400"
                title="Usar mi ubicación actual"
              >
                <MapPin size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-[2001] mt-1.5 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl max-h-[280px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
          <div
            onClick={useCurrentLocation}
            className="p-2.5 cursor-pointer flex items-center gap-2 text-brand-cyan text-xs font-semibold hover:bg-white/5 transition"
          >
            <MapPin size={14} />
            <span>Usar mi ubicación actual</span>
          </div>

          {onSelectFromMap && (
            <div
              onClick={(e) => { e.stopPropagation(); onSelectFromMap(); setShowSuggestions(false); onFocusChange?.(false); }}
              className="p-2.5 cursor-pointer flex items-center gap-2 text-brand-lime text-xs font-semibold hover:bg-white/5 transition"
            >
              <MapPin size={14} />
              <span>📍 Seleccionar en el mapa</span>
            </div>
          )}

          {query.length === 0 && favoriteLocations.map((f) => (
            <div
              key={`fav-${f.id}`}
              onClick={() => handleSelect({ id: f.id, name: f.name, place_name: f.name, center: [f.lng, f.lat] } as SearchSuggestion)}
              className="p-2.5 cursor-pointer flex items-center gap-2.5 hover:bg-white/5 transition"
            >
              <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />
              <div className="overflow-hidden flex-1">
                <div className="font-semibold text-xs text-slate-200 truncate">{f.name}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {f.address && f.address !== f.name ? f.address : 'Guardado en Favoritos'}
                </div>
              </div>
            </div>
          ))}

          {suggestions.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelect(s)}
              className="p-2.5 cursor-pointer hover:bg-white/5 transition flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                  <span>{s.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">{s.place_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals para alertas y alias */}
      {alertMsg && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setAlertMsg(''); }}>
          <div className="hud-panel p-6 rounded-2xl w-full max-w-sm border border-white/10 text-center shadow-hud" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-2">Atención</h3>
            <p className="text-slate-300 text-xs mb-6">{alertMsg}</p>
            <button type="button" onClick={() => setAlertMsg('')} className="w-full py-2.5 px-4 bg-brand-cyan text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 transition">Entendido</button>
          </div>
        </div>,
        document.body
      )}

      {promptOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setPromptOpen(false); }}>
          <div className="hud-panel p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-hud" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-3">Guardar lugar favorito</h3>
            <label className="block mb-2 text-xs text-slate-300">Nombre o alias (opcional):</label>
            <input 
              autoFocus
              type="text" 
              value={aliasValue} 
              onChange={e => setAliasValue(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveFavorite(); } }}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs mb-5 focus:outline-none focus:border-brand-cyan"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPromptOpen(false)} className="px-4 py-2 text-xs text-slate-300 hover:text-white transition">Cancelar</button>
              <button type="button" onClick={handleSaveFavorite} className="px-4 py-2 bg-brand-cyan text-slate-950 font-bold text-xs rounded-xl hover:brightness-110 transition">Guardar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirmOpen.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setDeleteConfirmOpen({ isOpen: false, id: '' }); }}>
          <div className="hud-panel p-6 rounded-2xl w-full max-w-sm border border-white/10 text-center shadow-hud" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-2">Eliminar favorito</h3>
            <p className="text-slate-300 text-xs mb-6">¿Estás seguro de que deseas eliminar esta ubicación de tus favoritos?</p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setDeleteConfirmOpen({ isOpen: false, id: '' })} className="px-4 py-2 text-xs text-slate-300 hover:text-white transition">Cancelar</button>
              <button type="button" onClick={handleConfirmDelete} className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-500 transition">Eliminar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RouteSearch
// ─────────────────────────────────────────────────────────────────────────────

const RouteSearchComponent: React.FC<RouteSearchProps> = ({ locations, onChange }) => {
  const filterCompatibleChargers = useTripStore(state => state.filterCompatibleChargers);
  const setFilterCompatibleChargers = useTripStore(state => state.setFilterCompatibleChargers);
  const selectedVehicle = useTripStore(state => state.selectedVehicle);
  const setMapSelectionIndex = useTripStore(state => state.setMapSelectionIndex);
  const mapSelectionIndex = useTripStore(state => state.mapSelectionIndex);
  
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);

  const addWaypoint = () => {
    if (locations.length >= 12) {
        alert('Máximo 10 paradas intermedias permitidas (12 puntos en total).');
        return;
    }
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

  const clearIntermediateStops = () => {
    if (locations.length <= 2) return;
    const origin = locations[0];
    const destination = locations[locations.length - 1];
    onChange([origin, destination]);
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

  const renderRow = (loc: Waypoint, idx: number) => {
    const isOrigin = idx === 0;
    const isDestination = idx === locations.length - 1;
    const isDragTarget = dragOverIdx === idx;
    const isSelectingOnMap = mapSelectionIndex === idx;
    const rowZIndex = focusedIdx === idx ? 2000 : locations.length - idx;
    const waypointLabel = isOrigin ? 'Buscar origen (ej. Quito)' : isDestination ? 'Buscar destino (ej. Ibarra)' : 'Añadir parada intermedia';

    return (
      <React.Fragment key={loc.id}>
        {isDestination && locations.length < 7 && (
          <div className="pl-6 z-10 relative my-0.5">
            <button
              type="button"
              onClick={addWaypoint}
              className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-brand-lime hover:text-lime-300 transition"
            >
              <Plus size={14} />
              <span>+ Añadir parada</span>
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
          style={{ zIndex: rowZIndex }}
          className={`flex items-center gap-2 rounded-xl transition ${
            isSelectingOnMap ? 'ring-1 ring-brand-cyan bg-brand-cyan/10' :
            isDragTarget ? 'ring-1 ring-brand-lime bg-brand-lime/10' : ''
          }`}
        >
          {/* Dot Indicator */}
          <div className="w-5 flex items-center justify-center shrink-0">
            {isOrigin && (
              <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan ring-4 ring-brand-cyan/20 z-10" />
            )}
            {isDestination && (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 z-10" />
            )}
            {!isOrigin && !isDestination && (
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20 z-10" />
            )}
          </div>

          <SearchInput
            value={loc.name}
            hasCoords={loc.lat !== 0 && loc.lng !== 0}
            location={loc}
            placeholder={waypointLabel}
            onSelect={(newLoc) => updateLocation(idx, newLoc)}
            onSelectFromMap={() => setMapSelectionIndex(idx)}
            onTextChange={(text) => { const u = [...locations]; u[idx] = { ...u[idx], name: text, lat: 0, lng: 0 }; onChange(u); }}
            isOrigin={isOrigin}
            isDestination={isDestination}
            onFocusChange={(focused) => setFocusedIdx(focused ? idx : null)}
          />

          {idx > 0 && locations.length > 2 && (
            <button 
              type="button"
              onClick={() => removeLocation(idx)} 
              className="text-slate-400 hover:text-rose-400 p-1 rounded transition cursor-pointer shrink-0"
              title={isDestination ? "Quitar destino final (la parada anterior será el destino)" : "Quitar parada"}
            >
              <X size={15} />
            </button>
          )}

          <div title="Arrastrar para reordenar" className="text-slate-500 hover:text-slate-300 cursor-grab shrink-0 p-0.5">
            <GripVertical size={14} />
          </div>
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className="hud-panel rounded-2xl p-5 shadow-hud border border-white/10 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-brand-cyan" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Planificador de Viaje</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => {
              if (locations.length > 2) {
                clearIntermediateStops();
              } else {
                clearRoute();
              }
            }}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition cursor-pointer"
            title={locations.length > 2 ? "Borrar paradas intermedias" : "Eliminar ruta"}
            aria-label={locations.length > 2 ? "Borrar paradas intermedias" : "Eliminar ruta"}
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={swapOriginDestination}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded transition cursor-pointer"
            title="Invertir trayecto"
            aria-label="Invertir trayecto"
          >
            <ArrowUpDown size={15} />
          </button>
          <button
            type="button"
            onClick={clearRoute}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition cursor-pointer"
            title="Reiniciar ruta"
            aria-label="Reiniciar ruta"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 relative">
        {/* Connecting Graphic Line */}
        <div className="absolute left-2.5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-brand-cyan via-brand-lime to-emerald-400 opacity-50 z-0 pointer-events-none" />
        
        {locations.map((loc, idx) => (
          <React.Fragment key={`route-point-${loc.id || idx}`}>
            {renderRow(loc, idx)}
          </React.Fragment>
        ))}
      </div>

      {hasUnsetPoints && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-[11px] font-mono text-amber-300 flex items-center gap-2">
          <span>⚠️</span>
          <span>Selecciona los lugares del menú para fijar coordenadas</span>
        </div>
      )}

      {/* Filter Checkbox */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] font-mono">
        <label className="flex items-center space-x-2 text-slate-300 cursor-pointer select-none">
          <input 
            type="checkbox" 
            id="filterCompatible" 
            checked={filterCompatibleChargers}
            onChange={(e) => setFilterCompatibleChargers(e.target.checked)}
            className="rounded bg-slate-900 border-white/20 text-brand-cyan focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
          />
          <span>
            Solo compatibles ({selectedVehicle?.brand ? `${selectedVehicle.brand} • ` : ''}{selectedVehicle?.specs?.charger_type || 'EV'})
          </span>
        </label>
        <span className="text-slate-500 text-[10px]">
          {locations.length} puntos
        </span>
      </div>
    </div>
  );
};

export const RouteSearch = React.memo(RouteSearchComponent);
