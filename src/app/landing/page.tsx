'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Car, Building2, Zap, ArrowRight, DollarSign, 
  MapPin, Sparkles, CheckCircle2, ChevronRight, Scale, 
  ShieldCheck, BatteryCharging, QrCode, Mountain, ArrowUpRight,
  TrendingDown, Check, Clock, Shield, Sliders, Sun, Compass,
  Layers, Radio, Activity, Navigation2, CheckCircle
} from 'lucide-react';

import { 
  validateHostPricing, 
  calculateHostProfitability, 
  calculateDeliveredEnergyKwh,
  ARCONEL_POWER_TIERS,
  FREE_MONTHLY_RESERVATIONS_PER_POINT,
  VOLUME_COMMISSION_RATE_PCT
} from '@/lib/sustainability-core';

// Modales interactivos
import { PartnerRegisterModal } from '@/components/Landing/PartnerRegisterModal';
import { PartnerReservationModal } from '@/components/Landing/PartnerReservationModal';
import { PartnerAdminPanelModal } from '@/components/Landing/PartnerAdminPanelModal';
import { ElectrolinerasMapModal } from '@/components/Landing/ElectrolinerasMapModal';

export default function AdventureTechEditorialLandingPage() {
  const router = useRouter();

  // Scroll Progress Engine
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNavScrolled, setIsNavScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroSectionRef.current) return;
      const rect = heroSectionRef.current.getBoundingClientRect();
      const maxScroll = rect.height - window.innerHeight;
      if (maxScroll > 0) {
        const progress = Math.max(0, Math.min(1, -rect.top / maxScroll));
        setScrollProgress(progress);
      }
      setIsNavScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const calcOpacity = (progress: number, enterStart: number, enterEnd: number, exitStart: number, exitEnd: number) => {
    if (progress < enterStart || progress > exitEnd) return 0;
    if (progress < enterEnd) return (progress - enterStart) / (enterEnd - enterStart);
    if (progress > exitStart) return Math.max(0, 1 - (progress - exitStart) / (exitEnd - exitStart));
    return 1.0;
  };

  const phase0Opacity = calcOpacity(scrollProgress, 0.0, 0.04, 0.22, 0.30);
  const phase1Opacity = calcOpacity(scrollProgress, 0.30, 0.38, 0.58, 0.68);
  const phase2Opacity = calcOpacity(scrollProgress, 0.68, 0.76, 0.92, 0.99);

  // Modales
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Estado del Simulador
  const [selectedPowerKw, setSelectedPowerKw] = useState<number>(7.0);
  const [hourlyPriceUsd, setHourlyPriceUsd] = useState<number>(1.10);
  const [monthlyReservations, setMonthlyReservations] = useState<number>(30);
  const [sessionHours, setSessionHours] = useState<number>(2);

  // Cálculos de Sostenibilidad y Monetización
  const compliance = validateHostPricing({
    power_kw: selectedPowerKw,
    hourly_parking_price_usd: hourlyPriceUsd,
  });

  const deliveredKwh = calculateDeliveredEnergyKwh(selectedPowerKw, sessionHours);
  const sessionProfit = calculateHostProfitability({
    delivered_energy_kwh: deliveredKwh,
    equivalent_tariff_usd_kwh: compliance.equivalent_tariff_usd_kwh,
    utility_buying_tariff_usd_kwh: 0.08,
  });

  const billableCount = Math.max(0, monthlyReservations - FREE_MONTHLY_RESERVATIONS_PER_POINT);
  const grossMonthly = sessionProfit.gross_revenue_usd * monthlyReservations;
  const energyCostMonthly = sessionProfit.energy_cost_usd * monthlyReservations;
  const hostBaseProfit = sessionProfit.net_profit_usd * monthlyReservations;
  const commissionMonthly = (sessionProfit.net_profit_usd * VOLUME_COMMISSION_RATE_PCT) * billableCount;
  const netMonthlyProfit = hostBaseProfit - commissionMonthly;

  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#E8EEF5] flex flex-col font-sans selection:bg-[#FF6B00] selection:text-white antialiased">
      
      {/* ── TIPOGRAFÍA EDITORIAL ADVENTURE TECH (SYNE + SPACE GROTESK + JETBRAINS MONO) ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <style jsx global>{`
        body {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          background-color: #0A0E14;
        }
        h1, h2, h3, .font-display {
          font-family: 'Syne', sans-serif;
          letter-spacing: -0.04em;
          text-transform: uppercase;
        }
        .font-mono {
          font-family: 'Space Mono', monospace;
        }
      `}</style>

      {/* ════════ 1. NAVBAR ASIMÉTRICO ADVENTURE TECH ════════ */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isNavScrolled 
          ? 'bg-[#0A0E14]/90 backdrop-blur-2xl border-b border-white/[0.08] py-3.5 shadow-2xl' 
          : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between">
          
          {/* Logo & Marca con Estilo Aventura */}
          <Link href="/landing" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#FF6B00]/40 shadow-[0_0_20px_rgba(255,107,0,0.3)] group-hover:scale-105 transition-all">
              <img
                src="/logo.png"
                alt="ChargeWay Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-display font-bold text-white tracking-tight">
                Charge<span className="text-[#FF6B00]">Way</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFAA00] font-bold">
                EC
              </span>
            </div>
          </Link>

          {/* Menú de Navegación Técnico */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-mono uppercase tracking-widest text-neutral-400">
            <a href="#adventure" className="hover:text-[#FFAA00] transition-colors flex items-center gap-1.5">
              <Compass size={13} className="text-[#FF6B00]" />
              <span>Rutas Andinas</span>
            </a>
            <a href="#host-section" className="hover:text-[#FFAA00] transition-colors flex items-center gap-1.5">
              <Building2 size={13} className="text-[#FF6B00]" />
              <span>Anfitriones</span>
            </a>
            <a href="#simulator" className="hover:text-[#FFAA00] transition-colors flex items-center gap-1.5">
              <Activity size={13} className="text-[#FF6B00]" />
              <span>Simulador</span>
            </a>
            <a href="#compliance" className="hover:text-[#FFAA00] transition-colors flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#FF6B00]" />
              <span>ARCONEL</span>
            </a>
          </nav>

          {/* CTAs de Alto Impacto */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider text-neutral-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
            >
              Registrar Hub
            </button>

            <button
              onClick={() => setIsMapModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFAA00] hover:brightness-110 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(255,107,0,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              Explorar Mapa
            </button>
          </div>

        </div>
      </header>

      {/* ════════ 2. 400vh PARALLAX HERO CON TELEMETRÍA GAUGE INTEGRADA ════════ */}
      <div id="hero-section" ref={heroSectionRef} className="relative h-[400vh] w-full">
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
          
          {/* Fondo Fotográfico de los Andes */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src="/assets/hero_ref.jpg"
              alt="Vehículo eléctrico en los Andes de Ecuador"
              className="w-full h-full object-cover transition-transform duration-75 ease-out"
              style={{
                transform: `scale(${1 + scrollProgress * 0.12}) translateY(${scrollProgress * 20}px)`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E14] via-[#0A0E14]/50 to-[#0A0E14]/75 pointer-events-none" />
          </div>

          {/* ── LOGO OFICIAL CHARGEWAY EN EL CUADRANTE SUPERIOR IZQUIERDO ── */}
          <div className="absolute top-24 sm:top-28 left-6 sm:left-14 z-20 w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border border-[#FF6B00]/40 shadow-[0_0_50px_rgba(255,107,0,0.35)] hover:scale-105 transition-all duration-300 group bg-[#0A0E14]/60 backdrop-blur-md">
            <img
              src="/logo.png"
              alt="ChargeWay Official Logo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* ── FASE 0: HERO EDITORIAL CON MEDIDOR CIRCULAR (0% - 25% SCROLL) ── */}
          <div 
            className="absolute bottom-16 sm:bottom-20 left-6 sm:left-14 right-6 sm:right-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8 pointer-events-none transition-all"
            style={{
              opacity: phase0Opacity,
              transform: `translateY(${-scrollProgress * 30}px)`
            }}
          >
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-[#FFAA00] font-bold block">
                Plataforma de Movilidad Eléctrica · Ecuador
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-white leading-[1.02] tracking-tight">
                Charge Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-[#FFAA00] to-amber-200">
                  Adventure.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-neutral-300 font-light max-w-lg leading-relaxed pt-1">
                La red de recarga inteligente para recorrer las carreteras andinas sin ansiedad de autonomía.
              </p>
            </div>

            {/* Medidor Circular de Telemetría (Widget de Aventura) */}
            <div className="p-5 rounded-3xl bg-[#111722]/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl flex items-center gap-5 shrink-0 self-start lg:self-auto">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-neutral-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#FF6B00]"
                    strokeDasharray="94, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-mono font-black text-white">94%</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFAA00] font-bold block">
                  Estado de Red
                </span>
                <span className="text-sm font-bold text-white block">150+ Puntos Operativos</span>
                <span className="text-[11px] font-mono text-neutral-400">Recuperación: +14.2 kWh</span>
              </div>
            </div>
          </div>

          {/* ── FASE 1: ANFITRIONES (30% - 60% SCROLL) ── */}
          <div 
            className="absolute top-1/3 right-6 sm:right-14 max-w-xl text-right pointer-events-none transition-all"
            style={{
              opacity: phase1Opacity,
              transform: `translateY(${(0.45 - scrollProgress) * 25}px)`
            }}
          >
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#FFAA00] block mb-3 font-semibold">
              ChargeWay Partner Program
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white leading-tight">
              Monetiza tu espacio de parqueo.
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 mt-4 font-light leading-relaxed">
              5 reservas mensuales libres de comisión y liquidación instantánea bajo normativa ARCONEL.
            </p>
          </div>

          {/* ── FASE 2: ECOSISTEMA (65% - 95% SCROLL) ── */}
          <div 
            className="absolute bottom-20 left-6 sm:left-14 max-w-xl pointer-events-none transition-all"
            style={{
              opacity: phase2Opacity,
              transform: `translateY(${(0.80 - scrollProgress) * 25}px)`
            }}
          >
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#FFAA00] block mb-3 font-semibold">
              Ecosistema Integral
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white leading-tight">
              Energía limpia en cada rincón de Ecuador.
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 mt-4 font-light leading-relaxed">
              Conduce con tranquilidad y expande la red de infraestructura nacional.
            </p>
          </div>

          {/* Scroll Scrubber */}
          <div className="absolute bottom-8 right-8 flex items-center gap-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest pointer-events-none">
            <span>Scroll</span>
            <div className="w-1 h-6 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="w-full bg-[#FF6B00] transition-all duration-75" 
                style={{ height: `${Math.max(20, scrollProgress * 100)}%` }} 
              />
            </div>
          </div>

        </div>
      </div>

      {/* ════════ 3. SECCIÓN EDITORIAL: POWERING REMOTE EXPLORATION ════════ */}
      <section id="adventure" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full space-y-12 border-t border-white/[0.08]">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#FFAA00] font-bold">
              Infraestructura y Tecnología
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white">
              Powering Remote Exploration.
            </h2>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-md font-light">
            Algoritmos avanzados de elevación andina y conectividad garantizada para toda la flota eléctrica de Ecuador.
          </p>
        </div>

        {/* 3 Tarjetas de Aventura Asimétricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-8 rounded-3xl bg-[#121824] border border-white/[0.08] hover:border-[#FF6B00]/40 transition-all space-y-4 shadow-xl group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FFAA00]">
                <Sun size={24} />
              </div>
              <span className="text-[10px] font-mono text-[#FFAA00] uppercase font-bold tracking-wider">01 / SOLAR</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Solar-Ready Hubs</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Estaciones diseñadas para integrar paneles solares y respaldo de batería en puntos estratégicos de alta montaña.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#121824] border border-white/[0.08] hover:border-[#FF6B00]/40 transition-all space-y-4 shadow-xl group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FFAA00]">
                <Mountain size={24} />
              </div>
              <span className="text-[10px] font-mono text-[#FFAA00] uppercase font-bold tracking-wider">02 / ALTITUD</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Modelado Topográfico</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Cálculo metro a metro de la regeneración por gravedad en bajadas andinas (hasta +18 kWh en la ruta Quito - Guayaquil).
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#121824] border border-white/[0.08] hover:border-[#FF6B00]/40 transition-all space-y-4 shadow-xl group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FFAA00]">
                <QrCode size={24} />
              </div>
              <span className="text-[10px] font-mono text-[#FFAA00] uppercase font-bold tracking-wider">03 / RESERVA</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Token QR Garantizado</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Reserva digital con verificación en destino que asegura tu espacio de parqueo y conexión antes de iniciar el viaje.
            </p>
          </div>

        </div>

      </section>

      {/* ════════ 4. SECCIÓN TIMELINE & ELEVATION PROFILE INTERACTIVO ════════ */}
      <section className="py-20 px-6 sm:px-12 bg-[#0E141E] border-y border-white/[0.08]">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#FFAA00] font-bold">
              Proceso de Habilitación
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
              Hosting Elevation Profile & Project Timeline
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm font-light max-w-xl">
              De la solicitud inicial a la puesta en marcha: un flujo transparente para convertir tu propiedad en un punto de recarga oficial.
            </p>
          </div>

          {/* Timeline Gráfico Escalonado SVG */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#121824] border border-white/[0.08] shadow-2xl relative overflow-hidden">
            <svg viewBox="0 0 800 200" className="w-full h-48 sm:h-56 overflow-visible">
              <defs>
                <linearGradient id="timelineAmberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Relleno de Curva de Elevación */}
              <path
                d="M 50,160 L 220,130 L 400,90 L 580,50 L 750,20 L 750,190 L 50,190 Z"
                fill="url(#timelineAmberGrad)"
              />
              <path
                d="M 50,160 L 220,130 L 400,90 L 580,50 L 750,20"
                fill="none"
                stroke="#FF6B00"
                strokeWidth="3"
              />

              {/* Hito 1 */}
              <circle cx="50" cy="160" r="6" fill="#FFAA00" stroke="#FFFFFF" strokeWidth="2" />
              <text x="50" y="145" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">1. Registro</text>
              <text x="50" y="180" textAnchor="middle" fill="#8B98A5" fontSize="9" fontFamily="monospace">0m · Solicitud</text>

              {/* Hito 2 */}
              <circle cx="220" cy="130" r="6" fill="#FFAA00" stroke="#FFFFFF" strokeWidth="2" />
              <text x="220" y="115" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">2. Inspección</text>
              <text x="220" y="150" textAnchor="middle" fill="#8B98A5" fontSize="9" fontFamily="monospace">150m · Validación Técnica</text>

              {/* Hito 3 */}
              <circle cx="400" cy="90" r="6" fill="#FFAA00" stroke="#FFFFFF" strokeWidth="2" />
              <text x="400" y="75" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">3. Compliance</text>
              <text x="400" y="110" textAnchor="middle" fill="#8B98A5" fontSize="9" fontFamily="monospace">300m · ARCONEL</text>

              {/* Hito 4 */}
              <circle cx="580" cy="50" r="6" fill="#FFAA00" stroke="#FFFFFF" strokeWidth="2" />
              <text x="580" y="35" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">4. Instalación</text>
              <text x="580" y="70" textAnchor="middle" fill="#8B98A5" fontSize="9" fontFamily="monospace">500m · Conectores</text>

              {/* Hito 5 (Meta) */}
              <circle cx="750" cy="20" r="8" fill="#FF6B00" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="750" y="5" textAnchor="middle" fill="#FFAA00" fontSize="12" fontWeight="bold">5. Go-Live ⚡</text>
              <text x="750" y="40" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace">650m · 5 Reservas Libres</text>
            </svg>

            <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-neutral-400 font-light">
                Empieza hoy mismo con <strong className="text-white">5 reservas al mes 100% gratuitas</strong>.
              </span>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFAA00] hover:brightness-110 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-lg cursor-pointer transition-all hover:scale-[1.02]"
              >
                Habilitar Mi Punto Ahora
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ════════ 5. SECCIÓN SIMULADOR FINANCIERO Y COMPLIANCE ════════ */}
      <section id="simulator" className="py-28 px-6 sm:px-12 max-w-7xl mx-auto w-full space-y-12">
        
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#FFAA00] font-bold">
            Simulador de Rentabilidad
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white">
            Calcula tus Ganancias Netas.
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm font-light">
            Esquema por volumen: 5 reservas mensuales libres ($0) y 20% de comisión sobre saldo prepagado desde la 6ª reserva.
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-[#121824] border border-white/[0.08] shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Controles de Configuración */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex justify-between">
                <span>Potencia Nominal del Cargador</span>
                <span className="text-[#FFAA00] font-bold">{selectedPowerKw} kW</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ARCONEL_POWER_TIERS.slice(0, 4).map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setSelectedPowerKw(tier.power_kw);
                      if (hourlyPriceUsd > tier.max_legal_hourly_price_usd) {
                        setHourlyPriceUsd(tier.max_legal_hourly_price_usd);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      selectedPowerKw === tier.power_kw
                        ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-white shadow-[0_0_15px_rgba(255,107,0,0.25)]'
                        : 'border-white/[0.08] bg-[#0A0E14] text-neutral-400 hover:border-white/20'
                    }`}
                  >
                    <div>{tier.power_kw} kW</div>
                    <div className="text-[10px] font-mono font-light text-neutral-500 mt-0.5">Tope: ${tier.max_legal_hourly_price_usd}/h</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider">
                <span className="text-neutral-300">Precio de Parqueo por Hora</span>
                <span className="text-[#FFAA00] text-base font-bold">${hourlyPriceUsd.toFixed(2)} USD/h</span>
              </div>
              <input
                type="range"
                min={0.50}
                max={compliance.max_allowed_hourly_price_usd}
                step={0.05}
                value={hourlyPriceUsd}
                onChange={(e) => setHourlyPriceUsd(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-light pt-1">
                <span>Tope legal ARCONEL-029/25: ${compliance.max_allowed_hourly_price_usd} USD/h</span>
                <span className="text-[#FFAA00] font-medium">✓ Tarifa 100% Legal</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex justify-between">
                  <span>Reservas / Mes</span>
                  <span className="text-white font-mono">{monthlyReservations}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={80}
                  step={1}
                  value={monthlyReservations}
                  onChange={(e) => setMonthlyReservations(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex justify-between">
                  <span>Horas por Sesión</span>
                  <span className="text-white font-mono">{sessionHours} h</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={sessionHours}
                  onChange={(e) => setSessionHours(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                />
              </div>
            </div>

          </div>

          {/* Resultado Panel */}
          <div className="lg:col-span-5 p-8 rounded-3xl bg-[#0A0E14] border border-white/[0.08] shadow-2xl flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FFAA00] font-bold block mb-2">
                Ganancia Neta Estimada
              </span>
              <div className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
                ${netMonthlyProfit.toFixed(2)} <span className="text-sm font-sans font-normal text-neutral-400">USD/mes</span>
              </div>
              <p className="text-xs text-neutral-400 font-light mt-1.5">
                Ingreso neto tras descontar costo de energía ($0.08/kWh) y comisión.
              </p>

              <div className="space-y-2.5 text-xs font-mono text-neutral-400 pt-6 border-t border-white/[0.06] mt-6">
                <div className="flex justify-between">
                  <span>Ingreso Bruto ({monthlyReservations} reservas):</span>
                  <span className="text-white font-bold">${grossMonthly.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Costo Eléctrico Estimado:</span>
                  <span className="text-red-400">-${energyCostMonthly.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cuota Gratuita (5 reservas):</span>
                  <span className="text-[#FFAA00]">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Comisión ChargeWay (20% en {billableCount} res.):</span>
                  <span className="text-[#FF6B00]">-${commissionMonthly.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFAA00] hover:brightness-110 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(255,107,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>Habilitar Mi Punto Ahora</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </section>

      {/* ════════ 6. MARCO REGULATORIO Y SEGURIDAD JURÍDICA ════════ */}
      <section id="compliance" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/[0.08] space-y-12">
        
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#FFAA00] font-bold">
            Marco Regulatorio Oficial
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
            100% Legal y Regulado en Ecuador.
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm font-light">
            Operaciones blindadas bajo la Ley Orgánica del Servicio Público de Energía Eléctrica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-[#121824] border border-white/[0.08] space-y-3">
            <h4 className="font-bold text-white text-base text-[#FFAA00]">Exención LOSPEE</h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              El servicio opera legalmente como arriendo de espacio físico de parqueo con infraestructura, exento de título habilitante de comercialización.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[#121824] border border-white/[0.08] space-y-3">
            <h4 className="font-bold text-white text-base text-[#FFAA00]">Topes ARCONEL-029/25</h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Control algorítmico preventivo que impide fijar tarifas por hora que excedan el límite regulatorio oficial por kWh, blindando al anfitrión.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[#121824] border border-white/[0.08] space-y-3">
            <h4 className="font-bold text-white text-base text-[#FFAA00]">Norma ARCERNNR-003/20</h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Alineación técnica con los estándares de conexión comercial a la red de las distribuidoras eléctricas (EEQ / CNEL EP).
            </p>
          </div>
        </div>

      </section>

      {/* ════════ 7. FOOTER EDITORIAL ADVENTURE TECH ════════ */}
      <footer className="w-full bg-[#070A0E] border-t border-white/[0.08] py-14 px-6 sm:px-12 text-neutral-500 font-sans text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ChargeWay Logo" className="w-8 h-8 rounded-lg object-cover opacity-80" />
            <div>
              <span className="text-sm font-display font-bold text-white">
                Charge<span className="text-[#FF6B00]">Way</span> AI
              </span>
              <p className="text-[10px] text-neutral-500 font-mono">Movilidad Eléctrica · Ecuador</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 text-xs font-mono uppercase tracking-wider text-neutral-400">
            <a href="#adventure" className="hover:text-[#FFAA00] transition-colors">Rutas Andinas</a>
            <a href="#host-section" className="hover:text-[#FFAA00] transition-colors">Anfitriones</a>
            <a href="#simulator" className="hover:text-[#FFAA00] transition-colors">Simulador</a>
            <Link href="/app" className="hover:text-[#FFAA00] transition-colors">Planificador Web</Link>
            <a href="mailto:chargewayec@gmail.com" className="hover:text-[#FFAA00] transition-colors">Contacto</a>
          </div>

          <p className="text-neutral-600 text-[11px] font-mono">
            © 2026 ChargeWay AI · Powered by SolAI Ecuador
          </p>

        </div>
      </footer>

      {/* ════════ MODALES INTERACTIVOS ════════ */}
      <PartnerRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      <PartnerAdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <ElectrolinerasMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onGoToPlanner={() => router.push('/app')}
      />

    </div>
  );
}
