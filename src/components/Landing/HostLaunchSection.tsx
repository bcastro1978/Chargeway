'use client';

import React, { useState } from 'react';
import { 
  Car, Building2, ShieldCheck, Zap, ArrowRight, DollarSign, 
  Clock, MapPin, Sparkles, CheckCircle2, ChevronRight, Scale, 
  HelpCircle, TrendingUp, Users, Smartphone 
} from 'lucide-react';
import { 
  validateHostPricing, 
  calculateHostProfitability, 
  calculateDeliveredEnergyKwh, 
  calculateReservationCommission,
  ARCONEL_POWER_TIERS,
  FREE_MONTHLY_RESERVATIONS_PER_POINT,
  VOLUME_COMMISSION_RATE_PCT
} from '@/lib/sustainability-core';

interface HostLaunchSectionProps {
  onOpenRegister: () => void;
  onOpenAdminPanel: () => void;
}

export const HostLaunchSection: React.FC<HostLaunchSectionProps> = ({
  onOpenRegister,
  onOpenAdminPanel,
}) => {
  // Simulador de Anfitrión
  const [selectedPowerKw, setSelectedPowerKw] = useState<number>(7.0);
  const [hourlyPriceUsd, setHourlyPriceUsd] = useState<number>(1.10);
  const [estimatedMonthlyReservations, setEstimatedMonthlyReservations] = useState<number>(20);
  const [avgHoursPerSession, setAvgHoursPerSession] = useState<number>(2);

  // Validaciones y Cálculos
  const compliance = validateHostPricing({
    power_kw: selectedPowerKw,
    hourly_parking_price_usd: hourlyPriceUsd,
  });

  const deliveredKwhPerSession = calculateDeliveredEnergyKwh(selectedPowerKw, avgHoursPerSession);
  
  const singleSessionProfit = calculateHostProfitability({
    delivered_energy_kwh: deliveredKwhPerSession,
    equivalent_tariff_usd_kwh: compliance.equivalent_tariff_usd_kwh,
    utility_buying_tariff_usd_kwh: 0.08, // Tarifa diurna promedio Ecuador
  });

  // Cálculo mensual considerando 5 gratis y 20% a partir de la 6ta
  const freeReservations = Math.min(estimatedMonthlyReservations, FREE_MONTHLY_RESERVATIONS_PER_POINT);
  const billableReservations = Math.max(0, estimatedMonthlyReservations - FREE_MONTHLY_RESERVATIONS_PER_POINT);
  
  const grossMonthlyRevenue = (singleSessionProfit.gross_revenue_usd * estimatedMonthlyReservations);
  const energyCostMonthly = (singleSessionProfit.energy_cost_usd * estimatedMonthlyReservations);
  const totalHostProfitBeforeComm = (singleSessionProfit.net_profit_usd * estimatedMonthlyReservations);
  
  // Comisión del 20% solo sobre las reservas a partir de la 6ª
  const commissionPerBillableSession = singleSessionProfit.net_profit_usd * VOLUME_COMMISSION_RATE_PCT;
  const totalCommissionMonthly = (commissionPerBillableSession * billableReservations);
  const netProfitMonthly = totalHostProfitBeforeComm - totalCommissionMonthly;

  return (
    <section id="anfitriones" className="w-full py-16 px-4 sm:px-6 bg-gradient-to-b from-[#081610] via-[#05110C] to-[#081610] border-y border-[#00FF87]/20 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-[#00FF87]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        
        {/* Header de Lanzamiento para Anfitriones */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,255,135,0.15)]">
            <Building2 size={15} />
            <span>ChargeWay Partner · Red de Parqueos EV Ecuador</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Monetiza tu Parqueadero con <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#00FF87] via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Carga para Autos Eléctricos
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-sans">
            Hoteles, restaurantes, centros comerciales, gasolineras y particulares: convierte tu espacio en un punto de recarga público o privado con el modelo más justo del mercado.
          </p>
        </div>

        {/* 3 Pilares del Modelo ChargeWay Partner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0D1A14]/90 border border-[#1A3028] hover:border-[#00FF87]/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,255,135,0.15)] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/15 border border-[#00FF87]/40 flex items-center justify-center text-[#00FF87]">
              <Sparkles size={24} />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00FF87]">Freemium de Entrada</span>
              <h3 className="text-xl font-bold text-white">5 Reservas Gratis al Mes</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Cada punto de parqueo recibe 5 reservas mensuales 100% libres de comisión ($0.00). Ideal para comenzar y probar la plataforma sin riesgo.
              </p>
            </div>
          </div>

          <div className="bg-[#0D1A14]/90 border border-[#1A3028] hover:border-[#00FF87]/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,255,135,0.15)] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <DollarSign size={24} />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00FF87]">Comisión por Volumen</span>
              <h3 className="text-xl font-bold text-white">20% desde la 6ª Reserva</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                A partir de la reserva #6 del mes, se deduce un 20% de comisión únicamente sobre tu ganancia real mediante saldo prepagado. Sin pagos mensuales fijos.
              </p>
            </div>
          </div>

          <div className="bg-[#0D1A14]/90 border border-[#1A3028] hover:border-[#00FF87]/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,255,135,0.15)] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <ShieldCheck size={24} />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00FF87]">Seguridad Jurídica</span>
              <h3 className="text-xl font-bold text-white">Compliance ARCONEL / LOSPEE</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Operas 100% legal bajo la exención de comercialización de energía (alquiler de espacio de parqueo) con bloqueo preventivo de sobreprecios según Resolución ARCONEL-029/25.
              </p>
            </div>
          </div>
        </div>

        {/* ══ SIMULADOR DE INGRESOS PARA EL ANFITRIÓN ══ */}
        <div className="bg-[#0B1E16] border border-[#00FF87]/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#1A3028]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#00FF87] uppercase tracking-wider">
                <TrendingUp size={14} />
                <span>Calculadora Financiera para Dueños de Parqueadero</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Calcula tus Ganancias Netas Mensuales
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenRegister}
                className="px-6 py-3 rounded-full bg-[#00FF87] hover:bg-[#00E077] text-[#030A07] font-bold text-sm shadow-[0_0_20px_rgba(0,255,135,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Habilitar mi Parqueadero Ahora
              </button>
              <button
                onClick={onOpenAdminPanel}
                className="px-5 py-3 rounded-full bg-[#05110C] hover:bg-[#081C14] border border-[#00FF87]/40 text-[#00FF87] font-semibold text-xs transition-all cursor-pointer"
              >
                Panel Host QR
              </button>
            </div>
          </div>

          {/* Form Controls & Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Controles de Configuración (7 Columnas) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* 1. Selector de Potencia */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                  <span>Potencia Nominal del Cargador</span>
                  <span className="text-[#00FF87] font-mono">{selectedPowerKw} kW</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ARCONEL_POWER_TIERS.slice(0, 4).map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => {
                        setSelectedPowerKw(tier.power_kw);
                        // Ajustar precio si excede el tope
                        if (hourlyPriceUsd > tier.max_legal_hourly_price_usd) {
                          setHourlyPriceUsd(tier.max_legal_hourly_price_usd);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                        selectedPowerKw === tier.power_kw
                          ? 'border-[#00FF87] bg-[#00FF87]/15 text-white shadow-[0_0_15px_rgba(0,255,135,0.2)]'
                          : 'border-[#1A3028] bg-[#05110C] text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div>{tier.power_kw} kW</div>
                      <div className="text-[10px] font-normal text-neutral-400">Tope: ${tier.max_legal_hourly_price_usd}/h</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Tarifa por Hora de Parqueo con Validador ARCONEL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-neutral-300">Precio por Hora de Parqueo (USD/h)</span>
                  <span className="text-[#00FF87] font-mono text-base">${hourlyPriceUsd.toFixed(2)} USD/h</span>
                </div>
                
                <input
                  type="range"
                  min={0.50}
                  max={compliance.max_allowed_hourly_price_usd}
                  step={0.05}
                  value={hourlyPriceUsd}
                  onChange={(e) => setHourlyPriceUsd(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#05110C] rounded-lg appearance-none cursor-pointer accent-[#00FF87]"
                />

                {/* Badge de Compliance ARCONEL */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#05110C] border border-[#1A3028] text-xs">
                  <div className="flex items-center gap-2">
                    <Scale size={15} className="text-[#00FF87]" />
                    <span className="text-neutral-300">Tope Legal ARCONEL-029/25:</span>
                    <span className="font-mono text-white font-bold">${compliance.max_allowed_hourly_price_usd} USD/h</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                    ✅ Tarifa 100% Legal
                  </span>
                </div>
              </div>

              {/* 3. Estimación de Reservas y Duración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                    <span>Reservas Estimadas / Mes</span>
                    <span className="text-[#00FF87] font-mono">{estimatedMonthlyReservations} reservas</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={1}
                    value={estimatedMonthlyReservations}
                    onChange={(e) => setEstimatedMonthlyReservations(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#05110C] rounded-lg appearance-none cursor-pointer accent-[#00FF87]"
                  />
                  <div className="text-[11px] text-neutral-400 font-mono flex justify-between">
                    <span>5 libres</span>
                    <span>{billableReservations} comisionables</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                    <span>Duración Promedio / Sesión</span>
                    <span className="text-[#00FF87] font-mono">{avgHoursPerSession} horas</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={avgHoursPerSession}
                    onChange={(e) => setAvgHoursPerSession(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#05110C] rounded-lg appearance-none cursor-pointer accent-[#00FF87]"
                  />
                  <div className="text-[11px] text-neutral-400 font-mono text-right">
                    <span>{deliveredKwhPerSession} kWh transferidos</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Tarjeta de Resumen Financiero (5 Columnas) */}
            <div className="lg:col-span-5 bg-[#05110C] border border-[#00FF87]/40 rounded-3xl p-6 sm:p-7 space-y-6 shadow-[0_0_30px_rgba(0,255,135,0.15)] flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="border-b border-[#1A3028] pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#00FF87] font-bold block">
                    Rentabilidad Mensual Estimada
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                    ${netProfitMonthly.toFixed(2)} <span className="text-sm font-normal text-neutral-400">USD / mes</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Ganancia líquida para el anfitrión libre de costo eléctrico y comisión.
                  </p>
                </div>

                {/* Desglose de Operación */}
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>Ingresos Brutos ({estimatedMonthlyReservations} reservas):</span>
                    <span className="font-bold text-white">${grossMonthlyRevenue.toFixed(2)} USD</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Costo Energía EEQ/CNEL ($0.08/kWh):</span>
                    <span className="text-red-400">-${energyCostMonthly.toFixed(2)} USD</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Cuota Gratuita (5 reservas):</span>
                    <span className="text-[#00FF87]">$0.00 (100% Gratis)</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Comisión ChargeWay (20% en {billableReservations} res):</span>
                    <span className="text-amber-400">-${totalCommissionMonthly.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={onOpenRegister}
                  className="w-full py-3.5 rounded-full bg-[#00FF87] hover:bg-[#00E077] text-[#030A07] font-bold text-sm shadow-[0_0_20px_rgba(0,255,135,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Registrar mi Espacio Gratis</span>
                  <ArrowRight size={16} />
                </button>
                <div className="text-center text-[10px] text-neutral-400">
                  Activación inmediata · Sin contratos de permanencia
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
