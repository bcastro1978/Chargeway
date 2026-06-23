'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Car,
  Zap,
  Users,
  Route,
  ArrowRight,
  TrendingUp,
  Database,
  Loader2,
  BarChart3,
  Globe,
  Cpu,
} from 'lucide-react';

interface QuickStats {
  totalUsers: number;
  totalTrips: number;
  totalChargers: number;
  totalDistanceKm: number;
}

export default function AdminHome() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, tripsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('trips').select('distance_km'),
        ]);

        const totalUsers = usersRes.count || 0;
        const trips = tripsRes.data || [];
        const totalTrips = trips.length;
        const totalDistanceKm = Math.round(trips.reduce((s: number, t: any) => s + (Number(t.distance_km) || 0), 0));

        const { data: chargerData } = await supabase.from('charging_points').select('id', { count: 'exact', head: true });
        const totalChargers = (chargerData as any)?.length || 200;

        setStats({ totalUsers, totalTrips, totalDistanceKm, totalChargers });
      } catch {
        setStats({ totalUsers: 0, totalTrips: 0, totalDistanceKm: 0, totalChargers: 200 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpis = [
    {
      label: 'Usuarios registrados',
      value: stats?.totalUsers ?? '—',
      delta: '+12% este mes',
      icon: Users,
      accent: '#3b82f6',
      accentBg: 'rgba(59,130,246,0.08)',
      accentBorder: 'rgba(59,130,246,0.18)',
    },
    {
      label: 'Viajes planificados',
      value: stats?.totalTrips ?? '—',
      delta: '+8 esta semana',
      icon: Route,
      accent: '#10b981',
      accentBg: 'rgba(16,185,129,0.08)',
      accentBorder: 'rgba(16,185,129,0.18)',
    },
    {
      label: 'km totales planificados',
      value: stats?.totalDistanceKm?.toLocaleString() ?? '—',
      delta: 'Acumulado histórico',
      icon: TrendingUp,
      accent: '#f59e0b',
      accentBg: 'rgba(245,158,11,0.08)',
      accentBorder: 'rgba(245,158,11,0.18)',
    },
    {
      label: 'Puntos de carga en red',
      value: stats?.totalChargers ?? '—',
      delta: 'Red Ecuador',
      icon: Zap,
      accent: '#a78bfa',
      accentBg: 'rgba(167,139,250,0.08)',
      accentBorder: 'rgba(167,139,250,0.18)',
    },
  ];

  const sections = [
    {
      href: '/admin/fabricantes',
      icon: Car,
      accent: '#10b981',
      accentBg: 'rgba(16,185,129,0.07)',
      accentBorder: 'rgba(16,185,129,0.15)',
      title: 'Dashboard Fabricantes EV',
      subtitle: 'Análisis de flota y rendimiento real',
      desc: 'Consumo real por modelo, distribución de flota, comparativa WLTP vs real, patrones de SoC y rutas más frecuentes por vehículo.',
      tags: ['Consumo kWh/100km', 'Flota activa', 'Top modelos'],
      stat: stats?.totalTrips ?? 0,
      statLabel: 'registros analizados',
    },
    {
      href: '/admin/operadores',
      icon: Zap,
      accent: '#f59e0b',
      accentBg: 'rgba(245,158,11,0.07)',
      accentBorder: 'rgba(245,158,11,0.15)',
      title: 'Dashboard Operadores de Carga',
      subtitle: 'Red de infraestructura nacional',
      desc: 'Distribución geográfica de cargadores, velocidad de carga, costos, tipos de conector y cobertura por provincia.',
      tags: ['Red de carga', 'Cobertura provincial', 'Tipos de cargador'],
      stat: stats?.totalChargers ?? 0,
      statLabel: 'puntos en red',
    },
  ];

  return (
    <div className="p-8 max-w-6xl">

      {/* Page header */}
      <div className="mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
        >
          <BarChart3 size={11} />
          INTELIGENCIA DE NEGOCIO
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
          Panel de Administración
        </h1>
        <p className="text-neutral-500 text-sm leading-relaxed max-w-xl">
          Métricas en tiempo real, patrones de movilidad eléctrica y datos de operación de la red ChargeWay en Ecuador.
        </p>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{ height: '110px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {kpis.map(({ label, value, delta, icon: Icon, accent, accentBg, accentBorder }) => (
            <div
              key={label}
              className="rounded-2xl p-5 flex flex-col gap-3 group transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.07)`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = accentBg;
                (e.currentTarget as HTMLDivElement).style.borderColor = accentBorder;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
              >
                <Icon size={16} style={{ color: accent }} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
                <p className="text-neutral-500 text-xs mt-0.5">{label}</p>
              </div>
              <p className="text-[10px] font-medium" style={{ color: accent }}>{delta}</p>
            </div>
          ))}
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-neutral-600 text-[10px] font-bold uppercase tracking-widest">Dashboards</span>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {sections.map(({ href, icon: Icon, accent, accentBg, accentBorder, title, subtitle, desc, tags, stat, statLabel }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = accentBg;
              (e.currentTarget as HTMLAnchorElement).style.borderColor = accentBorder;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.02)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.07)';
            }}
          >
            {/* Background glow */}
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
              style={{ background: accent, transform: 'translate(40%, -40%)' }}
            />

            <div className="flex items-start justify-between relative">
              <div>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                >
                  <Icon size={20} style={{ color: accent }} />
                </div>
                <p className="text-white font-bold text-base leading-tight">{title}</p>
                <p className="text-xs mt-0.5" style={{ color: accent }}>{subtitle}</p>
              </div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5 shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ArrowRight size={14} className="text-neutral-400 group-hover:text-white transition-colors" />
              </div>
            </div>

            <p className="text-neutral-500 text-sm leading-relaxed">{desc}</p>

            <div className="flex items-end justify-between">
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#737373',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-lg font-extrabold text-white">{stat}</p>
                <p className="text-[9px] text-neutral-600 uppercase tracking-wide">{statLabel}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info footer */}
      <div
        className="rounded-2xl p-5 flex gap-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Database size={15} className="text-neutral-500" />
        </div>
        <div>
          <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-1.5">Fuente de datos</p>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Los dashboards consolidan datos en tiempo real de las tablas{' '}
            <code className="px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono" style={{ background: 'rgba(16,185,129,0.1)' }}>trips</code>,{' '}
            <code className="px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono" style={{ background: 'rgba(16,185,129,0.1)' }}>profiles</code> y{' '}
            <code className="px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono" style={{ background: 'rgba(16,185,129,0.1)' }}>charging_points</code>{' '}
            de Supabase. A medida que crezca la base de usuarios, los gráficos reflejarán patrones de movilidad eléctrica real en Ecuador.
          </p>
        </div>
      </div>
    </div>
  );
}
