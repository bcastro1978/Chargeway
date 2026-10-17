'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Car, Building2, Zap, ArrowRight, DollarSign, 
  MapPin, Sparkles, CheckCircle2, ChevronRight, Scale, 
  ShieldCheck, BatteryCharging, QrCode, Mountain, ArrowUpRight,
  TrendingDown, Check, Clock, Shield, Sliders, Sun, Compass,
  Layers, Radio, Activity, Navigation2, CheckCircle, Volume2,
  Leaf, Users, Award, Play, ExternalLink
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
import { PartnerAdminPanelModal } from '@/components/Landing/PartnerAdminPanelModal';
import { ElectrolinerasMapModal } from '@/components/Landing/ElectrolinerasMapModal';

// Rutas preconfiguradas para el widget de demostración interactivo
interface DemoRoute {
  id: string;
  name: string;
  origin: string;
  dest: string;
  distKm: number;
  altitudeM: number;
  region: string;
  regenKwh: number;
  baseKwh: number;
}

const DEMO_ROUTES: DemoRoute[] = [
  {
    id: 'cotacachi',
    name: 'Quito ➔ Cotacachi (115 km)',
    origin: 'Quito',
    dest: 'Cotacachi',
    distKm: 115,
    altitudeM: 2350,
    region: 'Sierra Andina',
    regenKwh: 4.2,
    baseKwh: 18.2,
  },
  {
    id: 'banos',
    name: 'Quito ➔ Baños (178 km)',
    origin: 'Quito',
    dest: 'Baños',
    distKm: 178,
    altitudeM: 1820,
    region: 'Avenida de los Volcanes',
    regenKwh: 6.8,
    baseKwh: 26.2,
  },
  {
    id: 'tulcan',
    name: 'Quito ➔ Tulcán (245 km)',
    origin: 'Quito',
    dest: 'Tulcán',
    distKm: 245,
    altitudeM: 2980,
    region: 'Corredor Norte (Carchi)',
    regenKwh: 5.1,
    baseKwh: 38.0,
  },
  {
    id: 'manta',
    name: 'Guayaquil ➔ Manta (198 km)',
    origin: 'Guayaquil',
    dest: 'Manta',
    distKm: 198,
    altitudeM: 15,
    region: 'Costa Pacífica',
    regenKwh: 1.5,
    baseKwh: 28.4,
  },
];

interface DemoVehicle {
  model: string;
  batteryKwh: number;
  brand: string;
  wltpKm: number;
}

const DEMO_VEHICLES: DemoVehicle[] = [
  { model: 'BYD T1 7', batteryKwh: 28.0, brand: 'BYD', wltpKm: 220 },
  { model: 'BYD Yuan Pro', batteryKwh: 38.8, brand: 'BYD', wltpKm: 320 },
  { model: 'Kia EV6 GT-Line', batteryKwh: 77.4, brand: 'Kia', wltpKm: 490 },
  { model: 'Tesla Model Y', batteryKwh: 60.0, brand: 'Tesla', wltpKm: 455 },
];

