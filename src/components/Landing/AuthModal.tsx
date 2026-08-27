'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, LogIn, Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useTripStore } from '@/lib/store/useTripStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithGoogle, user } = useTripStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Para simplificar, invocamos login por google o navegación a la app
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      
      {/* Modal Container */}
      <div className="bg-[#171a1f] border border-neutral-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-emerald-500/30 p-2 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(63,255,139,0.25)]">
            <Image
              src="/logo.png"
              alt="ChargeWay Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {isRegistering ? 'Crear Cuenta en ChargeWay' : 'Bienvenido a ChargeWay'}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Accede a la red inteligente de electrolineras y planificador de rutas para tu vehículo eléctrico en Ecuador.
          </p>
        </div>

        {/* Google OAuth Primary Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-white font-bold text-xs transition-all flex items-center justify-center gap-3 shadow-lg hover:border-emerald-500/40 cursor-pointer mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-neutral-800" />
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">o con email</span>
          <div className="flex-1 h-px bg-neutral-800" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="conductor@ejemplo.com"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full py-3.5 rounded-full bg-gradient-to-r from-[#006699] via-[#008888] to-[#059669] text-white font-semibold text-xs tracking-wide border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.55),inset_0_1px_2px_rgba(255,255,255,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <>
                <span>{isRegistering ? 'Registrarse Gratis' : 'Iniciar Sesión'}</span>
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-300 text-slate-950 flex items-center justify-center font-bold text-xs shadow-[0_2px_6px_rgba(0,0,0,0.4)] shrink-0 group-hover:translate-x-0.5 transition-transform">
                  →
                </div>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs text-neutral-400">
          {isRegistering ? (
            <p>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => setIsRegistering(false)}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Inicia Sesión aquí
              </button>
            </p>
          ) : (
            <p>
              ¿Nuevo en ChargeWay?{' '}
              <button
                onClick={() => setIsRegistering(true)}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Crea tu cuenta gratis
              </button>
            </p>
          )}
        </div>

        {/* Privacy Terms Notice */}
        <p className="text-[10px] text-neutral-500 text-center mt-6">
          Al ingresar, aceptas los Términos de Servicio y la Política de Privacidad de ChargeWay Ecuador.
        </p>

      </div>
    </div>
  );
};
