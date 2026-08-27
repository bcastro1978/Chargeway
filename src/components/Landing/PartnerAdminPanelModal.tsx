'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Check, XCircle, QrCode, Camera, ShieldCheck, Clock, User, Car,
  AlertTriangle, Star, DollarSign, Zap, Calendar, Sliders, TrendingUp,
  Search, Lock, CheckCircle2, RefreshCw, Edit3, Settings, ShieldAlert, Sparkles, Filter, RotateCcw
} from 'lucide-react';
import { fetchReservations, updateReservationStatus, validateQrToken, fetchPartnerChargingPoints, saveHostSchedules, fetchHostSchedules } from '@/lib/services/partner';
import type { ChargerReservation, PartnerChargingPoint, HostSchedule } from '@/types/partner';

interface PartnerAdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const PartnerAdminPanelModal: React.FC<PartnerAdminPanelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'kpi' | 'requests' | 'schedules' | 'scanner' | 'settings'>('kpi');
  const [reservations, setReservations] = useState<ChargerReservation[]>([]);
  const [partnerPoints, setPartnerPoints] = useState<PartnerChargingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Point & Date Range Filters
  const [filterPointId, setFilterPointId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Reservation Status & Search Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Schedules state
  const [hostSchedules, setHostSchedules] = useState<HostSchedule[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string>('');
  const [isSavingSchedules, setIsSavingSchedules] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState(false);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Scanner state
  const [inputQrToken, setInputQrToken] = useState('');
  const [scanResult, setScanResult] = useState<{
    success?: boolean;
    message?: string;
    reservation?: ChargerReservation;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [resList, pointsList] = await Promise.all([
      fetchReservations(),
      fetchPartnerChargingPoints(),
    ]);
    setReservations(resList);
    setPartnerPoints(pointsList);

    if (pointsList.length > 0) {
      const activePt = pointsList[0];
      setSelectedPointId(activePt.id);
      const scheds = await fetchHostSchedules(activePt.id);
      if (scheds.length > 0) {
        setHostSchedules(scheds);
      } else {
        setHostSchedules(
          [0, 1, 2, 3, 4, 5, 6].map((day) => ({
            charging_point_id: activePt.id,
            day_of_week: day,
            open_time: '08:00',
            close_time: '20:00',
            slot_duration_minutes: 60,
            is_enabled: day >= 1 && day <= 5,
          }))
        );
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // When selectedPointId or filterPointId changes in Schedules tab, load that point's schedule
  const handlePointChangeForSchedule = async (pointId: string) => {
    setSelectedPointId(pointId);
    setFilterPointId(pointId);
    const scheds = await fetchHostSchedules(pointId);
    if (scheds.length > 0) {
      setHostSchedules(scheds);
    } else {
      setHostSchedules(
        [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          charging_point_id: pointId,
          day_of_week: day,
          open_time: '08:00',
          close_time: '20:00',
          slot_duration_minutes: 60,
          is_enabled: day >= 1 && day <= 5,
        }))
      );
    }
  };

  if (!isOpen) return null;

  const handleApprove = async (id: string) => {
    try {
      await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_reservation_status', reservationId: id, status: 'confirmed' }),
      });
    } catch (e) {
      await updateReservationStatus(id, 'confirmed');
    }
    loadData();
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    try {
      await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_reservation_status',
          reservationId: rejectingId,
          status: 'rejected',
          rejectReason: rejectReason || 'No disponible en el horario solicitado.',
        }),
      });
    } catch (e) {
      await updateReservationStatus(rejectingId, 'rejected', rejectReason || 'No disponible en el horario solicitado.');
    }
    setRejectingId(null);
    setRejectReason('');
    loadData();
  };

  const handleValidateQr = async () => {
    if (!inputQrToken.trim()) return;
    const res = await validateQrToken(inputQrToken);
    setScanResult(res);
  };

  const handleSaveSchedules = async () => {
    if (!selectedPointId) return;
    setIsSavingSchedules(true);
    await saveHostSchedules(selectedPointId, hostSchedules);
    setIsSavingSchedules(false);
    setScheduleSuccessMsg(true);
    setTimeout(() => setScheduleSuccessMsg(false), 3000);
  };

  const toggleDaySchedule = (dayIndex: number) => {
    setHostSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayIndex ? { ...s, is_enabled: !s.is_enabled } : s))
    );
  };

  const updateDayTime = (dayIndex: number, field: 'open_time' | 'close_time', val: string) => {
    setHostSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayIndex ? { ...s, [field]: val } : s))
    );
  };

  // Base Reservations Filter (Point + Date Range Desde-Hasta)
  const baseFilteredReservations = reservations.filter((res) => {
    // 1. Filter by specific Charging Point if selected
    if (filterPointId !== 'all' && res.charging_point_id !== filterPointId) {
      return false;
    }

    // 2. Filter by Date Range (Desde - Hasta)
    const resDate = (res.reservation_date || '').split('T')[0];
    if (startDate && resDate < startDate) return false;
    if (endDate && resDate > endDate) return false;

    return true;
  });

  // Final Filter for Table Display (Status + Text Search Query)
  const filteredReservations = baseFilteredReservations.filter((res) => {
    if (statusFilter !== 'all' && res.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = res.driver_name.toLowerCase().includes(q);
      const matchEmail = res.driver_email.toLowerCase().includes(q);
      const matchVehicle = res.vehicle_model.toLowerCase().includes(q);
      return matchName || matchEmail || matchVehicle;
    }
    return true;
  });

  // Active Point Specs
  const activePoint = filterPointId !== 'all'
    ? partnerPoints.find((p) => p.id === filterPointId) || partnerPoints[0]
    : partnerPoints[0];
  const powerKw = activePoint ? activePoint.power_kw : 7.0;
  const pricePerKwh = activePoint ? (activePoint.price_per_kwh || 0.15) : 0.15;

  // Calculate Dashboard Metrics based on filtered date range and selected point
  const pendingCount = baseFilteredReservations.filter((r) => r.status === 'pending').length;
  const confirmedReservations = baseFilteredReservations.filter((r) => r.status === 'confirmed');
  const confirmedCount = confirmedReservations.length;
  const rejectedCount = baseFilteredReservations.filter((r) => r.status === 'rejected').length;

  let totalOperatingHours = 0;
  confirmedReservations.forEach((res) => {
    const startH = parseInt((res.start_time || '00:00').split(':')[0], 10);
    const endH = parseInt((res.end_time || '00:00').split(':')[0], 10);
    const duration = Math.max(1, endH - startH);
    totalOperatingHours += duration;
  });

  const totalKwhDelivered = Number((totalOperatingHours * powerKw).toFixed(1));
  const estimatedRevenue = (totalKwhDelivered * pricePerKwh).toFixed(2);

  // Calculate Weekly Occupancy Rate
  let weeklyEnabledHours = 0;
  hostSchedules.forEach((s) => {
    if (s.is_enabled) {
      const openH = parseInt((s.open_time || '08:00').split(':')[0], 10);
      const closeH = parseInt((s.close_time || '20:00').split(':')[0], 10);
      weeklyEnabledHours += Math.max(0, closeH - openH);
    }
  });

  const occupancyRate = weeklyEnabledHours > 0
    ? Math.min(100, Math.round((totalOperatingHours / weeklyEnabledHours) * 100))
    : 0;

  const hasActiveFilters = filterPointId !== 'all' || startDate !== '' || endDate !== '';

  const handleResetFilters = () => {
    setFilterPointId('all');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-5xl bg-[#0B100D] border border-white/[0.1] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden text-[#E2E8E4] space-y-4 max-h-[92vh] flex flex-col">
        
        {/* Header Dashboard - Automotive Precision */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#080C0A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00E58F]/10 border border-[#00E58F]/30 flex items-center justify-center text-[#00E58F] shadow-[0_0_15px_rgba(0,229,143,0.15)]">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Panel de Control Anfitrión
                </h3>
                <span className="bg-[#00E58F]/15 text-[#00E58F] border border-[#00E58F]/30 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold">
                  Host Console
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-light">
                Gestión de reservas, disponibilidad y liquidación de saldo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 🎛️ FILTROS EJECUTIVOS */}
        <div className="mx-6 bg-black/40 p-3 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 text-xs">
          
          {/* Selector de Punto Eléctrico */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-neutral-400 font-medium flex items-center gap-1.5 shrink-0 text-[11px]">
              <Zap size={13} className="text-[#00E58F]" />
              <span>Punto:</span>
            </label>
            <select
              value={filterPointId}
              onChange={(e) => {
                setFilterPointId(e.target.value);
                if (e.target.value !== 'all') {
                  handlePointChangeForSchedule(e.target.value);
                }
              }}
              className="w-full bg-[#080C0A] border border-white/[0.08] focus:border-[#00E58F]/60 rounded-xl px-3 py-1.5 text-white font-medium outline-none text-xs truncate cursor-pointer"
            >
              <option value="all">Todos los Puntos Registrados ({partnerPoints.length})</option>
              {partnerPoints.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name} ({pt.city}) • {pt.power_kw} kW
                </option>
              ))}
            </select>
          </div>

          {/* Rango de Fechas: Desde - Hasta */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <label className="text-neutral-400 text-[11px] font-semibold flex items-center gap-1">
                <Calendar size={13} className="text-emerald-400" /> Desde:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black border border-[#1A3028] focus:border-emerald-500 rounded-xl px-2.5 py-1.5 text-white outline-none text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-neutral-400 text-[11px] font-semibold">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black border border-[#1A3028] focus:border-emerald-500 rounded-xl px-2.5 py-1.5 text-white outline-none text-xs"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Limpiar Filtros"
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold shrink-0"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive KPI Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="bg-[#050E0A] p-3 rounded-2xl border border-[#1A3028] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase font-mono font-bold block">Pendientes</span>
              <span className="text-lg font-black text-amber-400">{pendingCount}</span>
            </div>
          </div>

          <div className="bg-[#050E0A] p-3 rounded-2xl border border-[#1A3028] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase font-mono font-bold block">Confirmadas</span>
              <span className="text-lg font-black text-emerald-400">{confirmedCount}</span>
            </div>
          </div>

          <div className="bg-[#050E0A] p-3 rounded-2xl border border-[#1A3028] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase font-mono font-bold block">Ingresos Est.</span>
              <span className="text-lg font-black text-cyan-400">${estimatedRevenue}</span>
            </div>
          </div>

          <div className="bg-[#050E0A] p-3 rounded-2xl border border-[#1A3028] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold">
              <Star size={18} fill="currentColor" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase font-mono font-bold block">Reputación</span>
              <span className="text-lg font-black text-amber-300">4.9 / 5.0</span>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex gap-2 border-b border-[#1A3028] pb-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'kpi'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#050E0A] text-neutral-400 hover:text-white border border-[#1A3028]'
            }`}
          >
            <TrendingUp size={14} />
            <span>📊 Resumen & KPIs</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#050E0A] text-neutral-400 hover:text-white border border-[#1A3028]'
            }`}
          >
            <Clock size={14} />
            <span>📋 Solicitudes ({baseFilteredReservations.length})</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] flex items-center justify-center font-black animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'schedules'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#050E0A] text-neutral-400 hover:text-white border border-[#1A3028]'
            }`}
          >
            <Calendar size={14} />
            <span>📅 Disponibilidad & Horarios</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#050E0A] text-neutral-400 hover:text-white border border-[#1A3028]'
            }`}
          >
            <Camera size={14} />
            <span>📷 Escáner Pase QR</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#050E0A] text-neutral-400 hover:text-white border border-[#1A3028]'
            }`}
          >
            <Settings size={14} />
            <span>⚙️ Mi Punto de Carga</span>
          </button>
        </div>

        {/* TAB 0: RESUMEN & KPIS */}
        {activeTab === 'kpi' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 bg-[#050E0A] p-4 rounded-2xl border border-[#1A3028] space-y-3">
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <span>Rendimiento del Punto de Carga</span>
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  Resumen de carga y disponibilidad filtrado por el punto y fechas seleccionadas.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-[#091D17] p-3 rounded-xl border border-emerald-500/30">
                    <span className="text-[10px] text-neutral-400 block font-mono">Energía Vendida</span>
                    <span className="text-base font-black text-emerald-400">{totalKwhDelivered} kWh</span>
                  </div>
                  <div className="bg-[#091D17] p-3 rounded-xl border border-emerald-500/30">
                    <span className="text-[10px] text-neutral-400 block font-mono">Horas de Operación</span>
                    <span className="text-base font-black text-cyan-400">{totalOperatingHours} hrs</span>
                  </div>
                  <div className="bg-[#091D17] p-3 rounded-xl border border-emerald-500/30">
                    <span className="text-[10px] text-neutral-400 block font-mono">Tasa de Ocupación</span>
                    <span className="text-base font-black text-amber-400">{occupancyRate}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono italic">
                  💡 Fórmula de Ingresos: {totalOperatingHours} hrs × {powerKw} kW × ${pricePerKwh}/kWh = <strong className="text-emerald-400">${estimatedRevenue}</strong>
                </div>
              </div>

              <div className="bg-[#050E0A] p-4 rounded-2xl border border-[#1A3028] space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-white text-sm flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Punto de Carga Filtrado</span>
                  </h4>
                  {activePoint ? (
                    <div className="mt-2 space-y-1">
                      <p className="font-bold text-emerald-400 text-xs">{activePoint.name}</p>
                      <p className="text-neutral-400 text-[11px]">{activePoint.address}</p>
                      <span className="inline-block bg-emerald-500/20 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                        {activePoint.connector_type} • {activePoint.power_kw} kW
                      </span>
                    </div>
                  ) : (
                    <p className="text-neutral-400 text-xs">Cargando datos del punto...</p>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('schedules')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  ⚙️ Configurar Horarios & Disponibilidad
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: SOLICITUDES DE RESERVA */}
        {activeTab === 'requests' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
            
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-[#050E0A] p-3 rounded-2xl border border-[#1A3028]">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer ${
                    statusFilter === 'all' ? 'bg-emerald-500 text-slate-950' : 'bg-neutral-900 text-neutral-400'
                  }`}
                >
                  Todas ({baseFilteredReservations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer ${
                    statusFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'bg-neutral-900 text-amber-400'
                  }`}
                >
                  Pendientes ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('confirmed')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer ${
                    statusFilter === 'confirmed' ? 'bg-emerald-500 text-slate-950' : 'bg-neutral-900 text-emerald-400'
                  }`}
                >
                  Confirmadas ({confirmedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer ${
                    statusFilter === 'rejected' ? 'bg-rose-500 text-white' : 'bg-neutral-900 text-rose-400'
                  }`}
                >
                  Rechazadas ({rejectedCount})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o auto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black border border-[#1A3028] focus:border-emerald-500 rounded-xl pl-8 pr-3 py-1.5 text-white outline-none text-xs"
                />
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 bg-[#050E0A] rounded-2xl border border-[#1A3028] space-y-2">
                <Clock size={32} className="mx-auto text-neutral-600" />
                <p className="font-bold">No se encontraron solicitudes con este filtro.</p>
              </div>
            ) : (
              filteredReservations.map((res) => (
                <div
                  key={res.id}
                  className="bg-[#050E0A] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{res.driver_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          res.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : res.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {res.status === 'pending' ? '⏳ PENDIENTE' : res.status === 'confirmed' ? '✅ CONFIRMADA' : '❌ RECHAZADA'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-neutral-300 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Car size={13} /> {res.vehicle_model}
                      </span>
                      <span className="flex items-center gap-1 text-neutral-300">
                        <Clock size={13} className="text-emerald-400" /> {res.reservation_date} • {res.start_time} - {res.end_time}
                      </span>
                      <span className="text-neutral-400">✉️ {res.driver_email}</span>
                      {res.driver_phone && <span className="text-neutral-400">📱 {res.driver_phone}</span>}
                    </div>

                    {res.status === 'confirmed' && res.qr_token && (
                      <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 inline-flex items-center gap-1.5 mt-1 font-bold">
                        <Lock size={12} /> PASE DIGITAL QR: {res.qr_token}
                      </div>
                    )}

                    {res.status === 'rejected' && res.reject_reason && (
                      <div className="text-[10px] text-rose-300 italic bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-500/20 inline-block">
                        Motivo de rechazo: "{res.reject_reason}"
                      </div>
                    )}
                  </div>

                  {/* Actions for Pending Status */}
                  {res.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleApprove(res.id)}
                        className="flex-1 sm:flex-initial py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      >
                        <Check size={15} /> Aprobar Reserva
                      </button>
                      <button
                        onClick={() => setRejectingId(res.id)}
                        className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <XCircle size={15} /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: MATRIZ DE DISPONIBILIDAD & HORARIOS */}
        {activeTab === 'schedules' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
            <div className="bg-[#050E0A] p-4 rounded-2xl border border-[#1A3028] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-white text-sm flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-400" />
                    <span>Configuración de Días y Horarios de Atención</span>
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    Activa o desactiva días de atención. Los días o franjas deshabilitadas se bloquearán automáticamente en las reservas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSchedules}
                  disabled={isSavingSchedules}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  <RefreshCw size={14} className={isSavingSchedules ? 'animate-spin' : ''} />
                  <span>{isSavingSchedules ? 'Guardando...' : 'Guardar Horarios'}</span>
                </button>
              </div>

              {scheduleSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Horarios de atención actualizados y guardados en la nube con éxito.
                </div>
              )}

              <div className="space-y-2 pt-2">
                {hostSchedules.map((sched, idx) => (
                  <div
                    key={sched.day_of_week}
                    className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                      sched.is_enabled
                        ? 'bg-[#091D17] border-emerald-500/40'
                        : 'bg-neutral-950 border-neutral-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDaySchedule(sched.day_of_week)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs cursor-pointer ${
                          sched.is_enabled
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                        }`}
                      >
                        {sched.is_enabled ? '✓' : ''}
                      </button>
                      <span className="font-black text-sm text-white">{DAYS_NAMES[sched.day_of_week]}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sched.is_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {sched.is_enabled ? 'ABIERTO' : 'CERRADO / DESHABILITADO'}
                      </span>
                    </div>

                    {sched.is_enabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 text-[11px]">Desde:</span>
                        <input
                          type="time"
                          value={sched.open_time}
                          onChange={(e) => updateDayTime(sched.day_of_week, 'open_time', e.target.value)}
                          className="bg-black border border-[#1A3028] focus:border-emerald-500 rounded-xl px-2 py-1 text-white text-xs outline-none"
                        />
                        <span className="text-neutral-400 text-[11px]">Hasta:</span>
                        <input
                          type="time"
                          value={sched.close_time}
                          onChange={(e) => updateDayTime(sched.day_of_week, 'close_time', e.target.value)}
                          className="bg-black border border-[#1A3028] focus:border-emerald-500 rounded-xl px-2 py-1 text-white text-xs outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VALIDAR PASE QR EN CÁMARA */}
        {activeTab === 'scanner' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
            <div className="bg-[#050E0A] p-5 rounded-2xl border border-[#1A3028] space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Camera size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-black text-white">Escáner de Validación de Pase Digital QR</h4>
                <p className="text-neutral-400 text-[11px] max-w-md mx-auto leading-relaxed">
                  Escanea el pase QR presentado por el conductor al llegar al punto para validar su reserva y dar inicio a la sesión de carga.
                </p>
              </div>

              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="ej. CW-QR-AB12345-9988"
                  value={inputQrToken}
                  onChange={(e) => setInputQrToken(e.target.value)}
                  className="flex-1 bg-black border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2.5 text-white font-mono text-xs outline-none"
                />
                <button
                  onClick={handleValidateQr}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  Validar Pase
                </button>
              </div>
            </div>

            {/* Scan Result Output */}
            {scanResult && (
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  scanResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-black">
                  {scanResult.success ? <ShieldCheck size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-rose-400" />}
                  <span>{scanResult.message}</span>
                </div>

                {scanResult.reservation && (
                  <div className="bg-black/80 p-3.5 rounded-xl space-y-1.5 text-white text-xs border border-emerald-500/30">
                    <div><strong>Cliente:</strong> {scanResult.reservation.driver_name}</div>
                    <div><strong>Vehículo:</strong> {scanResult.reservation.vehicle_model}</div>
                    <div><strong>Horario Reservado:</strong> {scanResult.reservation.reservation_date} • {scanResult.reservation.start_time} - {scanResult.reservation.end_time}</div>
                    <div><strong>Estado del Pase:</strong> <span className="text-emerald-400 font-bold uppercase">VALIDADO OK</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ADMINISTRAR MI PUNTO DE CARGA */}
        {activeTab === 'settings' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
            {partnerPoints.map((pt) => (
              <div
                key={pt.id}
                className="bg-[#050E0A] border border-[#1A3028] p-4 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#1A3028] pb-2">
                  <div>
                    <h5 className="font-black text-white text-sm">{pt.name}</h5>
                    <p className="text-neutral-400 text-[11px]">{pt.address} ({pt.city}, {pt.province})</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">
                    <Star size={13} fill="currentColor" />
                    <span>{pt.rating_avg || '5.0'}</span>
                    <span className="text-neutral-400 text-[10px]">({pt.rating_count || 0})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-[#091D17] p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-neutral-400 block font-mono">Tipo Conector</span>
                    <span className="font-bold text-emerald-400">{pt.connector_type}</span>
                  </div>
                  <div className="bg-[#091D17] p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-neutral-400 block font-mono">Potencia</span>
                    <span className="font-bold text-cyan-400">{pt.power_kw} kW</span>
                  </div>
                  <div className="bg-[#091D17] p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-neutral-400 block font-mono">Tarifa Aplicada</span>
                    <span className="font-bold text-amber-400">${pt.price_per_kwh || '0.15'}/kWh</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal Backdrop */}
        {rejectingId && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <form onSubmit={handleRejectSubmit} className="bg-[#0B1713] p-5 rounded-3xl border border-rose-500/40 max-w-md w-full space-y-3 text-xs shadow-2xl">
              <h4 className="font-black text-rose-400 text-sm flex items-center gap-2">
                <XCircle size={18} /> Rechazar Solicitud de Reserva
              </h4>
              <p className="text-neutral-300">Ingresa el comentario o motivo explicativo que se enviará al cliente por correo:</p>
              <textarea
                required
                rows={3}
                placeholder="ej. El punto se encuentra ocupado por mantenimiento preventivo en esa hora."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-black border border-[#1A3028] focus:border-rose-500 rounded-xl p-2.5 text-white outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="py-2 px-4 rounded-xl border border-neutral-700 text-neutral-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
