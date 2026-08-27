'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Camera, CheckCircle2, AlertCircle, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MapPicker } from '@/app/admin/puntos-carga/MapPicker';

interface ReportChargerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPERADORES = [
  'EEQ (Empresa Eléctrica Quito)', 'CENTROSUR', 'EERSA', 'CNEL EP',
  'BYD Ecuador', 'Porsche / Volkswagen', 'Mobil / Primax', 'Condor Charge',
  'Evinka Conect', 'Comunidad BYD', 'Privado / Particular', 'Otro'
];

const TIPOS_CONECTOR = [
  'CCS2 (Combo 2 DC)', 'CCS1 (Combo 1 DC)', 'CHAdeMO (DC)',
  'Type 2 (Mennekes AC)', 'Type 1 (J1772 AC)', 'GB/T (Estándar Chino)',
  'Tesla Supercharger / NACS', '220V 32A Pata Gallina', 'Schuko Doméstico'
];

const VELOCIDADES = [
  '🟢 RÁPIDA',
  '🟡 SEMI-RÁPIDA',
  '🟠 NORMAL',
  '⚫ PRIVADA / RESTRINGIDA'
];

const POTENCIAS = [
  '3.5 kW', '7 kW', '11 kW', '22 kW', '40 kW', '50 kW',
  '60 kW', '90 kW', '100 kW', '120 kW', '150 kW+'
];

const HORARIOS = [
  '24/7 (Acceso Continuo)',
  'Horario Comercial (08:00 - 18:00)',
  'Horario Nocturno',
  'Previa Cita / Agendamiento'
];

const COSTOS = [
  'Gratuito',
  'Gratuito para Clientes',
  'De Pago (Tarifa kWh)',
  'Solo Miembros BYD',
  'Consultar en Sitio'
];

function mapRegion(province: string) {
  const p = (province || '').toUpperCase();
  if (p.includes('GUAYAS') || p.includes('MANABI') || p.includes('SANTA ELENA') || p.includes('EL ORO') || p.includes('LOS RIOS') || p.includes('ESMERALDAS')) {
    return 'Costa';
  }
  if (p.includes('NAPO') || p.includes('PASTAZA') || p.includes('MORONA') || p.includes('SUCUMBIOS') || p.includes('ORELLANA') || p.includes('ZAMORA')) {
    return 'Amazonía';
  }
  return 'Sierra';
}

