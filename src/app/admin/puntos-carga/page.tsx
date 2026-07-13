'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Plus, Search, Edit2, CheckCircle2, XCircle, X } from 'lucide-react';

interface ChargingStation {
  id: string;
  name: string;
  region: string;
  province: string;
  city_or_canton: string;
  speed: string;
  charger_type: string;
  power: string;
  schedule: string;
  cost_type: string;
  gps_link: string;
  lat: number;
  lng: number;
  is_active: boolean;
}

export default function PuntosCargaAdmin() {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Partial<ChargingStation> | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('charging_points').select('*').order('name');
    if (data) setStations(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (station?: ChargingStation) => {
    if (station) {
      setEditingStation(station);
    } else {
      setEditingStation({
        name: '', region: 'Sierra', province: '', city_or_canton: '', speed: 'Rápida', 
        charger_type: 'CCS2 / CHAdeMO', power: '50 kW', 
        schedule: '24h', cost_type: 'Tarifa EERSA', gps_link: '', 
        lat: 0, lng: 0, is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation) return;
    
    try {
      if (editingStation.id) {
        await supabase.from('charging_points').update(editingStation).eq('id', editingStation.id);
      } else {
        await supabase.from('charging_points').insert(editingStation);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving station:', err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('charging_points').update({ is_active: !currentStatus }).eq('id', id);
    loadData();
  };

  const filteredStations = stations.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.province?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city_or_canton?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="text-emerald-500" />
            Administración de Puntos de Carga
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Gestiona las ubicaciones, conectores y detalles de estaciones de carga.
          </p>
        </div>
        
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus size={18} />
          Nueva Estación
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre, provincia o cantón..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nombre</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ubicación</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Conector</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Potencia</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStations.map(station => (
                  <tr key={station.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{station.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-neutral-300">{station.city_or_canton}, {station.province}</div>
                      <div className="text-xs text-neutral-500">
                        {station.lat}, {station.lng}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-neutral-300">{station.charger_type}</td>
                    <td className="p-4 text-sm text-neutral-300">{station.power}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(station.id, station.is_active)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          station.is_active !== false
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {station.is_active !== false ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {station.is_active !== false ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openModal(station)}
                        className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No se encontraron estaciones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#101014] border border-white/10 rounded-2xl shadow-2xl z-50 p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingStation?.id ? 'Editar Estación' : 'Nueva Estación'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nombre de la Estación</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.name || ''}
                    onChange={e => setEditingStation({...editingStation, name: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Región</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.region || ''}
                    onChange={e => setEditingStation({...editingStation, region: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Provincia</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.province || ''}
                    onChange={e => setEditingStation({...editingStation, province: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Cantón / Ciudad</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.city_or_canton || ''}
                    onChange={e => setEditingStation({...editingStation, city_or_canton: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    value={editingStation?.lat || ''}
                    onChange={e => setEditingStation({...editingStation, lat: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    value={editingStation?.lng || ''}
                    onChange={e => setEditingStation({...editingStation, lng: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tipo de Conector</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.charger_type || ''}
                    onChange={e => setEditingStation({...editingStation, charger_type: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Velocidad</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.speed || ''}
                    onChange={e => setEditingStation({...editingStation, speed: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Potencia (kW)</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.power || ''}
                    onChange={e => setEditingStation({...editingStation, power: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Costo</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.cost_type || ''}
                    onChange={e => setEditingStation({...editingStation, cost_type: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Horario</label>
                  <input
                    type="text"
                    required
                    value={editingStation?.schedule || ''}
                    onChange={e => setEditingStation({...editingStation, schedule: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Enlace GPS</label>
                  <input
                    type="text"
                    value={editingStation?.gps_link || ''}
                    onChange={e => setEditingStation({...editingStation, gps_link: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  {editingStation?.id ? 'Guardar Cambios' : 'Crear Estación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
