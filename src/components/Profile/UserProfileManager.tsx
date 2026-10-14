'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTripStore } from '@/lib/store/useTripStore';
import { 
  User, Mail, Phone, ShieldCheck, CheckCircle2, 
  Loader2, Save, Car, ExternalLink, Calendar, Sparkles
} from 'lucide-react';

interface UserProfileManagerProps {
  userId: string;
  onClose?: () => void;
  onSwitchTab?: (tab: 'garage' | 'locations' | 'history') => void;
}

export const UserProfileManager: React.FC<UserProfileManagerProps> = ({ 
  userId, 
  onClose,
  onSwitchTab 
}) => {
  const user = useTripStore((state) => state.user);
  const selectedVehicle = useTripStore((state) => state.selectedVehicle);
  const updateUserProfile = useTripStore((state) => state.updateUserProfile);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
      // Read phone from localStorage or metadata
      const storedPhone = localStorage.getItem(`chargeway_phone_${user.id}`);
      if (storedPhone) setPhone(storedPhone);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('El nombre no puede estar vacío.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      // 1. Update Supabase public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Save phone locally or in user metadata
      if (phone.trim()) {
        localStorage.setItem(`chargeway_phone_${userId}`, phone.trim());
      } else {
        localStorage.removeItem(`chargeway_phone_${userId}`);
      }

      // 3. Update global store instantly
      updateUserProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrorMsg(err.message || 'Error al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('es-EC', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Top Profile Card Summary */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/60 to-slate-900/90 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-lg relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || 'Avatar'}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md shadow-black/40"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-neutral-400">
              <User size={36} />
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-black rounded-lg shadow-sm" title="Cuenta Activa">
            <CheckCircle2 size={13} className="stroke-[3]" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-xl font-black text-white tracking-tight truncate">
              {fullName || 'Conductor EV'}
            </h3>
            {user?.is_admin ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono uppercase flex items-center gap-1">
                <ShieldCheck size={11} /> Admin
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono uppercase flex items-center gap-1">
                <Sparkles size={11} /> Conductor Verificado
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 font-mono flex items-center justify-center sm:justify-start gap-1.5 truncate">
            <Mail size={13} className="text-neutral-500 shrink-0" />
            <span>{user?.email}</span>
          </p>
          {formattedDate && (
            <p className="text-[11px] text-neutral-500 flex items-center justify-center sm:justify-start gap-1.5">
              <Calendar size={12} className="text-neutral-600" />
              <span>Miembro desde: {formattedDate}</span>
            </p>
          )}
        </div>

        {user?.is_admin && (
          <a
            href="/admin"
            className="sm:self-start px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 transition"
          >
            <span>Panel Admin</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSave} className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <User size={16} className="text-emerald-400" />
            Editar Información Personal
          </h4>
          <span className="text-[11px] font-mono text-neutral-500">ID: {userId.substring(0, 8)}...</span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>¡Tu perfil ha sido actualizado con éxito!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-neutral-300 font-medium">
              Nombre Completo <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Boris Castro"
              className="w-full bg-slate-950/80 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition"
              required
            />
          </div>

          {/* Email (Readonly) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-neutral-300 font-medium flex items-center justify-between">
              <span>Correo Electrónico</span>
              <span className="text-[10px] text-emerald-400">Verificado</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-neutral-400 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-neutral-300 font-medium">
              URL de Foto de Perfil
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://ejemplo.com/avatar.jpg"
              className="w-full bg-slate-950/80 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition"
            />
            <p className="text-[10px] text-neutral-500">
              Usa la foto de tu cuenta Google o pega un enlace HTTPS directo.
            </p>
          </div>

          {/* Phone / WhatsApp */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-neutral-300 font-medium flex items-center gap-1.5">
              <Phone size={12} className="text-neutral-400" />
              <span>Teléfono / WhatsApp</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. +593 99 123 4567"
              className="w-full bg-slate-950/80 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition"
            />
            <p className="text-[10px] text-neutral-500">
              Para contacto de soporte y confirmaciones de reservas.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/5">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick shortcuts to other tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Active vehicle card */}
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Car size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Vehículo Activo</span>
              <span className="text-xs font-bold text-white truncate block">
                {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Sin vehículo asignado'}
              </span>
            </div>
          </div>
          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab('garage')}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-mono font-medium border border-white/5 transition shrink-0 cursor-pointer"
            >
              Ver Garaje →
            </button>
          )}
        </div>

        {/* Favorite locations card */}
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Rutas Guardadas</span>
              <span className="text-xs font-bold text-white truncate block">
                Destinos & Electrolineras
              </span>
            </div>
          </div>
          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab('locations')}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-medium border border-white/5 transition shrink-0 cursor-pointer"
            >
              Destinos →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
