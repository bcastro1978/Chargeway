'use client';

import React, { useState } from 'react';
import { 
  Car, Building2, MapPin, Zap, ShieldCheck, 
  ArrowRight, DollarSign, Clock, Smartphone, 
  BatteryCharging, Sparkles, CheckCircle2, ChevronRight,
  TrendingDown, ThumbsUp, QrCode
} from 'lucide-react';

interface DualAudienceSectionProps {
  onGoToApp: () => void;
  onOpenRegister: () => void;
  onOpenElectrolinerasMap: () => void;
  onOpenAdminPanel: () => void;
}

export const DualAudienceSection: React.FC<DualAudienceSectionProps> = ({
  onGoToApp,
  onOpenRegister,
  onOpenElectrolinerasMap,
  onOpenAdminPanel,
}) => {
  const [activeTab, setActiveTab] = useState<'driver' | 'host'>('driver');

  return (
    <section id="conductores" className="w-full py-16 px-4 sm:px-6 bg-[#05110C] relative">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header con Switcher Interactivo Dual */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Una Plataforma · Dos Experiencias Hechas para Ecuador</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Diseñado para la Comunidad EV de Ecuador
          </h2>

          {/* Tab Switcher */}
          <div className="inline-flex p-1.5 rounded-full bg-[#081610] border border-[#00FF87]/30 shadow-[0_0_20px_rgba(0,255,135,0.1)]">
            <button
              onClick={() => setActiveTab('driver')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'driver'
                  ? 'bg-[#00FF87] text-[#030A07] shadow-[0_0_15px_rgba(0,255,135,0.4)]'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Car size={16} />
              <span>Soy Conductor EV</span>
            </button>

            <button
              onClick={() => setActiveTab('host')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'host'
                  ? 'bg-[#00FF87] text-[#030A07] shadow-[0_0_15px_rgba(0,255,135,0.4)]'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Building2 size={16} />
              <span>Soy Negocio / Parqueadero</span>
            </button>
          </div>
        </div>

        {/* ══ CONTENIDO PARA CONDUCTORES EV ══ */}
        {activeTab === 'driver' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gradient-to-r from-[#081610] via-[#0D1A14] to-[#081610] border border-[#1A3028] rounded-3xl p-6 sm:p-10 shadow-2xl animate-in fade-in duration-300">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase text-[#00FF87] font-bold tracking-wider">
                  Cero Ansiedad de Autonomía
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Viaja por todo el Ecuador sabiendo exactamente dónde cargar
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Las rutas andinas tienen desniveles extremos. ChargeWay analiza las pendientes en tiempo real, calculando el gasto exacto en subida y la recuperación de energía por frenado regenerativo en bajada.
                </p>
              </div>

              {/* Lista de Beneficios Conductor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Rutas con Altitud Real</h4>
                    <p className="text-[11px] text-neutral-400">Predicción precisa de batería según peso y geografía.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Reserva con Código QR</h4>
                    <p className="text-[11px] text-neutral-400">Asegura tu puesto de parqueo antes de salir de casa.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Directorio Nacional</h4>
                    <p className="text-[11px] text-neutral-400">Filtra por conectores GB/T, CCS2 y Tipo 2 en las 24 provincias.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Ahorro Comprobado</h4>
                    <p className="text-[11px] text-neutral-400">Gasta hasta un 85% menos en comparación a gasolina extra o súper.</p>
                  </div>
                </div>
              </div>

              {/* Botones de Acción Conductor */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <button
                  onClick={onGoToApp}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#00FF87] hover:bg-[#00E077] text-[#030A07] font-bold text-sm shadow-[0_0_20px_rgba(0,255,135,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Probar Planificador de Rutas</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={onOpenElectrolinerasMap}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#05110C] hover:bg-[#081C14] border border-[#00FF87]/40 text-[#00FF87] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <MapPin size={15} />
                  <span>Ver Mapa de Electrolineras</span>
                </button>
              </div>
            </div>

            {/* Visual Card Conductor */}
            <div className="lg:col-span-5 bg-[#05110C] border border-[#00FF87]/30 rounded-3xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1A3028] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-[#00FF87]">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Quito ➔ Guayaquil</h4>
                    <span className="text-[11px] text-neutral-400 font-mono">420 km · Descenso 2,850 m</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#00FF87] text-[10px] font-bold">
                  ⚡ 1 Parada Sugerida
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>🔋 Batería de Salida:</span>
                  <span className="text-white font-bold">90% SoC</span>
                </div>
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>⛰️ Regeneración en Bajada:</span>
                  <span className="text-[#00FF87] font-bold">+12.4 kWh (+27% SoC)</span>
                </div>
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>🔌 Parada de Carga:</span>
                  <span className="text-white font-bold">Santo Domingo (30 min)</span>
                </div>
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>💰 Costo Total Eléctrico:</span>
                  <span className="text-[#00FF87] font-bold">$4.80 USD vs $32.00 Gasolina</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#081610] border border-[#00FF87]/30 text-center">
                <span className="text-[11px] text-neutral-300 font-sans">
                  🌟 Índice de Tranquilidad: <strong className="text-[#00FF87]">98/100 (Viaje Seguro)</strong>
                </span>
              </div>
            </div>

          </div>
        )}

        {/* ══ CONTENIDO PARA ANFITRIONES / NEGOCIOS ══ */}
        {activeTab === 'host' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gradient-to-r from-[#081610] via-[#0D1A14] to-[#081610] border border-[#00FF87]/30 rounded-3xl p-6 sm:p-10 shadow-2xl animate-in fade-in duration-300">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase text-[#00FF87] font-bold tracking-wider">
                  Modelo ChargeWay Partner
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Atrae conductores de alto valor y genera ingresos recurrentes
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Los conductores de vehículos eléctricos permanecen un promedio de 45 a 90 minutos mientras cargan. Ideal para hoteles, cafeterías, centros comerciales y parqueaderos públicos.
                </p>
              </div>

              {/* Ventajas para Negocios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">5 Reservas Gratis / Mes</h4>
                    <p className="text-[11px] text-neutral-400">Sin costo de entrada ni cuotas fijas mensuales.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">20% Comisión en Prepago</h4>
                    <p className="text-[11px] text-neutral-400">Solo pagas si tienes éxito a partir de la 6ª reserva.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Validación QR con tu Móvil</h4>
                    <p className="text-[11px] text-neutral-400">Escanea el código del conductor para ingreso y salida rápido.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#05110C]/80 border border-[#1A3028]">
                  <CheckCircle2 size={18} className="text-[#00FF87] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">100% Legal (ARCONEL)</h4>
                    <p className="text-[11px] text-neutral-400">Exención de venta eléctrica bajo la ley ecuatoriana LOSPEE.</p>
                  </div>
                </div>
              </div>

              {/* Botones de Acción Anfitrión */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <button
                  onClick={onOpenRegister}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#00FF87] hover:bg-[#00E077] text-[#030A07] font-bold text-sm shadow-[0_0_20px_rgba(0,255,135,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Registrar Parqueadero Gratis</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={onOpenAdminPanel}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#05110C] hover:bg-[#081C14] border border-[#00FF87]/40 text-[#00FF87] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <QrCode size={15} />
                  <span>Acceso a Panel de Anfitrión</span>
                </button>
              </div>
            </div>

            {/* Visual Card Anfitrión */}
            <div className="lg:col-span-5 bg-[#05110C] border border-[#00FF87]/30 rounded-3xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1A3028] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-300">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Hotel / Restaurante Boutique</h4>
                    <span className="text-[11px] text-neutral-400 font-mono">Cargador 22 kW AC · Cumbayá</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#00FF87] text-[10px] font-bold">
                  🟢 Activo
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>📅 Reservas al Mes:</span>
                  <span className="text-white font-bold">25 reservas (5 gratis)</span>
                </div>
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>💵 Ingreso Bruto Parqueo:</span>
                  <span className="text-white font-bold">$150.00 USD</span>
                </div>
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>🔌 Costo Eléctrico (EEQ):</span>
                  <span className="text-neutral-400 font-bold">$38.70 USD</span>
                </div>
                <div className="flex justify-between text-neutral-300 p-2.5 rounded-xl bg-[#081610]">
                  <span>💎 Ganancia Neta Anfitrión:</span>
                  <span className="text-[#00FF87] font-bold text-sm">$89.04 USD / mes</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#081610] border border-[#00FF87]/30 text-center">
                <span className="text-[11px] text-neutral-300 font-sans">
                  🛒 Más consumo en tu restaurante: <strong className="text-[#00FF87]">+$450 USD en ventas adicionales</strong>
                </span>
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
