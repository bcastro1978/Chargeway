import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, MapPin, Trash2, Plus, X, Search } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Favorite {
  id: string;
  alias?: string;
  name?: string;
  address: string | null;
  lat: number;
  lng: number;
}

export default function FavoriteLocationsManager({ userId }: { userId: string }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [newLoc, setNewLoc] = useState<{lat: number, lng: number} | null>(null);
  const [alias, setAlias] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('favorite_locations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setFavorites(data);
    setIsLoading(false);
  };

  const deleteFavorite = async (id: string) => {
    if (!confirm('¿Eliminar este destino favorito?')) return;
    await supabase.from('favorite_locations').delete().eq('id', id);
    fetchFavorites();
  };

  useEffect(() => {
    if (isAdding && mapContainer.current && !map.current) {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-79.5, -1.5], // Ecuador
        zoom: 6,
        attributionControl: false
      });

      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setNewLoc({ lat, lng });
        
        if (!marker.current) {
          marker.current = new mapboxgl.Marker({ color: '#10B981' })
            .setLngLat([lng, lat])
            .addTo(map.current!);
        } else {
          marker.current.setLngLat([lng, lat]);
        }
      });
    }

    return () => {
      if (!isAdding && map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
        setNewLoc(null);
      }
    };
  }, [isAdding]);

  const saveFavorite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoc || !alias) return;
    if (favorites.length >= 5) return alert('Has alcanzado el límite de 5 destinos.');

    setIsSubmitting(true);
    const { error } = await supabase.from('favorite_locations').insert({
      user_id: userId,
      name: alias,
      lat: newLoc.lat,
      lng: newLoc.lng,
      address: `${newLoc.lat.toFixed(4)}, ${newLoc.lng.toFixed(4)}`
    });

    if (!error) {
      setIsAdding(false);
      setAlias('');
      setNewLoc(null);
      fetchFavorites();
    } else {
      alert('Error guardando la ubicación');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ animationDuration: '0.3s' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="text-primary" /> Destinos Frecuentes
          </h3>
          <p className="text-sm text-neutral-400">
            {favorites.length} de 5 lugares guardados
          </p>
        </div>
        {!isAdding && favorites.length < 5 && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-primary hover:bg-emerald-500 text-black px-4 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105"
          >
            <Plus size={18} /> Agregar Lugar
          </button>
        )}
      </div>

      {isAdding && (
        <div className="glass-card mb-8 p-0 !bg-neutral-900/60 border border-primary/30 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary z-10" />
          <div className="flex flex-col md:flex-row h-[400px]">
            {/* Map Area */}
            <div className="flex-1 relative">
              <div ref={mapContainer} className="w-full h-full" />
              {!newLoc && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                  <div className="bg-black/80 px-4 py-2 rounded-full text-white font-semibold flex items-center gap-2 shadow-xl border border-neutral-700">
                    <MapPin size={16} className="text-primary animate-bounce" /> Haz clic en el mapa
                  </div>
                </div>
              )}
            </div>
            
            {/* Form Area */}
            <div className="w-full md:w-80 p-6 bg-neutral-900 border-l border-neutral-800 flex flex-col justify-between">
              <div>
                <h4 className="text-md font-bold text-white mb-6">Nueva Ubicación</h4>
                
                <form onSubmit={saveFavorite} id="fav-form" className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-400 uppercase">Nombre del Lugar</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Casa, Oficina, Playa"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-400 uppercase">Coordenadas</label>
                    <div className="w-full bg-white/5 border border-white/10 text-neutral-400 font-semibold rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                      <MapPin size={14} />
                      {newLoc ? `${newLoc.lat.toFixed(4)}, ${newLoc.lng.toFixed(4)}` : 'Pendiente...'}
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <button
                  type="submit"
                  form="fav-form"
                  disabled={!newLoc || isSubmitting}
                  className="w-full py-3 rounded-xl font-bold bg-primary text-black hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Guardar Destino'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-full py-3 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {favorites.length === 0 && !isAdding ? (
        <div className="text-center py-12 bg-black/20 rounded-2xl border border-neutral-800/50">
          <MapPin className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-neutral-300">Sin destinos frecuentes</h4>
          <p className="text-neutral-500 mt-1 max-w-sm mx-auto text-sm">
            Guarda los lugares que visitas constantemente para planificar tus rutas con un solo clic.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((f) => (
            <div key={f.id} className="glass-card p-5 group hover:-translate-y-1 transition-all duration-300 border border-neutral-800/50 hover:border-primary/50 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:scale-110 transition-transform">
                    <MapPin size={18} />
                  </div>
                  <h4 className="font-bold text-white text-lg truncate max-w-[150px]">{f.name || f.alias}</h4>
                </div>
                <button
                  onClick={() => deleteFavorite(f.id)}
                  className="text-neutral-500 hover:text-red-500 transition-colors p-1"
                  title="Eliminar destino"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-xs text-neutral-500 font-mono flex items-center gap-1">
                {f.address}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
