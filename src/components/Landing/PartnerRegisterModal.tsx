'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, Building2, MapPin, Zap, Clock, ShieldCheck, CheckCircle2, 
  Navigation, Camera, Image as ImageIcon, Scale, 
  DollarSign, ArrowRight, ArrowLeft, Trash2, Check, Sparkles, Sun,
  Compass, Radio, Layers
} from 'lucide-react';
import { createPartnerChargingPoint, saveHostSchedules } from '@/lib/services/partner';
import { validateHostPricing } from '@/lib/sustainability-core';
import { MapPicker } from '@/app/admin/puntos-carga/MapPicker';
import type { PartnerCategory, HostSchedule } from '@/types/partner';

interface PartnerRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PartnerRegisterModal: React.FC<PartnerRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [createdPointId, setCreatedPointId] = useState<string | null>(null);

  // Form State Step 1
  const [hostName, setHostName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [hostPhone, setHostPhone] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PartnerCategory>('particular_residencial');
  const [lotSurface, setLotSurface] = useState<'paved' | 'gravel' | 'grass'>('paved');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('Pichincha');
  const [city, setCity] = useState('Quito');
  const [lat, setLat] = useState<number>(-0.180653);
  const [lng, setLng] = useState<number>(-78.467838);
  const [connectorType, setConnectorType] = useState('GB/T (Estándar Chino / BYD)');
  const [powerKw, setPowerKw] = useState(7);
  const [pricePerHour, setPricePerHour] = useState(1.00);

  // Live ARCONEL Regulatory Compliance Verification
  const compliance = useMemo(() => {
    return validateHostPricing({
      power_kw: Number(powerKw) || 0,
      hourly_parking_price_usd: Number(pricePerHour) || 0,
    });
  }, [powerKw, pricePerHour]);
  
  // Photo State
  const [fachadaPhoto, setFachadaPhoto] = useState<string | null>(null);
  const [cargadorPhoto, setCargadorPhoto] = useState<string | null>(null);
  const [extraPhoto1, setExtraPhoto1] = useState<string | null>(null);
  const [extraPhoto2, setExtraPhoto2] = useState<string | null>(null);

  // Schedule Matrix State Step 2 (Lunes=1 to Domingo=0)
  const DAYS_NAME = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const [schedules, setSchedules] = useState<HostSchedule[]>(
    [1, 2, 3, 4, 5, 6, 0].map((day) => ({
      charging_point_id: '',
      day_of_week: day,
      open_time: '08:00',
      close_time: '20:00',
      slot_duration_minutes: 60,
      is_enabled: true,
    }))
  );

  if (!isOpen) return null;

  const handleGPSLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLat(pos.coords.latitude);
            setLng(pos.coords.longitude);
            setIsLocating(false);
          },
          (err2) => {
            console.warn('GPS high accuracy retry failed:', err2);
            setIsLocating(false);
            alert('No se pudo acceder al GPS. Haz clic sobre el mapa para ubicar tu punto.');
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  };

  const handleGeocodeDetails = (details: { address: string; province: string; city: string }) => {
    if (details.address) setAddress(details.address);
    if (details.province) setProvince(details.province);
    if (details.city) setCity(details.city);
  };

  const readPhotoFile = (file: File, callback: (result: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!compliance.is_valid) {
      alert(`⚠️ TARIFA BLOQUEADA POR COMPLIANCE LEGAL:\n\n${compliance.alert_message}\n\nAjusta la tarifa de parqueo por hora para cumplir con los topes de ARCONEL (${compliance.arconel_limit_usd_kwh} USD/kWh).`);
      return;
    }

    if (!fachadaPhoto || !cargadorPhoto) {
      alert('⚠️ Para publicar tu parqueo EV debes subir las 2 fotos obligatorias:\n\n1. Foto Fachada del Establecimiento\n2. Foto del Cargador / Conector');
      return;
    }

    setIsSubmitting(true);

    try {
      const allPhotoUrls = [fachadaPhoto, cargadorPhoto, extraPhoto1, extraPhoto2].filter(Boolean) as string[];

      const created = await createPartnerChargingPoint({
        host_name: hostName || 'Anfitrión ChargeWay',
        host_email: hostEmail || 'contacto@chargeway.ec',
        host_phone: hostPhone || '+593990001122',
        name: name || `Parqueo EV ${category.toUpperCase()}`,
        category,
        address: address || 'Dirección GPS Seleccionada',
        province: province || 'Pichincha',
        city: city || 'Quito',
        lat,
        lng,
        connector_type: connectorType,
        power_kw: Number(powerKw),
        price_per_hour: Number(pricePerHour),
        price_per_kwh: Number(compliance.equivalent_tariff_usd_kwh),
        photo_urls: allPhotoUrls,
      });

      setCreatedPointId(created.id);
      setStep(2);
    } catch (err) {
      console.error('Error registrando punto:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!createdPointId) return;
    setIsSubmitting(true);

    try {
      const finalSchedules = schedules.map((s) => ({ ...s, charging_point_id: createdPointId }));
      await saveHostSchedules(createdPointId, finalSchedules);
      if (onSuccess) onSuccess();
      setStep(3);
    } catch (err) {
      console.error('Error guardando horarios:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-[#070A0E]/90 backdrop-blur-2xl animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-5xl bg-[#0D121A] border border-white/[0.1] rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)] overflow-hidden text-[#E8EEF5] max-h-[92vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="px-7 py-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111722] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FFAA00] shadow-[0_0_20px_rgba(255,107,0,0.25)]">
              <Sun size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-extrabold text-white tracking-tight">
                  BECOME A CHARGEWAY HOST
                </h3>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FF6B00]/15 text-[#FFAA00] border border-[#FF6B00]/30">
                  Solar Amber
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-light">
                Habilita tu punto de recarga en el mapa de Ecuador y recibe reservas garantizadas.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStep(1);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* STEP 1: Layout 2 Columnas Asimétrico */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="p-7 overflow-y-auto space-y-6 flex-1 text-xs">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ── COLUMNA IZQUIERDA (6 COLUMNAS): LOCATION & MAPA GPS ── */}
              <div className="lg:col-span-6 space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#FFAA00] font-bold block">
                    Contact Name / Negocio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hostal El Volcán / Casa Particular"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="w-full bg-[#151D2A] border border-white/[0.08] focus:border-[#FF6B00]/70 rounded-xl px-4 py-2.5 text-white outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-neutral-400 font-mono text-[11px]">Correo *</label>
                    <input
                      type="email"
                      required
                      placeholder="email@hotel.com"
                      value={hostEmail}
                      onChange={(e) => setHostEmail(e.target.value)}
                      className="w-full bg-[#151D2A] border border-white/[0.08] focus:border-[#FF6B00]/70 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-neutral-400 font-mono text-[11px]">WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+593 99 123 4567"
                      value={hostPhone}
                      onChange={(e) => setHostPhone(e.target.value)}
                      className="w-full bg-[#151D2A] border border-white/[0.08] focus:border-[#FF6B00]/70 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>

                {/* Mapa GPS Interactivo */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-[#FFAA00] font-bold">
                      Location Address (GPS)
                    </label>
                    <button
                      type="button"
                      onClick={handleGPSLocation}
                      disabled={isLocating}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                    >
                      <Navigation size={11} className={isLocating ? 'animate-spin text-[#FF6B00]' : 'text-[#FF6B00]'} />
                      <span>{isLocating ? 'Obteniendo...' : 'GPS'}</span>
                    </button>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-white/[0.08] h-48 relative bg-[#0A0E14] shadow-inner">
                    <MapPicker
                      lat={lat}
                      lng={lng}
                      onChange={(newLat, newLng) => {
                        setLat(newLat);
                        setLng(newLng);
                      }}
                      onGeocodeDetails={handleGeocodeDetails}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-1">
                    <span>{address || 'Ubicación seleccionada'}</span>
                    <span className="text-[#FFAA00] font-bold">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                  </div>
                </div>

              </div>

              {/* ── COLUMNA DERECHA (6 COLUMNAS): ESPECIFICACIONES, TARIFA & FOTOS ── */}
              <div className="lg:col-span-6 space-y-5">
                
                {/* Tipo de Superficie / Parking Lot Type */}
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#FFAA00] font-bold block">
                    Parking Lot Surface
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['paved', 'gravel', 'grass'] as const).map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setLotSurface(type)}
                        className={`py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all cursor-pointer text-center ${
                          lotSurface === type
                            ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FFAA00] font-bold'
                            : 'bg-[#151D2A] border-white/[0.08] text-neutral-400'
                        }`}
                      >
                        {type === 'paved' ? 'Asfalto' : type === 'gravel' ? 'Lastre' : 'Césped'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potencia & Tarifa */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-neutral-300 font-mono text-[11px]">Potencia (kW)</label>
                    <input
                      type="number"
                      min={3.5}
                      max={150}
                      step={0.5}
                      value={powerKw}
                      onChange={(e) => setPowerKw(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#151D2A] border border-white/[0.08] focus:border-[#FF6B00]/70 rounded-xl px-3 py-2 text-white outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-neutral-300 font-mono text-[11px]">Tarifa ($/h)</label>
                      <span className="text-[#FFAA00] font-mono font-bold">${pricePerHour.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      min={0.25}
                      max={compliance.max_allowed_hourly_price_usd}
                      step={0.05}
                      value={pricePerHour}
                      onChange={(e) => setPricePerHour(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#151D2A] border border-white/[0.08] focus:border-[#FF6B00]/70 rounded-xl px-3 py-2 text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* ARCONEL Compliance Pill */}
                <div className="p-3 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-[#FFAA00] font-bold">
                    <ShieldCheck size={16} />
                    <span>ARCONEL Approved</span>
                  </div>
                  <span className="text-neutral-300 text-[10px]">
                    ${compliance.equivalent_tariff_usd_kwh}/kWh (Límite: ${compliance.arconel_limit_usd_kwh}/kWh)
                  </span>
                </div>

                {/* Dropzones de Fotos */}
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#FFAA00] font-bold block">
                    Upload Photos (2 Obligatorias)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    
                    {/* Foto 1 Fachada */}
                    <div className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center relative h-24 ${
                      fachadaPhoto ? 'border-[#FF6B00]/50 bg-[#151D2A]' : 'border-white/[0.08] bg-[#0E141E]'
                    }`}>
                      {fachadaPhoto ? (
                        <>
                          <img src={fachadaPhoto} alt="Fachada" className="w-full h-12 object-cover rounded-lg mb-0.5" />
                          <span className="text-[9px] text-[#FFAA00] font-bold">Fachada ✓</span>
                          <button type="button" onClick={() => setFachadaPhoto(null)} className="absolute top-1 right-1 p-0.5 bg-red-950/80 rounded text-red-400">
                            <Trash2 size={10} />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                          <Camera size={18} className="text-neutral-500 mb-0.5" />
                          <span className="text-[9px] font-bold text-white">1. Fachada</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) readPhotoFile(e.target.files[0], setFachadaPhoto); }} />
                        </label>
                      )}
                    </div>

                    {/* Foto 2 Cargador */}
                    <div className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center relative h-24 ${
                      cargadorPhoto ? 'border-[#FF6B00]/50 bg-[#151D2A]' : 'border-white/[0.08] bg-[#0E141E]'
                    }`}>
                      {cargadorPhoto ? (
                        <>
                          <img src={cargadorPhoto} alt="Cargador" className="w-full h-12 object-cover rounded-lg mb-0.5" />
                          <span className="text-[9px] text-[#FFAA00] font-bold">Cargador ✓</span>
                          <button type="button" onClick={() => setCargadorPhoto(null)} className="absolute top-1 right-1 p-0.5 bg-red-950/80 rounded text-red-400">
                            <Trash2 size={10} />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                          <Zap size={18} className="text-neutral-500 mb-0.5" />
                          <span className="text-[9px] font-bold text-white">2. Cargador</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) readPhotoFile(e.target.files[0], setCargadorPhoto); }} />
                        </label>
                      )}
                    </div>

                    {/* Foto 3 Extra */}
                    <div className="p-2.5 rounded-2xl border border-white/[0.06] bg-[#0E141E] flex flex-col items-center justify-center text-center relative h-24">
                      {extraPhoto1 ? (
                        <>
                          <img src={extraPhoto1} alt="Extra 1" className="w-full h-12 object-cover rounded-lg mb-0.5" />
                          <span className="text-[9px] text-neutral-300">Foto 3 ✓</span>
                          <button type="button" onClick={() => setExtraPhoto1(null)} className="absolute top-1 right-1 p-0.5 bg-red-950/80 rounded text-red-400">
                            <Trash2 size={10} />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                          <ImageIcon size={16} className="text-neutral-600 mb-0.5" />
                          <span className="text-[9px] text-neutral-400">3. Extra</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) readPhotoFile(e.target.files[0], setExtraPhoto1); }} />
                        </label>
                      )}
                    </div>

                    {/* Foto 4 Extra */}
                    <div className="p-2.5 rounded-2xl border border-white/[0.06] bg-[#0E141E] flex flex-col items-center justify-center text-center relative h-24">
                      {extraPhoto2 ? (
                        <>
                          <img src={extraPhoto2} alt="Extra 2" className="w-full h-12 object-cover rounded-lg mb-0.5" />
                          <span className="text-[9px] text-neutral-300">Foto 4 ✓</span>
                          <button type="button" onClick={() => setExtraPhoto2(null)} className="absolute top-1 right-1 p-0.5 bg-red-950/80 rounded text-red-400">
                            <Trash2 size={10} />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                          <ImageIcon size={16} className="text-neutral-600 mb-0.5" />
                          <span className="text-[9px] text-neutral-400">4. Extra</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) readPhotoFile(e.target.files[0], setExtraPhoto2); }} />
                        </label>
                      )}
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* Footer Botón */}
            <div className="pt-6 border-t border-white/[0.08] flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !compliance.is_valid}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFAA00] hover:brightness-110 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(255,107,0,0.35)] transition-all cursor-pointer inline-flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Guardando...' : 'SUBMIT HOST APPLICATION'}</span>
                <ArrowRight size={15} />
              </button>
            </div>

          </form>
        )}

        {/* STEP 2: Horarios */}
        {step === 2 && (
          <div className="p-7 overflow-y-auto space-y-6 flex-1 text-xs">
            <div className="space-y-1">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#FFAA00] font-bold">
                Días y Horarios de Atención
              </h4>
              <p className="text-neutral-400 text-xs font-light">
                Define las horas en las que los conductores podrán reservar tu punto de recarga.
              </p>
            </div>

            <div className="space-y-2">
              {schedules.map((schedule, idx) => (
                <div 
                  key={schedule.day_of_week} 
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    schedule.is_enabled 
                      ? 'bg-[#151D2A] border-white/[0.08]' 
                      : 'bg-[#0E141E] border-white/[0.03] opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      checked={schedule.is_enabled}
                      onChange={(e) => {
                        const next = [...schedules];
                        next[idx].is_enabled = e.target.checked;
                        setSchedules(next);
                      }}
                      className="w-4 h-4 rounded accent-[#FF6B00] cursor-pointer"
                    />
                    <span className="font-bold text-white text-xs font-mono">
                      {DAYS_NAME[schedule.day_of_week]}
                    </span>
                  </div>

                  {schedule.is_enabled ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500 text-[10px] font-mono">Apertura:</span>
                        <input
                          type="time"
                          value={schedule.open_time}
                          onChange={(e) => {
                            const next = [...schedules];
                            next[idx].open_time = e.target.value;
                            setSchedules(next);
                          }}
                          className="bg-[#0D121A] border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-mono outline-none"
                        />
                      </div>
                      <span className="text-neutral-600">-</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500 text-[10px] font-mono">Cierre:</span>
                        <input
                          type="time"
                          value={schedule.close_time}
                          onChange={(e) => {
                            const next = [...schedules];
                            next[idx].close_time = e.target.value;
                            setSchedules(next);
                          }}
                          className="bg-[#0D121A] border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-mono outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-xs italic font-mono">Cerrado</span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Volver</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Submit}
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFAA00] hover:brightness-110 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(255,107,0,0.35)] transition-all cursor-pointer inline-flex items-center gap-2 hover:scale-[1.02]"
              >
                <span>{isSubmitting ? 'Publicando...' : 'FINALIZAR Y PUBLICAR'}</span>
                <Check size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmación Exitosa */}
        {step === 3 && (
          <div className="p-10 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-[#FF6B00]/15 border border-[#FF6B00]/40 flex items-center justify-center text-[#FFAA00] shadow-[0_0_30px_rgba(255,107,0,0.35)]">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-2xl font-display font-extrabold text-white tracking-tight">
                ¡PUNTO HABILITADO CON ÉXITO!
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-light">
                Tu estación ya está integrada en el mapa nacional de ChargeWay con <strong className="text-[#FFAA00]">5 reservas gratuitas</strong> para recibir conductores.
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFAA00] text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
            >
              CERRAR / PANEL PRINCIPAL
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