export const ReportChargerModal: React.FC<ReportChargerModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [operator, setOperator] = useState(OPERADORES[0]);
  const [chargerType, setChargerType] = useState(TIPOS_CONECTOR[0]);
  const [speed, setSpeed] = useState(VELOCIDADES[0]);
  const [power, setPower] = useState('50 kW');
  const [schedule, setSchedule] = useState(HORARIOS[0]);
  const [costType, setCostType] = useState(COSTOS[0]);
  const [lat, setLat] = useState<number>(-0.180653);
  const [lng, setLng] = useState<number>(-78.467838);

  // Background geocoded data for DB submission
  const [detectedProvince, setDetectedProvince] = useState('Pichincha');
  const [detectedCity, setDetectedCity] = useState('Quito');

  const [userEmail, setUserEmail] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-load current user GPS location when modal opens
  useEffect(() => {
    if (isOpen) {
      handleGPSLocation();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGeocodeDetails = (details: { address: string; province: string; city: string }) => {
    if (details.province) setDetectedProvince(details.province);
    if (details.city) setDetectedCity(details.city);
  };

  const handleGPSLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = parseFloat(pos.coords.latitude.toFixed(6));
          const newLng = parseFloat(pos.coords.longitude.toFixed(6));
          setLat(newLat);
          setLng(newLng);
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('La foto no debe superar los 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: `${name} (${operator})`,
        region: mapRegion(detectedProvince),
        province: detectedProvince || 'Pichincha',
        city_or_canton: detectedCity || 'Quito',
        lat,
        lng,
        speed,
        charger_type: chargerType,
        power,
        schedule,
        cost_type: costType,
        photo_url: photoPreview || null,
        gps_link: `https://maps.google.com/?q=${lat},${lng}`,
        is_active: false // Inactive pending admin approval!
      };

      const res = await fetch('/api/report-charger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();

      if (!res.ok || resData.error) {
        console.error('Error from report-charger API:', resData.error);
        setErrorMsg(resData.error || 'Error guardando el reporte. Por favor reintenta.');
        return;
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error reporting charger:', err);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#0A121E] border border-emerald-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-6">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F1B2B] border-b border-emerald-500/20 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-lg">
              ⚡
            </span>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Reportar Nuevo Punto de Carga</h3>
              <p className="text-xs text-neutral-400">Mapa cargado automáticamente en tu ubicación actual</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-xl font-bold text-white">¡Reporte Enviado con Éxito!</h4>
            <p className="text-sm text-neutral-300 max-w-md">
              El equipo de administración revisará la ubicación y activará la electrolinera en la red en vivo. ¡Gracias por contribuir!
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto custom-scrollbar">
            
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECCIÓN 1: Mapa en Ubicación Actual */}
            <div className="space-y-2 bg-[#050B14] p-3.5 rounded-2xl border border-emerald-500/30">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                  <MapPin size={15} /> Ubicación del Punto en el Mapa *
                </label>
                <button
                  type="button"
                  onClick={handleGPSLocation}
                  disabled={isLocating}
                  className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Navigation size={13} className={isLocating ? 'animate-spin' : ''} />
                  <span>{isLocating ? 'Cargando GPS...' : 'Mi Ubicación Actual'}</span>
                </button>
              </div>

              {/* MapPicker interactivo cargado en la ubicación actual */}
              <MapPicker
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng) => {
                  setLat(parseFloat(newLat.toFixed(6)));
                  setLng(parseFloat(newLng.toFixed(6)));
                }}
                onGeocodeDetails={handleGeocodeDetails}
              />

              <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 pt-1">
                <span>Coordenadas seleccionadas:</span>
                <span className="text-emerald-400 font-bold">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
              </div>
            </div>

            {/* SECCIÓN 2: Información del Establecimiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Nombre del Punto / Establecimiento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Supermaxi Cumbayá"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Operador / Empresa *
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {OPERADORES.map((op) => (
                    <option key={op} value={op} className="bg-[#0A121E]">{op}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECCIÓN 3: Especificaciones Técnicas del Cargador */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Tipo de Conector *
                </label>
                <select
                  value={chargerType}
                  onChange={(e) => setChargerType(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {TIPOS_CONECTOR.map((tc) => (
                    <option key={tc} value={tc} className="bg-[#0A121E]">{tc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Velocidad *
                </label>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {VELOCIDADES.map((v) => (
                    <option key={v} value={v} className="bg-[#0A121E]">{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Potencia *
                </label>
                <select
                  value={power}
                  onChange={(e) => setPower(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {POTENCIAS.map((p) => (
                    <option key={p} value={p} className="bg-[#0A121E]">{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECCIÓN 4: Horario & Costo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Horario de Atención *
                </label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {HORARIOS.map((h) => (
                    <option key={h} value={h} className="bg-[#0A121E]">{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Tipo de Costo / Tarifa *
                </label>
                <select
                  value={costType}
                  onChange={(e) => setCostType(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {COSTOS.map((c) => (
                    <option key={c} value={c} className="bg-[#0A121E]">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECCIÓN 5: Fotografía & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Fotografía del Cargador *
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3.5 py-2 bg-[#050B14] border border-dashed border-emerald-500/40 hover:border-emerald-400 rounded-xl text-xs text-neutral-300 cursor-pointer transition-colors w-full">
                    <Camera size={16} className="text-emerald-400 shrink-0" />
                    <span className="truncate">Subir Foto del Cargador</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {photoPreview && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/50 shrink-0">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 font-bold mb-1">
                  Email de Contacto (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="tuemail@ejemplo.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-[#050B14] border border-[#1E3A2F] rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 flex justify-end gap-3 border-t border-[#1E3A2F]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                {isSubmitting ? 'Enviando Reporte...' : 'Enviar Reporte para Validación'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
