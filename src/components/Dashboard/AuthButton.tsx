'use client';

import React from 'react';
import { useTripStore } from '@/lib/store/useTripStore';
import { LogOut, User, Loader2 } from 'lucide-react';

export const AuthButton: React.FC = () => {
  const { user, isLoadingUser, loginWithGoogle, logout } = useTripStore();

  if (isLoadingUser) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-4 rounded-2xl flex justify-center items-center gap-2">
        <Loader2 size={16} className="animate-spin text-emerald-500" />
        <span className="text-xs text-neutral-400">Verificando sesión...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-3 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || 'Usuario'}
              className="w-8 h-8 rounded-full object-cover border border-neutral-700 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
              <User size={14} className="text-neutral-400" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">{user.full_name || 'Conductor EV'}</span>
            <span className="text-[10px] text-neutral-500 truncate">{user.email}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 border border-neutral-700/50 hover:border-rose-500/30 transition-all cursor-pointer"
          title="Cerrar Sesión"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={loginWithGoogle}
      className="w-full bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700/80 text-white rounded-2xl p-3.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-black/20 hover:shadow-black/40 cursor-pointer"
    >
      {/* Google Icon SVG */}
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
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
      <span>Iniciar Sesión con Google</span>
    </button>
  );
};
