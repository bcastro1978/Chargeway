import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Star, Trash2, Camera, Car, Pencil } from 'lucide-react';
import { useTripStore } from '@/lib/store/useTripStore';

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  slug: string;
  usable_battery_kwh: number;
  drag_coefficient: number;
  frontal_area_m2: number;
  weight_kg: number;
  peak_charging_kw: number;
  wltp_range_km: number;
  charger_type: string;
}

interface UserVehicle {
  id: string;
  alias: string;
  photo_url: string;
  is_primary: boolean;
  vehicle_models: Model & { vehicle_brands: Brand };
}

export default function GarageManager({ userId }: { userId: string }) {
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<UserVehicle | null>(null);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [alias, setAlias] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchBrands();
  }, [userId]);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand);
    } else {
      setModels([]);
    }
  }, [selectedBrand]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_vehicles')
      .select(`
        id, alias, photo_url, is_primary,
        vehicle_models!user_vehicles_vehicle_model_id_fkey (
          id, name, slug, usable_battery_kwh, drag_coefficient,
          frontal_area_m2, weight_kg, peak_charging_kw, wltp_range_km, charger_type,
          vehicle_brands ( id, name )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVehicles(data as any);
    } else if (error) {
      console.error('Error fetching vehicles:', error);
    }
    setIsLoading(false);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from('vehicle_brands').select('*').order('name');
    if (data) setBrands(data);
  };

  const fetchModels = async (brandId: string) => {
    const { data } = await supabase.from('vehicle_models').select('*').eq('brand_id', brandId).order('name');
    if (data) setModels(data);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicles.length >= 3) return alert('Límite de 3 vehículos alcanzado.');
    if (!selectedModel || !alias) return;

    setIsSubmitting(true);
    try {
      let finalPhotoUrl = null;

      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('userId', userId);
        
        const res = await fetch('/api/upload-vehicle', { method: 'POST', body: formData });
        const resData = await res.json();
        
        if (resData.success) {
          finalPhotoUrl = resData.url;
        } else {
          alert('Error al procesar la imagen: ' + resData.error);
        }
      }

      const { error } = await supabase.from('user_vehicles').insert({
        user_id: userId,
        vehicle_model_id: selectedModel,
        alias,
        photo_url: finalPhotoUrl,
        is_primary: vehicles.length === 0, // Auto-select if it's the first vehicle
      });

      if (error) throw error;

      setIsAdding(false);
      setSelectedBrand('');
      setSelectedModel('');
      setAlias('');
      setPhotoFile(null);
      await fetchVehicles();
    } catch (err: any) {
      alert('Error al agregar vehículo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = async (v: UserVehicle) => {
    setEditingVehicle(v);
    setIsAdding(false);
    setAlias(v.alias);
    setPhotoFile(null);
    if (v.vehicle_models) {
      setSelectedBrand(v.vehicle_models.vehicle_brands?.id || '');
      // Wait for brand models to load, but we can also pre-fetch models or rely on the state
      await fetchModels(v.vehicle_models.vehicle_brands?.id);
      setSelectedModel(v.vehicle_models.id);
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    if (!selectedModel || !alias) return;

    setIsSubmitting(true);
    try {
      let finalPhotoUrl = editingVehicle.photo_url;

      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('userId', userId);
        
        const res = await fetch('/api/upload-vehicle', { method: 'POST', body: formData });
        const resData = await res.json();
        
        if (resData.success) {
          finalPhotoUrl = resData.url;
        } else {
          alert('Error al procesar la imagen: ' + resData.error);
        }
      }

      const { error } = await supabase
        .from('user_vehicles')
        .update({
          vehicle_model_id: selectedModel,
          alias,
          photo_url: finalPhotoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingVehicle.id);

      if (error) throw error;

      // If this vehicle was the primary one, update the routing store as well
      if (editingVehicle.is_primary) {
        const selectedModelObj = models.find(m => m.id === selectedModel);
        const selectedBrandObj = brands.find(b => b.id === selectedBrand);
        if (selectedModelObj) {
          const storeVehicle = {
            id: selectedModelObj.slug,
            brand: selectedBrandObj?.name || 'Genérico',
            model: selectedModelObj.name,
            logo: '',
            photoUrl: finalPhotoUrl || '',
            specs: {
              usable_battery_kwh: Number(selectedModelObj.usable_battery_kwh),
              drag_coefficient: Number(selectedModelObj.drag_coefficient),
              frontal_area_m2: Number(selectedModelObj.frontal_area_m2),
              weight_kg: Number(selectedModelObj.weight_kg),
              peak_charging_kw: Number(selectedModelObj.peak_charging_kw),
              wltp_range_km: Number(selectedModelObj.wltp_range_km),
              charger_type: selectedModelObj.charger_type,
            }
          };
          useTripStore.getState().setSelectedVehicle(storeVehicle);
        }
      }

      setEditingVehicle(null);
      setSelectedBrand('');
      setSelectedModel('');
      setAlias('');
      setPhotoFile(null);
      await fetchVehicles();
    } catch (err: any) {
      alert('Error al actualizar el vehículo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPrimary = async (id: string) => {
    const { error } = await supabase
      .from('user_vehicles')
      .update({ is_primary: true })
      .eq('id', id);

    if (error) {
      console.error('Error setting primary vehicle:', error);
      alert('Error al seleccionar el vehículo.');
      return;
    }

    // Refresh vehicle list state
    const { data: refreshedData } = await supabase
      .from('user_vehicles')
      .select(`
        id, alias, photo_url, is_primary,
        vehicle_models!user_vehicles_vehicle_model_id_fkey (
          id, name, slug, usable_battery_kwh, drag_coefficient,
          frontal_area_m2, weight_kg, peak_charging_kw, wltp_range_km, charger_type,
          vehicle_brands ( id, name )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (refreshedData) {
      setVehicles(refreshedData as any);
      
      const chosen = refreshedData.find(v => v.id === id);
      if (chosen && chosen.vehicle_models) {
        const dbModel = chosen.vehicle_models;
        const storeVehicle = {
          id: dbModel.slug,
          brand: dbModel.vehicle_brands?.name || 'Genérico',
          model: dbModel.name,
          logo: '',
          photoUrl: chosen.photo_url || '',
          specs: {
            usable_battery_kwh: Number(dbModel.usable_battery_kwh),
            drag_coefficient: Number(dbModel.drag_coefficient),
            frontal_area_m2: Number(dbModel.frontal_area_m2),
            weight_kg: Number(dbModel.weight_kg),
            peak_charging_kw: Number(dbModel.peak_charging_kw),
            wltp_range_km: Number(dbModel.wltp_range_km),
            charger_type: dbModel.charger_type,
          }
        };
        useTripStore.getState().setSelectedVehicle(storeVehicle);
      }
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm('¿Eliminar este vehículo?')) return;
    await supabase.from('user_vehicles').delete().eq('id', id);
    fetchVehicles();
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
            <Car className="text-primary" /> Vehículos Registrados
          </h3>
          <p className="text-sm text-neutral-400">
            {vehicles.length} de 3 vehículos disponibles
          </p>
        </div>
        {!isAdding && !editingVehicle && vehicles.length < 3 && (
          <button
            onClick={() => { setIsAdding(true); setEditingVehicle(null); }}
            className="flex items-center gap-2 bg-primary hover:bg-emerald-500 text-black px-4 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105"
          >
            <Plus size={18} /> Agregar Auto
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddVehicle} className="glass-card mb-8 p-6 !bg-neutral-900/60 border border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h4 className="text-md font-bold text-white mb-4">Nuevo Vehículo</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Marca</label>
              <select
                required
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              >
                <option value="" className="bg-neutral-900 text-white">Selecciona Marca...</option>
                {brands.map(b => <option key={b.id} value={b.id} className="bg-neutral-900 text-white">{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Modelo</label>
              <select
                required
                disabled={!selectedBrand}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none disabled:opacity-50"
              >
                <option value="" className="bg-neutral-900 text-white">Selecciona Modelo...</option>
                {models.map(m => <option key={m.id} value={m.id} className="bg-neutral-900 text-white">{m.name} ({m.wltp_range_km}km)</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Alias (Ej: Mi Auto Trabajo)</label>
              <input
                required
                type="text"
                placeholder="Nombre para identificarlo"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Foto (Opcional)</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="photo-upload"
                />
                <label 
                  htmlFor="photo-upload"
                  className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 border-dashed text-neutral-400 rounded-xl px-4 py-3 text-sm cursor-pointer hover:border-primary hover:text-white transition-all font-semibold"
                >
                  <Camera size={18} />
                  {photoFile ? photoFile.name : 'Subir foto del auto'}
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold bg-primary text-black hover:bg-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Guardar Vehículo'}
            </button>
          </div>
        </form>
      )}

      {editingVehicle && (
        <form onSubmit={handleUpdateVehicle} className="glass-card mb-8 p-6 !bg-neutral-900/60 border border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h4 className="text-md font-bold text-white mb-4">Editar Vehículo</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Marca</label>
              <select
                required
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              >
                <option value="" className="bg-neutral-900 text-white">Selecciona Marca...</option>
                {brands.map(b => <option key={b.id} value={b.id} className="bg-neutral-900 text-white">{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Modelo</label>
              <select
                required
                disabled={!selectedBrand}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none disabled:opacity-50"
              >
                <option value="" className="bg-neutral-900 text-white">Selecciona Modelo...</option>
                {models.map(m => <option key={m.id} value={m.id} className="bg-neutral-900 text-white">{m.name} ({m.wltp_range_km}km)</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Alias</label>
              <input
                required
                type="text"
                placeholder="Nombre para identificarlo"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Foto (Opcional, sube otra para cambiarla)</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="photo-update"
                />
                <label 
                  htmlFor="photo-update"
                  className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 border-dashed text-neutral-400 rounded-xl px-4 py-3 text-sm cursor-pointer hover:border-primary hover:text-white transition-all font-semibold"
                >
                  <Camera size={18} />
                  {photoFile ? photoFile.name : 'Subir nueva foto'}
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => setEditingVehicle(null)}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold bg-primary text-black hover:bg-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Actualizar Vehículo'}
            </button>
          </div>
        </form>
      )}

      {vehicles.length === 0 && !isAdding && !editingVehicle ? (
        <div className="text-center py-12 bg-black/20 rounded-2xl border border-neutral-800/50">
          <Car className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-neutral-300">No tienes vehículos registrados</h4>
          <p className="text-neutral-500 mt-1 max-w-sm mx-auto text-sm">
            Agrega tu vehículo eléctrico para personalizar tus cálculos de rutas y tiempos de carga.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div 
              key={v.id} 
              className={`glass-card p-0 overflow-hidden relative group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                v.is_primary ? 'ring-2 ring-primary shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border border-neutral-800/50 hover:border-neutral-600'
              }`}
            >
              {/* Photo Area */}
              <div className="h-40 w-full bg-neutral-900 relative">
                {v.photo_url ? (
                  <img src={v.photo_url} alt={v.alias} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-black">
                    <Car className="w-16 h-16 text-neutral-700" />
                  </div>
                )}
                
                {v.is_primary && (
                  <div className="absolute top-3 left-3 bg-primary text-black text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <Star size={12} className="fill-black" /> PRINCIPAL
                  </div>
                )}
              </div>

              {/* Info Area */}
              <div className="p-5">
                <h4 className="text-lg font-bold text-white mb-1 truncate">{v.alias}</h4>
                <p className="text-sm text-primary font-semibold mb-4">
                  {v.vehicle_models?.vehicle_brands?.name} {v.vehicle_models?.name || 'Modelo Desconocido'}
                </p>

                <div className="flex gap-2">
                  {!v.is_primary && (
                    <button
                      onClick={() => setPrimary(v.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-all flex justify-center items-center gap-1"
                    >
                      <Star size={14} /> Seleccionar
                    </button>
                  )}
                  <button
                    onClick={() => startEditing(v)}
                    className="p-2 rounded-xl text-neutral-300 bg-white/5 border border-neutral-700 hover:bg-white/10 transition-all flex items-center justify-center"
                    title="Editar vehículo"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => deleteVehicle(v.id)}
                    className="p-2 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center justify-center"
                    title="Eliminar vehículo"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
