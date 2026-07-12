'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Car,
  Zap,
  LogOut,
  ChevronRight,
  Loader2,
  Activity,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/admin/fabricantes', label: 'Fabricantes EV', icon: Activity },
  { href: '/admin/operadores', label: 'Operadores de Carga', icon: Zap },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'denied'>('loading');
  const [adminUser, setAdminUser] = useState<{ name: string; email: string; avatar: string } | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('denied'); router.replace('/'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, full_name, email, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_admin) { setStatus('denied'); router.replace('/'); return; }

      setAdminUser({
        name: profile.full_name || session.user.email || 'Admin',
        email: profile.email || session.user.email || '',
        avatar: profile.avatar_url || '',
      });
      setStatus('authorized');
    }
    checkAdmin();
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050508' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
              <img src="/logo.png" alt="ChargeWay" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-2xl border border-emerald-400/20 animate-ping pointer-events-none" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 size={15} className="animate-spin text-emerald-500" />
            <span className="text-neutral-400 text-sm font-medium">Verificando acceso…</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'denied') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#050508' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="w-64 shrink-0 flex flex-col"
        style={{
          background: 'rgba(10, 10, 15, 0.98)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-xl overflow-hidden"
                style={{ boxShadow: '0 0 20px rgba(16,185,129,0.3)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <img src="/logo.png" alt="ChargeWay" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <p className="text-white font-extrabold text-sm leading-tight tracking-tight">ChargeWay</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.12em]">Panel Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          <p className="text-neutral-600 text-[9px] font-bold uppercase tracking-widest px-3 mb-2">Navegación</p>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative"
                style={active ? {
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                } : {
                  border: '1px solid transparent',
                  color: '#737373',
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: '#10b981' }}
                  />
                )}
                <Icon
                  size={15}
                  style={{ color: active ? '#34d399' : '#525252' }}
                  className="transition-colors group-hover:text-neutral-300"
                />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={13} style={{ color: '#10b981', opacity: 0.7 }} />}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {/* User footer */}
        <div className="px-4 py-4">
          <div
            className="rounded-xl p-3 mb-3 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {adminUser?.avatar ? (
              <img
                src={adminUser.avatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0"
                style={{ border: '2px solid rgba(16,185,129,0.3)' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                {adminUser?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{adminUser?.name}</p>
              <p className="text-neutral-600 text-[10px] truncate">{adminUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-500 hover:text-rose-400 text-xs font-medium transition-all duration-200 cursor-pointer"
            style={{ background: 'transparent' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)';
              (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(239,68,68,0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.border = '1px solid transparent';
            }}
          >
            <LogOut size={12} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main
        className="flex-1 overflow-auto"
        style={{ background: 'linear-gradient(135deg, #050508 0%, #070710 100%)' }}
      >
        {/* Top header bar */}
        <div
          className="px-8 py-4 flex items-center justify-between sticky top-0 z-10"
          style={{
            background: 'rgba(5,5,8,0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center gap-2 text-neutral-500 text-xs">
            <Activity size={13} className="text-emerald-500" />
            <span>ChargeWay</span>
            <ChevronRight size={11} />
            <span className="text-neutral-300">Panel de Administración</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
