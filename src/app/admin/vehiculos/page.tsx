'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Car, Search, Edit2, Plus, Power, Activity } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo_url: string;
  is_active: boolean;
  models?: Model[];
}

interface Model {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  usable_battery_kwh: number;
  drag_coefficient: number;
  frontal_area_m2: number;
  weight_kg: number;
  peak_charging_kw: number;
  wltp_range_km: number;
  charger_type: string;
  commercial_range_km: number;
  commercial_standard: string;
  certificado_wltp: string;
  is_active: boolean;
}

export default function VehiculosAdminPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  
  // Editing state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'brand' | 'model'>('brand');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: brandsData, error: brandsError } = await supabase
        .from('vehicle_brands')
        .select('*')
        .order('name');
        
      if (brandsError) throw brandsError;
      
      const { data: modelsData, error: modelsError } = await supabase
        .from('vehicle_models')
        .select('*')
        .order('name');
        
      if (modelsError) throw modelsError;

      const formattedBrands = brandsData.map((b: any) => ({
        ...b,
        models: modelsData.filter((m: any) => m.brand_id === b.id)
      }));
      
      setBrands(formattedBrands);
    } catch (err) {
      console.error('Error loading vehicles data:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleBrandActive = async (brand: Brand) => {
    const newValue = !brand.is_active;
    await supabase.from('vehicle_brands').update({ is_active: newValue }).eq('id', brand.id);
    setBrands(brands.map(b => b.id === brand.id ? { ...b, is_active: newValue } : b));
  };

  const toggleModelActive = async (model: Model) => {
    const newValue = !model.is_active;
    await supabase.from('vehicle_models').update({ is_active: newValue }).eq('id', model.id);
    setBrands(brands.map(b => ({
      ...b,
      models: b.models?.map(m => m.id === model.id ? { ...m, is_active: newValue } : m)
    })));
  };

  const openBrandModal = (brand?: Brand) => {
    setModalType('brand');
    setEditingBrand(brand || { id: '', name: '', logo_url: '', is_active: true });
    setIsModalOpen(true);
  };

  const openModelModal = (brandId: string, model?: Model) => {
    setModalType('model');
    setEditingModel(model || { 
      id: '', brand_id: brandId, name: '', slug: '', 
      usable_battery_kwh: 50, drag_coefficient: 0.25, frontal_area_m2: 2.2,
      weight_kg: 1800, peak_charging_kw: 100, wltp_range_km: 400,
      charger_type: 'CCS2', commercial_range_km: 450, commercial_standard: 'WLTP',
      certificado_wltp: 'si', is_active: true 
    });
    setIsModalOpen(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    
    try {
      if (editingBrand.id) {
        // Update
        await supabase.from('vehicle_brands').update({ 
          name: editingBrand.name, logo_url: editingBrand.logo_url 
        }).eq('id', editingBrand.id);
      } else {
        // Insert
        await supabase.from('vehicle_brands').insert({ 
          name: editingBrand.name, logo_url: editingBrand.logo_url, is_active: true
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving brand:', err);
    }
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;
    
    try {
      const payload = {
        brand_id: editingModel.brand_id,
        name: editingModel.name,
        slug: editingModel.slug || editingModel.name.toLowerCase().replace(/\s+/g, '-'),
        usable_battery_kwh: Number(editingModel.usable_battery_kwh),
        drag_coefficient: Number(editingModel.drag_coefficient),
        frontal_area_m2: Number(editingModel.frontal_area_m2),
        weight_kg: Number(editingModel.weight_kg),
        peak_charging_kw: Number(editingModel.peak_charging_kw),
        wltp_range_km: Number(editingModel.wltp_range_km),
        charger_type: editingModel.charger_type,
        commercial_range_km: Number(editingModel.commercial_range_km),
        commercial_standard: editingModel.commercial_standard,
        certificado_wltp: editingModel.certificado_wltp,
      };

      if (editingModel.id) {
        await supabase.from('vehicle_models').update(payload).eq('id', editingModel.id);
      } else {
        await supabase.from('vehicle_models').insert({ ...payload, is_active: true });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving model:', err);
    }
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.models?.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Car className="text-emerald-500" />
            Administración de Vehículos
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Gestiona las marcas, modelos y especificaciones técnicas.
          </p>
        </div>
        
        <button 
          onClick={() => openBrandModal()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus size={18} />
          Nueva Marca
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar marca o modelo..."
          className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Activity className="animate-spin text-emerald-500" size={32} /></div>
      ) : (
        <div className="space-y-4">
          {filteredBrands.map(brand => (
            <div key={brand.id} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-800/40 transition-colors"
                onClick={() => setExpandedBrandId(expandedBrandId === brand.id ? null : brand.id)}
              >
                <div className="flex items-center gap-4">
                  {brand.logo_url && <img src={brand.logo_url} alt={brand.name} className="h-8 object-contain bg-white rounded p-1" />}
                  <h3 className="text-lg font-semibold text-white">{brand.name}</h3>
                  <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded-full">
                    {brand.models?.length || 0} modelos
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleBrandActive(brand); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      brand.is_active ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    <Power size={14} />
                    {brand.is_active ? 'Activa' : 'Inactiva'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openBrandModal(brand); }}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
              
              {expandedBrandId === brand.id && (
                <div className="p-4 border-t border-neutral-800 bg-neutral-900/20">
                  <div className="mb-4 flex justify-between items-center">
                    <h4 className="text-sm font-medium text-neutral-400">Modelos Disponibles</h4>
                    <button 
                      onClick={() => openModelModal(brand.id)}
                      className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Plus size={16} /> Añadir Modelo
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {brand.models?.map(model => (
                      <div key={model.id} className="bg-neutral-800/40 rounded-xl p-3 border border-neutral-700/50 flex flex-col justify-between group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="text-white font-medium">{model.name}</h5>
                            <p className="text-xs text-neutral-400">WLTP: {model.wltp_range_km}km • Bat: {model.usable_battery_kwh}kWh</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => toggleModelActive(model)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                model.is_active ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20' : 'text-red-400 bg-red-400/10 hover:bg-red-400/20'
                              }`}
                              title={model.is_active ? 'Deshabilitar' : 'Habilitar'}
                            >
                              <Power size={14} />
                            </button>
                            <button 
                              onClick={() => openModelModal(brand.id, model)}
                              className="p-1.5 text-neutral-400 hover:text-white bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-neutral-900 px-2 py-1 rounded text-neutral-300">Pico: {model.peak_charging_kw}kW</span>
                          <span className="bg-neutral-900 px-2 py-1 rounded text-neutral-300">{model.charger_type}</span>
                        </div>
                      </div>
                    ))}
                    {(!brand.models || brand.models.length === 0) && (
                      <p className="text-sm text-neutral-500 italic col-span-2">No hay modelos registrados para esta marca.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-neutral-900">
              <h2 className="text-xl font-bold text-white">
                {modalType === 'brand' ? (editingBrand?.id ? 'Editar Marca' : 'Nueva Marca') : (editingModel?.id ? 'Editar Modelo' : 'Nuevo Modelo')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6">
              {modalType === 'brand' && editingBrand ? (
                <form onSubmit={handleSaveBrand} className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Nombre de la Marca</label>
                    <input required type="text" value={editingBrand.name} onChange={e => setEditingBrand({...editingBrand, name: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">URL del Logo (Opcional)</label>
                    <input type="text" value={editingBrand.logo_url} onChange={e => setEditingBrand({...editingBrand, logo_url: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-300 hover:text-white">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">Guardar</button>
                  </div>
                </form>
              ) : modalType === 'model' && editingModel ? (
                <form onSubmit={handleSaveModel} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Nombre del Modelo</label>
                      <input required type="text" value={editingModel.name} onChange={e => setEditingModel({...editingModel, name: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Slug (Identificador único)</label>
                      <input required type="text" value={editingModel.slug} onChange={e => setEditingModel({...editingModel, slug: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Batería Utilizable (kWh)</label>
                      <input required type="number" step="0.1" value={editingModel.usable_battery_kwh} onChange={e => setEditingModel({...editingModel, usable_battery_kwh: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Autonomía Real WLTP (km)</label>
                      <input required type="number" value={editingModel.wltp_range_km} onChange={e => setEditingModel({...editingModel, wltp_range_km: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Coeficiente Aerodinámico (Cd)</label>
                      <input required type="number" step="0.01" value={editingModel.drag_coefficient} onChange={e => setEditingModel({...editingModel, drag_coefficient: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Área Frontal (m²)</label>
                      <input required type="number" step="0.01" value={editingModel.frontal_area_m2} onChange={e => setEditingModel({...editingModel, frontal_area_m2: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Peso (kg)</label>
                      <input required type="number" value={editingModel.weight_kg} onChange={e => setEditingModel({...editingModel, weight_kg: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Pico de Carga Rápida (kW)</label>
                      <input required type="number" value={editingModel.peak_charging_kw} onChange={e => setEditingModel({...editingModel, peak_charging_kw: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Tipo de Cargador</label>
                      <select required value={editingModel.charger_type} onChange={e => setEditingModel({...editingModel, charger_type: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white">
                        <option value="CCS1">CCS1</option>
                        <option value="CCS2">CCS2</option>
                        <option value="GB/T">GB/T</option>
                        <option value="CHAdeMO">CHAdeMO</option>
                        <option value="Tesla">Tesla (NACS)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Autonomía Comercial (Catálogo)</label>
                      <input required type="number" value={editingModel.commercial_range_km} onChange={e => setEditingModel({...editingModel, commercial_range_km: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white" />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Estándar Comercial</label>
                      <select required value={editingModel.commercial_standard} onChange={e => setEditingModel({...editingModel, commercial_standard: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white">
                        <option value="WLTP">WLTP</option>
                        <option value="CLTC">CLTC</option>
                        <option value="NEDC">NEDC</option>
                        <option value="EPA">EPA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">¿Certificado Oficial WLTP?</label>
                      <select required value={editingModel.certificado_wltp} onChange={e => setEditingModel({...editingModel, certificado_wltp: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white">
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-neutral-900 border-t border-neutral-800 py-4 mt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-300 hover:text-white">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">Guardar Modelo</button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