export default function PremiumScrollytellingLandingPage() {
  const router = useRouter();

  // Scroll Progress Engine
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNavScrolled, setIsNavScrolled] = useState(false);

  // Widget Interactivo de Telemetría (Hero)
  const [selectedRoute, setSelectedRoute] = useState<DemoRoute>(DEMO_ROUTES[0]);
  const [selectedVehicle, setSelectedVehicle] = useState<DemoVehicle>(DEMO_VEHICLES[0]);
  const [initialSoc, setInitialSoc] = useState<number>(85);

  // Corredor Activo en Scrollytelling
  const [activeCorridorTab, setActiveCorridorTab] = useState<'sierra' | 'costa' | 'amazonia' | 'valles'>('sierra');

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

  // Modales
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Estado del Simulador Anfitriones (ARCONEL)
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

  // Cálculo en vivo del Widget de Telemetría
  const batteryCapacity = selectedVehicle.batteryKwh;
  const initialKwh = batteryCapacity * (initialSoc / 100);
  const netKwhConsumed = Math.max(0, selectedRoute.baseKwh - selectedRoute.regenKwh);
  const finalKwh = initialKwh - netKwhConsumed;
  const arrivalSocPct = Math.max(0, Math.min(100, Math.round((finalKwh / batteryCapacity) * 100)));
  const canReachWithoutStop = arrivalSocPct >= 15;

  const handleLaunchRouteInApp = () => {
    router.push(`/?origin=${encodeURIComponent(selectedRoute.origin)}&dest=${encodeURIComponent(selectedRoute.dest)}`);
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-[#E8EEF5] flex flex-col font-sans selection:bg-[#00F5A0] selection:text-black antialiased overflow-x-hidden">
      
      {/* ── TIPOGRAFÍA EDITORIAL MODERNA (SYNE + SPACE GROTESK + SPACE MONO) ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <style jsx global>{`
        body {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          background-color: #070B12;
        }
        h1, h2, h3, .font-display {
          font-family: 'Syne', sans-serif;
          letter-spacing: -0.035em;
        }
        .font-mono {
          font-family: 'Space Mono', monospace;
        }
        .glass-panel {
          background: rgba(11, 23, 19, 0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 245, 160, 0.22);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 25px rgba(0, 245, 160, 0.12);
        }
        .glass-badge {
          background: rgba(7, 11, 18, 0.78);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(0, 210, 255, 0.25);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 210, 255, 0.15);
        }
      `}</style>

      {/* ════════ 1. NAVBAR FLOTANTE VISIONOS CON LOGO CHARGEWAY ════════ */}
      <header className="fixed top-0 left-0 w-full z-50 pt-5 px-4 sm:px-8 pointer-events-none">
        <div className="max-w-5xl mx-auto rounded-full bg-[#081318]/75 backdrop-blur-2xl border border-white/[0.12] px-6 py-3 shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex items-center justify-between pointer-events-auto transition-all">
          
          {/* Logo ChargeWay */}
          <Link href="/landing" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-cyan-400/40 shadow-[0_0_20px_rgba(0,210,255,0.4)] group-hover:scale-105 transition-all bg-[#09151A] p-1.5 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="ChargeWay Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              ChargeWay
            </span>
          </Link>

          {/* Enlaces de Navegación */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
            <a href="#hero-planner" className="hover:text-white transition-colors">
              Rutas
            </a>
            <a href="#corredores" className="hover:text-white transition-colors">
              Corredores Turísticos
            </a>
            <a href="#innovaciones" className="hover:text-white transition-colors">
              Copiloto IA
            </a>
          </nav>

          {/* Botón Iniciar Viaje */}
          <Link
            href="/"
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00F5A0] via-teal-300 to-[#00D2FF] hover:brightness-110 text-slate-950 font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(0,210,255,0.5)] transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            Iniciar Viaje
          </Link>

        </div>
      </header>

      {/* ════════ 2. HERO PRINCIPAL IDÉNTICO A LA PROPUESTA (IMAGEN 2) ════════ */}
      <section id="hero-planner" className="relative min-h-screen w-full flex flex-col justify-between pt-28 pb-8 px-4 sm:px-8 overflow-hidden select-none">
        
        {/* Fondo Limpio de Alta Definición: Volcán Cotopaxi en Atardecer Dorado con Carretera y Tesla Azul */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <img
            src="/images/hero_cotopaxi_sunset.jpg"
            alt="Atardecer en Cotopaxi con carretera andina y Tesla azul"
            className="w-full h-full object-cover object-center brightness-[0.95] contrast-[1.05]"
          />
          {/* Sutil viñeta para contraste suave */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070B12] via-transparent to-black/20" />
        </div>

        {/* Zona Central: Tarjeta Translúcida VisionOS + Insignias Flotantes */}
        <div className="relative z-10 max-w-5xl mx-auto w-full my-auto py-8">
          <div className="relative flex flex-col items-center justify-center">

            {/* Insignia Flotante Derecha (+500 Conductores Activos) */}
            <div className="hidden sm:flex absolute -top-4 right-4 md:right-16 z-20 items-center gap-3 px-5 py-2.5 rounded-full bg-[#081519]/75 backdrop-blur-2xl border border-cyan-400/40 shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(0,210,255,0.2)]">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
                <Users size={16} />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-white leading-none">+500</div>
                <div className="text-[11px] text-neutral-300 tracking-wide mt-0.5">Conductores Activos</div>
              </div>
            </div>

            {/* Tarjeta Central Frosted Glass (VisionOS) */}
            <div className="w-full max-w-md p-6 sm:p-7 rounded-[28px] bg-black/35 backdrop-blur-3xl border border-white/25 shadow-[0_30px_70px_rgba(0,0,0,0.65),0_0_30px_rgba(255,255,255,0.06)] space-y-4">
              
              {/* Item 1: Destino y Distancia */}
              <div className="flex items-center gap-3 text-white text-base sm:text-lg font-medium">
                <MapPin size={20} className="text-white/80 shrink-0" />
                <span>Quito ➔ Cotacachi (115 km)</span>
              </div>

              {/* Item 2: Vehículo y Batería */}
              <div className="flex items-center gap-3 text-neutral-200 text-sm sm:text-base">
                <Car size={18} className="text-white/80 shrink-0" />
                <span>BYD Ti 7 (26.6 kWh)</span>
              </div>

              {/* Item 3: Telemetría en Vivo */}
              <div className="flex items-start gap-3">
                <Activity size={18} className="text-white/80 shrink-0 mt-0.5" />
                <div className="text-sm sm:text-base">
                  <div className="text-neutral-300">Telemetría vivo</div>
                  <div className="text-white font-medium">
                    Llegada con 64% SoC <span className="text-[#00F5A0] font-semibold">(Seguro)</span>
                  </div>
                </div>
              </div>

              {/* Item 4: Altitud */}
              <div className="flex items-center gap-3 text-neutral-200 text-sm sm:text-base">
                <Mountain size={18} className="text-white/80 shrink-0" />
                <span>2.850 m</span>
              </div>

              {/* Item 5: Freno Regenerativo */}
              <div className="flex items-center justify-between text-sm sm:text-base pt-1 border-t border-white/10">
                <div className="flex items-center gap-2.5 text-neutral-200">
                  <Zap size={16} className="text-[#00F5A0]" />
                  <span>Frenero regenerativo</span>
                </div>
                <span className="text-[#00F5A0] font-semibold tracking-wide">
                  +4.2 kWh recuperados
                </span>
              </div>

            </div>

            {/* Insignia Flotante Inferior Izquierda (+1.500 Viajes Acompañados) */}
            <div className="hidden sm:flex absolute -bottom-6 left-4 md:left-12 z-20 items-center gap-3 px-5 py-2.5 rounded-full bg-[#081519]/75 backdrop-blur-2xl border border-cyan-400/40 shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(0,210,255,0.2)]">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
                <Award size={16} />
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-white leading-none">+1.500</div>
                <div className="text-[11px] text-neutral-300 tracking-wide mt-0.5">Viajes Acompañados</div>
              </div>
            </div>

          </div>
        </div>

        {/* ════════ FILA INFERIOR: 3 TARJETAS BENTO COMO EN LA PROPUESTA ════════ */}
        <div className="relative z-10 max-w-5xl mx-auto w-full pt-4 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Bento Card 1: Rutas & Navegación */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 hover:border-cyan-400/50 transition-all flex items-center gap-4 group cursor-pointer shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,210,255,0.2)]">
                <Compass size={22} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Rutas Inteligentes</h4>
                <p className="text-neutral-400 text-xs mt-0.5 font-light">Cálculo de pendientes y paradas óptimas</p>
              </div>
            </div>

            {/* Bento Card 2: Corredores Turísticos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 hover:border-[#00F5A0]/50 transition-all flex items-center gap-4 group cursor-pointer shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,245,160,0.2)]">
                <MapPin size={22} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Corredores Turísticos</h4>
                <p className="text-neutral-400 text-xs mt-0.5 font-light">Sierra, Costa, Amazonía y Valles</p>
              </div>
            </div>

            {/* Bento Card 3: Copiloto IA en Vivo */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 hover:border-cyan-400/50 transition-all flex items-center gap-4 group cursor-pointer shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-emerald-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,210,255,0.2)]">
                <Radio size={22} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Copiloto de Voz IA</h4>
                <p className="text-neutral-400 text-xs mt-0.5 font-light">Asistencia manos libres en tiempo real</p>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ════════ 3. SCROLLYTELLING: 4 CORREDORES TURÍSTICOS DE ECUADOR ════════ */}
      <section id="corredores" className="py-28 px-6 sm:px-12 max-w-7xl mx-auto w-full space-y-16 border-t border-white/[0.08]">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#00D2FF] font-bold block">
              Explora Ecuador en Eléctrico
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-black text-white leading-tight">
              Los 4 Corredores Turísticos.
            </h2>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-md font-light leading-relaxed">
            Cada geografía del país tiene su propia dinámica energética. ChargeWay adapta su cálculo de consumo y paradas a cada paisaje.
          </p>
        </div>

        {/* Selector de Pestañas de Corredores */}
        <div className="flex flex-wrap gap-2.5 border-b border-white/[0.08] pb-4">
          {[
            { id: 'sierra', label: '1. Sierra Andina & Volcanes', icon: Mountain },
            { id: 'costa', label: '2. Costa & Ruta del Spondylus', icon: Sun },
            { id: 'amazonia', label: '3. Amazonía Viva', icon: Leaf },
            { id: 'valles', label: '4. Valles & Gastronomía', icon: Compass },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeCorridorTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCorridorTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0] shadow-[0_0_20px_rgba(0,245,160,0.2)]'
                    : 'bg-white/[0.03] text-neutral-400 border border-white/[0.06] hover:text-white hover:border-white/20'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tarjeta Visual de Corredor con Fotografía Real */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl bg-[#0D131C] border border-white/[0.08] p-6 sm:p-10 shadow-2xl">
          
          {/* Imagen Real del Paisaje */}
          <div className="lg:col-span-7 rounded-2xl overflow-hidden relative aspect-[16/10] border border-white/10 shadow-inner group">
            <img
              src={
                activeCorridorTab === 'sierra'
                  ? '/images/sierra_cotopaxi.png'
                  : activeCorridorTab === 'costa'
                  ? '/images/costa_spondylus.png'
                  : activeCorridorTab === 'amazonia'
                  ? '/images/oriente_amazon.png'
                  : '/images/cotopaxi.png'
              }
              alt="Corredor turístico de Ecuador"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-white">
              <span className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
                {activeCorridorTab === 'sierra' && 'Quito ➔ Cotacachi ➔ Baños ➔ Cuenca'}
                {activeCorridorTab === 'costa' && 'Manta ➔ Salinas ➔ Olón ➔ Esmeraldas'}
                {activeCorridorTab === 'amazonia' && 'Papallacta ➔ Baeza ➔ Tena ➔ Puyo'}
                {activeCorridorTab === 'valles' && 'Cumbayá ➔ Los Chillos ➔ Mindo ➔ Pululahua'}
              </span>
              <span className="text-[#00F5A0] font-bold">100% Electrificado</span>
            </div>
          </div>

          {/* Explicación Técnica y Beneficio Turístico */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00D2FF] font-bold block">
              Comportamiento Energético
            </span>

            {activeCorridorTab === 'sierra' && (
              <>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  La física de los Andes a tu favor.
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                  Al descender desde pasos de altura como El Chasqui (3.200 m) o Papallacta (4.060 m), el freno regenerativo convierte la energía potencial en kilovatios hora limpios, sumando hasta un 18% de batería adicional a tu viaje.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Cargadores DC</div>
                    <div className="text-white font-bold text-sm mt-0.5">50 kW - 100 kW</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Regeneración</div>
                    <div className="text-[#00F5A0] font-bold text-sm mt-0.5">Hasta +6.8 kWh</div>
                  </div>
                </div>
              </>
            )}

            {activeCorridorTab === 'costa' && (
              <>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  Kilómetros infinitos junto al mar.
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                  La costa ecuatoriana ofrece trayectos llanos con cargadores rápidos en balnearios y plazas comerciales. Carga frente a la playa mientras disfrutas de la gastronomía del Pacífico.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Puntos Costeros</div>
                    <div className="text-white font-bold text-sm mt-0.5">Manta, Salinas, Guayaquil</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Tiempo Promedio</div>
                    <div className="text-[#00D2FF] font-bold text-sm mt-0.5">25 - 35 minutos</div>
                  </div>
                </div>
              </>
            )}

            {activeCorridorTab === 'amazonia' && (
              <>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  Cruza la cordillera hacia la selva tropical.
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                  Conecta la Sierra con los ríos amazónicos sin emitir un solo gramo de dióxido de carbono en las reservas ecológicas. Planifica recargas en Baeza o Tena con total certidumbre.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Emisiones</div>
                    <div className="text-emerald-400 font-bold text-sm mt-0.5">0.00 kg CO₂</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Eco-Hosterías</div>
                    <div className="text-white font-bold text-sm mt-0.5">Conectadas 22 kW</div>
                  </div>
                </div>
              </>
            )}

            {activeCorridorTab === 'valles' && (
              <>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  Paradas con encanto y gastronomía local.
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                  Convierte el tiempo de recarga en una experiencia. ChargeWay te sugiere restaurantes, cafeterías de especialidad y hoteles boutique justo al lado de cada estación de carga.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Amenidades</div>
                    <div className="text-white font-bold text-sm mt-0.5">Cafés & Restaurantes</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                    <div className="text-neutral-400 text-[10px]">Experiencia</div>
                    <div className="text-[#00F5A0] font-bold text-sm mt-0.5">Cero Tiempos Muertos</div>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-xs font-mono text-[#00F5A0] hover:text-[#00D2FF] uppercase font-bold tracking-wider pt-2 cursor-pointer transition-colors"
            >
              <span>Ver mapa interactivo de este corredor</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </div>

      </section>

      {/* ════════ 4. BENTO GRID DE INNOVACIONES TECNOLÓGICAS ════════ */}
      <section id="innovaciones" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full space-y-12 border-t border-white/[0.08]">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#00D2FF] font-bold">
            Ingeniería & Seguridad
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-black text-white">
            4 Innovaciones al Volante.
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm font-light">
            Tecnología desarrollada específicamente para las condiciones geográficas de Ecuador.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Copiloto por Voz */}
          <div className="p-7 rounded-3xl bg-[#0C121B] border border-white/[0.08] hover:border-[#00F5A0]/40 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#00F5A0]/15 border border-[#00F5A0]/30 flex items-center justify-center text-[#00F5A0]">
              <Volume2 size={22} />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-[#00F5A0] transition-colors">
              Copiloto de Voz IA
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Pregunta por tu autonomía, tiempo de recarga o destinos sin soltar el volante. Voz neural de ultra-baja latencia.
            </p>
          </div>

          {/* Card 2: Compatibilidad de Marca */}
          <div className="p-7 rounded-3xl bg-[#0C121B] border border-white/[0.08] hover:border-[#00D2FF]/40 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#00D2FF]/15 border border-[#00D2FF]/30 flex items-center justify-center text-[#00D2FF]">
              <ShieldCheck size={22} />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-[#00D2FF] transition-colors">
              Compatibilidad Real
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Filtro estricto que solo te muestra cargadores que sirven con tu vehículo y conector, evitando paradas en estaciones exclusivas bloqueadas.
            </p>
          </div>

          {/* Card 3: Motor Topográfico */}
          <div className="p-7 rounded-3xl bg-[#0C121B] border border-white/[0.08] hover:border-[#00F5A0]/40 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#00F5A0]/15 border border-[#00F5A0]/30 flex items-center justify-center text-[#00F5A0]">
              <Mountain size={22} />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-[#00F5A0] transition-colors">
              Algoritmo Físico Real
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              No calculamos distancias planas. Integramos pendientes, curvas, temperatura ambiente y masa del auto para una predicción exacta.
            </p>
          </div>

          {/* Card 4: Impacto y Ahorro */}
          <div className="p-7 rounded-3xl bg-[#0C121B] border border-white/[0.08] hover:border-[#00D2FF]/40 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Leaf size={22} />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
              Huella Positiva
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Visualiza en tiempo real los kilos de CO₂ evitados y el dinero ahorrado frente al consumo de gasolina en cada viaje.
            </p>
          </div>

        </div>

      </section>

      {/* ════════ 5. SECCIÓN ANFITRIONES: SIMULADOR DE MONETIZACIÓN ARCONEL ════════ */}
      <section id="anfitriones" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/[0.08] space-y-12">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#00D2FF] font-bold">
              ChargeWay Partner Program
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-black text-white">
              Monetiza tu Punto de Carga.
            </h2>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-md font-light leading-relaxed">
            Convierte el parqueadero de tu hotel, restaurante o local comercial en una electrolinera 100% legal bajo normativa ARCONEL.
          </p>
        </div>

        {/* Simulador Interactivo Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controles de Configuración */}
          <div className="lg:col-span-7 p-7 sm:p-8 rounded-3xl bg-[#0E1520] border border-white/[0.08] space-y-6 shadow-xl">
            
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 block">
                1. Potencia del Cargador Instalado
              </label>
              <div className="grid grid-cols-3 gap-3">
                {ARCONEL_POWER_TIERS.map((tier) => (
                  <button
                    key={tier.power_kw}
                    type="button"
                    onClick={() => {
                      setSelectedPowerKw(tier.power_kw);
                      if (hourlyPriceUsd > tier.max_legal_hourly_price_usd) {
                        setHourlyPriceUsd(tier.max_legal_hourly_price_usd);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      selectedPowerKw === tier.power_kw
                        ? 'border-[#00F5A0] bg-[#00F5A0]/15 text-white shadow-[0_0_15px_rgba(0,245,160,0.25)]'
                        : 'border-white/[0.08] bg-[#070B12] text-neutral-400 hover:border-white/20'
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
                <span className="text-neutral-300">2. Precio de Parqueo por Hora</span>
                <span className="text-[#00D2FF] text-base font-bold">${hourlyPriceUsd.toFixed(2)} USD/h</span>
              </div>
              <input
                type="range"
                min={0.50}
                max={compliance.max_allowed_hourly_price_usd}
                step={0.05}
                value={hourlyPriceUsd}
                onChange={(e) => setHourlyPriceUsd(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00F5A0]"
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-light pt-1">
                <span>Tope legal ARCONEL-029/25: ${compliance.max_allowed_hourly_price_usd} USD/h</span>
                <span className="text-[#00F5A0] font-medium">✓ Tarifa 100% Legal</span>
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
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00F5A0]"
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
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00F5A0]"
                />
              </div>
            </div>

          </div>

          {/* Panel de Resultado Financiero */}
          <div className="lg:col-span-5 p-8 rounded-3xl bg-[#090E16] border border-white/[0.08] shadow-2xl flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00D2FF] font-bold block mb-2">
                Ganancia Neta Estimada Anfitrión
              </span>
              <div className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
                ${netMonthlyProfit.toFixed(2)} <span className="text-sm font-sans font-normal text-neutral-400">USD/mes</span>
              </div>
              <p className="text-xs text-neutral-400 font-light mt-1.5">
                Ingreso neto tras descontar el costo eléctrico de distribuidora ($0.08/kWh) y comisión por volumen.
              </p>

              <div className="space-y-2.5 text-xs font-mono text-neutral-400 pt-6 border-t border-white/[0.06] mt-6">
                <div className="flex justify-between">
                  <span>Ingreso Bruto ({monthlyReservations} sesiones):</span>
                  <span className="text-white font-bold">${grossMonthly.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Costo Eléctrico Estimado:</span>
                  <span className="text-red-400">-${energyCostMonthly.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>5 Reservas Mensuales Gratuitas:</span>
                  <span className="text-[#00F5A0]">$0.00 Comisión</span>
                </div>
                <div className="flex justify-between">
                  <span>Comisión ChargeWay ({billableCount} reservas):</span>
                  <span className="text-[#00D2FF]">-${commissionMonthly.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00F5A0] to-[#00D2FF] hover:brightness-110 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(0,245,160,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>Habilitar Mi Punto de Carga</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </section>

      {/* ════════ 6. CTA FINAL DE ALTA GAMA ════════ */}
      <section className="py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full text-center relative overflow-hidden rounded-[36px] bg-gradient-to-b from-[#0E1724] to-[#070B12] border border-cyan-500/20 shadow-2xl my-10">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-1 mx-auto shadow-[0_0_40px_rgba(0,245,160,0.4)]">
            <div className="w-full h-full bg-[#070B12] rounded-[22px] flex items-center justify-center p-2">
              <img src="/logo.png" alt="ChargeWay Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white leading-tight">
            Viaja sin límites. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F5A0] via-[#00D2FF] to-white">
              Cero ansiedad de carga en Ecuador.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-300 font-light max-w-xl mx-auto">
            Únete a los más de 500 conductores que ya recorren el país con telemetría en tiempo real, copiloto de voz y cálculo topográfico preciso.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#00F5A0] via-teal-300 to-[#00D2FF] hover:brightness-110 text-slate-950 font-extrabold text-sm font-mono uppercase tracking-wider shadow-[0_0_35px_rgba(0,245,160,0.5)] transition-all cursor-pointer hover:scale-[1.03]"
            >
              Comenzar a Planificar Gratis
            </Link>
            <button
              onClick={() => setIsMapModalOpen(true)}
              className="px-6 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/20 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
            >
              Explorar Estaciones en el Mapa
            </button>
          </div>
        </div>
      </section>

      {/* ════════ 7. FOOTER CON LOGO OFICIAL ════════ */}
      <footer className="w-full bg-[#05080E] border-t border-white/[0.08] py-14 px-6 sm:px-12 text-neutral-400 font-sans text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-emerald-500/30 p-0.5 bg-[#091410]">
              <img src="/logo.png" alt="ChargeWay Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-sm font-display font-bold text-white">
                Charge<span className="text-[#00F5A0]">Way</span> Ecuador
              </span>
              <p className="text-[10px] text-neutral-500 font-mono">Movilidad Eléctrica Sostenible</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-mono uppercase tracking-wider text-neutral-400">
            <Link href="/" className="hover:text-[#00F5A0] transition-colors">Planificador en Vivo</Link>
            <a href="#corredores" className="hover:text-[#00D2FF] transition-colors">Corredores</a>
            <a href="#innovaciones" className="hover:text-[#00F5A0] transition-colors">Copiloto IA</a>
            <a href="#anfitriones" className="hover:text-[#00D2FF] transition-colors">Anfitriones</a>
            <a href="mailto:chargewayec@gmail.com" className="hover:text-[#00D2FF] transition-colors">Contacto</a>
          </div>

          <p className="text-neutral-500 text-[11px] font-mono">
            © 2026 ChargeWay AI · Ecuador
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
        onGoToPlanner={() => router.push('/')}
      />

    </div>
  );
}
