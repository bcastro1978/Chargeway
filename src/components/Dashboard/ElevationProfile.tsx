'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  ReferenceLine, ReferenceArea 
} from 'recharts';
import { 
  Gauge, Award, TrendingUp, TrendingDown, Minus, BatteryCharging, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, Zap, ShieldCheck,
  Clock, Mountain, Battery, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { ElevationPoint } from '@/lib/services/elevation';
import { SegmentTip, AdvisorFeedback } from '@/lib/agents/RouteAdvisorAgent';
import { useTripStore } from '@/lib/store/useTripStore';

interface ElevationProfileProps {
  data: ElevationPoint[];
  totalDistanceKm?: number;
  segmentTips?: SegmentTip[];
  hoveredSegment?: number | null;
  advisorFeedback?: AdvisorFeedback | null;
  onSelectSegment?: (index: number | null) => void;
}

const ElevationProfileComponent: React.FC<ElevationProfileProps> = ({ 
  data, 
  totalDistanceKm, 
  segmentTips = [],
  hoveredSegment = null,
  advisorFeedback,
  onSelectSegment
}) => {
  // Quantize distance to 0.2 km increments to prevent Recharts from doing 60 SVG tree rebuilds every minute when only moving slightly
  const currentDistance = useTripStore(
    useCallback((state) => Math.round((state.currentDistance || 0) * 5) / 5, [])
  );
  const selectedVehicle = useTripStore(state => state.selectedVehicle);
  const batteryCapacity = selectedVehicle?.specs?.usable_battery_kwh || 38.8;
  const wltpRangeKm = selectedVehicle?.specs?.wltp_range_km || 344;
  const vehicleSoc = useTripStore(state => state.soc ?? 1.0);
  const tripPlan = useTripStore(state => state.tripPlan);

  // Normalized Current Battery SoC (handles 0.0 - 1.0 float and 0 - 100 integer)
  const normalizedCurrentSoc = useMemo(() => {
    if (typeof vehicleSoc === 'number' && !isNaN(vehicleSoc)) {
      return vehicleSoc <= 1.0 ? Math.round(vehicleSoc * 100) : Math.round(vehicleSoc);
    }
    return 100;
  }, [vehicleSoc]);

  // Remaining Autonomy in km based on vehicle specs and current SoC
  const remainingAutonomyKm = useMemo(() => {
    return Math.round(wltpRangeKm * (normalizedCurrentSoc / 100));
  }, [wltpRangeKm, normalizedCurrentSoc]);

  // 1. Resolve Tips & Segments with strict literal types
  const tips = useMemo(() => {
    if (segmentTips && segmentTips.length > 0) return segmentTips;
    if (advisorFeedback?.segmentTips && advisorFeedback.segmentTips.length > 0) return advisorFeedback.segmentTips;
    
    const totalDist = totalDistanceKm || 120;
    return [
      {
        startKm: 0,
        endKm: +(totalDist * 0.14).toFixed(1),
        type: 'plano' as const,
        title: 'Plano - Eficiente',
        advice: 'Mantén aceleración progresiva y velocidad crucero constante en autovía.',
        speedRecommendation: 80,
        regenLevel: 'Medio' as const
      },
      {
        startKm: +(totalDist * 0.14).toFixed(1),
        endKm: +(totalDist * 0.42).toFixed(1),
        type: 'subida' as const,
        title: 'Subida a la Cumbre',
        advice: 'Dosifica acelerador a 72 km/h para estabilizar el consumo y evitar picos térmicos.',
        speedRecommendation: 72,
        regenLevel: 'Bajo' as const
      },
      {
        startKm: +(totalDist * 0.42).toFixed(1),
        endKm: +(totalDist * 0.75).toFixed(1),
        type: 'bajada' as const,
        title: 'Descenso Interandino',
        advice: 'Aprovecha la inercia del vehículo y activa regeneración alta para recuperar batería.',
        speedRecommendation: 80,
        regenLevel: 'Alto' as const
      },
      {
        startKm: +(totalDist * 0.75).toFixed(1),
        endKm: +totalDist.toFixed(1),
        type: 'plano' as const,
        title: 'Llegada y Zona Urbana',
        advice: 'Conducción suave anticipando frenadas hacia el punto de carga.',
        speedRecommendation: 60,
        regenLevel: 'Medio' as const
      }
    ];
  }, [segmentTips, advisorFeedback, totalDistanceKm]);

  // Current segment index where the vehicle is located
  const currentSegmentIndex = useMemo(() => {
    if (!tips.length) return 0;
    const curDist = currentDistance || 0;
    const foundIdx = tips.findIndex(t => curDist >= t.startKm && curDist <= t.endKm);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [tips, currentDistance]);

  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);
  const [isCockpitDetailsExpanded, setIsCockpitDetailsExpanded] = useState(false);

  useEffect(() => {
    if (hoveredSegment !== null && hoveredSegment !== undefined) {
      setInspectedIndex(hoveredSegment);
    } else {
      setInspectedIndex(null);
    }
  }, [hoveredSegment]);

  const activeIndex = inspectedIndex !== null ? inspectedIndex : currentSegmentIndex;
  const activeTip: SegmentTip = tips[activeIndex] || tips[0];
  const isVehicleInActiveSegment = activeIndex === currentSegmentIndex;

  // Handler to select a segment and synchronize all views
  const handleSelectSegment = (idx: number) => {
    if (inspectedIndex === idx) {
      setInspectedIndex(null);
      if (onSelectSegment) onSelectSegment(null as any);
      return;
    }
    setInspectedIndex(idx);
    if (onSelectSegment) onSelectSegment(idx);
  };

  // 2. Prepare Elevation Chart Data (Aligned with Ecuadorian Andes Topography: Quito 2820m -> Chasqui 3610m -> Latacunga 2760m)
  const totalDist = totalDistanceKm || (tips.length ? tips[tips.length - 1].endKm : 82);

  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return data.map((p, i) => ({
        dist: Math.round((i / Math.max(1, data.length - 1)) * totalDist * 10) / 10,
        alt: Math.round(p.elevation)
      }));
    }
    // Real Andean Topography Profile: Quito (2820m) -> Paso Chasqui/Cotopaxi (3610m) -> Latacunga (2760m)
    return [
      { dist: 0, alt: 2820 },                              // Quito (Rumipamba)
      { dist: +(totalDist * 0.18).toFixed(1), alt: 2890 }, // Tambillo / Machachi
      { dist: +(totalDist * 0.36).toFixed(1), alt: 3260 }, // Ascenso hacia Cotopaxi
      { dist: +(totalDist * 0.52).toFixed(1), alt: 3610 }, // Cumbre Paso El Chasqui (Punto más alto)
      { dist: +(totalDist * 0.70).toFixed(1), alt: 3080 }, // Descenso hacia Lasso
      { dist: +(totalDist * 0.86).toFixed(1), alt: 2840 }, // Valle de Latacunga
      { dist: +totalDist.toFixed(1), alt: 2760 }           // Latacunga
    ];
  }, [data, totalDist]);

  const { minAlt, maxAlt, totalGain, totalLoss } = useMemo(() => {
    if (!data || data.length === 0) {
      return { minAlt: 2760, maxAlt: 3610, totalGain: 880, totalLoss: 940 };
    }
    let min = Infinity, max = -Infinity, gain = 0, loss = 0;
    for (let i = 0; i < data.length; i++) {
      const e = data[i].elevation;
      if (e < min) min = e;
      if (e > max) max = e;
      if (i > 0) {
        const diff = data[i].elevation - data[i - 1].elevation;
        if (diff > 0) gain += diff;
        else loss += Math.abs(diff);
      }
    }
    return { minAlt: Math.round(min), maxAlt: Math.round(max), totalGain: Math.round(gain), totalLoss: Math.round(loss) };
  }, [data]);

  const yMin = Math.max(0, Math.floor((minAlt - 60) / 100) * 100);
  const yMax = Math.ceil((maxAlt + 60) / 100) * 100;

  // Custom 3-tick scale for high-altitude Andean profile
  const yTicks = useMemo(() => {
    return [
      Math.round(yMin / 100) * 100,
      Math.round((yMin + (yMax - yMin) * 0.5) / 100) * 100,
      Math.round(yMax / 100) * 100
    ];
  }, [yMin, yMax]);

  // 3. Distance Scale Ticks along the X-Axis (Collision-Free)
  const xTicks = useMemo(() => {
    const step = totalDist <= 40 ? 10 : totalDist <= 100 ? 20 : totalDist <= 180 ? 25 : 50;
    const ticks: number[] = [];
    for (let d = 0; d < totalDist; d += step) {
      ticks.push(d);
    }
    const roundedEnd = Math.round(totalDist);
    // Avoid tick collision at the right border (e.g. 80 and 82 km)
    if (ticks.length > 0 && (roundedEnd - ticks[ticks.length - 1]) < step * 0.55) {
      ticks[ticks.length - 1] = roundedEnd;
    } else if (!ticks.includes(roundedEnd)) {
      ticks.push(roundedEnd);
    }
    return ticks;
  }, [totalDist]);

  // 4. Dynamic Projected Savings KPI (Accumulated in route descents)
  const routeSavings = useMemo(() => {
    let recoveredKwh = 0;
    if (tripPlan?.simulation?.breakdown?.regenRecoveredWh && tripPlan.simulation.breakdown.regenRecoveredWh > 0) {
      recoveredKwh = tripPlan.simulation.breakdown.regenRecoveredWh / 1000;
    } else {
      const simTimeline = tripPlan?.simulation?.socTimeline;
      if (simTimeline && simTimeline.length > 1) {
        for (let i = 1; i < simTimeline.length; i++) {
          const diffSoc = simTimeline[i].soc - simTimeline[i - 1].soc;
          if (diffSoc > 0) {
            recoveredKwh += diffSoc * batteryCapacity;
          }
        }
      }
      if (recoveredKwh === 0) {
        const startSoC = normalizedCurrentSoc;
        tips.forEach(t => {
          if (t.type === 'bajada' && startSoC < 95) {
            const d = Math.max(0, t.endKm - t.startKm);
            recoveredKwh += d * 0.035;
          }
        });
      }
    }
    const kmPerKwh = wltpRangeKm / Math.max(1, batteryCapacity);
    const bonusKm = Math.round(recoveredKwh * kmPerKwh);
    return {
      bonusKm: Math.max(0, bonusKm),
      recoveredKwh: Number(recoveredKwh.toFixed(1))
    };
  }, [tips, wltpRangeKm, batteryCapacity, tripPlan, normalizedCurrentSoc]);

  const totalProjectedSavingsKm = routeSavings.bonusKm;

  // 5. Intelligent Charging Status (Determines if route is Direct vs Needs Charging)
  const tripArrivalSocPct = useMemo(() => {
    if (tripPlan?.arrivalSoc !== undefined && tripPlan?.arrivalSoc !== null) {
      return Math.round(tripPlan.arrivalSoc <= 1.0 ? tripPlan.arrivalSoc * 100 : tripPlan.arrivalSoc);
    }
    return 74;
  }, [tripPlan]);

  const isDirectTrip = useMemo(() => {
    // Direct only if arrival SoC >= 12% and no suggested charging stop
    return tripArrivalSocPct >= 12 && !tripPlan?.suggestedChargingStop;
  }, [tripArrivalSocPct, tripPlan]);

  const nextChargerInfo = useMemo(() => {
    const curDist = currentDistance || 0;
    
    // 1. Gather all actual charging stops along the route with their exact positions
    const candidateStops: Array<{ name: string; posKm: number }> = [];

    // Check intermediate waypoints from routePoints using Mapbox route legs
    const wps = useTripStore.getState().routePoints;
    const legs = tripPlan?.route?.legs || [];
    let cumKm = 0;
    for (let i = 0; i < legs.length && i + 1 < wps.length; i++) {
      cumKm += legs[i].distance / 1000;
      const wp = wps[i + 1];
      const isLastPoint = i + 1 === wps.length - 1;
      if (!isLastPoint && wp?.name) {
        const isCharger = /byd|kia|jac|cargador|electrolinera|ultra|evinka|condor|rayo|primax|terpel/i.test(wp.name);
        if (isCharger) {
          candidateStops.push({ name: wp.name, posKm: Math.round(cumKm * 10) / 10 });
        }
      }
    }

    // Also check physically scheduled suggestedChargingStops
    if (tripPlan?.suggestedChargingStops && tripPlan.suggestedChargingStops.length > 0) {
      tripPlan.suggestedChargingStops.forEach(s => {
        if (s.posKm !== undefined) {
          candidateStops.push({ name: s.nombre || 'Cargador Sugerido', posKm: s.posKm });
        }
      });
    } else if (tripPlan?.suggestedChargingStop && tripPlan.suggestedChargingStop.posKm !== undefined) {
      candidateStops.push({
        name: tripPlan.suggestedChargingStop.nombre || 'Cargador Sugerido',
        posKm: tripPlan.suggestedChargingStop.posKm
      });
    }

    // Sort candidate stops by posKm
    candidateStops.sort((a, b) => a.posKm - b.posKm);

    // Find the nearest stop strictly ahead of current distance
    const nextStop = candidateStops.find(s => s.posKm > curDist + 0.5);

    let chargerDistKm = 0;
    let chargerName = '';
    let isReachable = true;

    if (nextStop) {
      chargerName = nextStop.name;
      chargerDistKm = Math.max(1, Math.round(nextStop.posKm - curDist));
      isReachable = remainingAutonomyKm >= chargerDistKm;
    } else if (candidateStops.length > 0) {
      // All charging stops have already been passed
      chargerName = candidateStops[candidateStops.length - 1].name;
      chargerDistKm = 0;
      isReachable = true;
    } else if (tripPlan?.chargers && tripPlan.chargers.length > 0) {
      chargerName = tripPlan.chargers[0].nombre || 'Estación en Ruta';
      chargerDistKm = Math.max(5, Math.round(totalDist - curDist));
      isReachable = remainingAutonomyKm >= chargerDistKm;
    } else {
      chargerName = 'Sin paradas necesarias';
      chargerDistKm = Math.max(5, Math.round(totalDist - curDist));
      isReachable = true;
    }

    return {
      name: chargerName,
      distanceKm: chargerDistKm,
      isReachable,
      remainingAutonomyKm
    };
  }, [totalDist, currentDistance, tripPlan, remainingAutonomyKm]);

  // 6. Segment Key EV Telemetry (Distance, Estimated Duration, Slope %, SoC Arrival)
  const segmentDistanceKm = Math.max(0.1, +(activeTip.endKm - activeTip.startKm).toFixed(1));
  const segmentDurationMin = Math.max(1, Math.round((segmentDistanceKm / (activeTip.speedRecommendation || 80)) * 60));

  const segmentSlope = useMemo(() => {
    if (activeTip.type === 'bajada') return { label: 'Bajada -4.8%', icon: TrendingDown, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (activeTip.type === 'subida') return { label: 'Subida +5.2%', icon: TrendingUp, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Llano +0.2%', icon: Minus, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  }, [activeTip.type]);

  // 7. Cumulative SoC Timeline: Tracks progressive battery level through each segment
  const segmentSocTimeline = useMemo(() => {
    if (!tips.length) return [];

    // Preference: If the physics simulation has computed the exact continuous timeline, use it directly!
    const simTimeline = tripPlan?.simulation?.socTimeline;
    if (simTimeline && simTimeline.length > 0) {
      const getSimSocAtKm = (km: number): number => {
        for (let i = simTimeline.length - 1; i >= 0; i--) {
          if (simTimeline[i].km <= km) {
            return Math.round(simTimeline[i].soc * 100);
          }
        }
        return Math.round(simTimeline[0].soc * 100);
      };

      return tips.map(t => {
        const entry = Math.max(0, Math.min(100, getSimSocAtKm(t.startKm)));
        const exit = Math.max(0, Math.min(100, getSimSocAtKm(t.endKm)));
        const delta = exit - entry;
        const kwh = Number(Math.abs((delta / 100) * batteryCapacity).toFixed(1));
        const bmsLimited = t.type === 'bajada' && entry >= 95;

        return {
          entrySoc: entry,
          exitSoc: exit,
          deltaSoc: delta,
          kwh,
          type: t.type,
          bmsLimited
        };
      });
    }

    // Fallback: Calculate segment-by-segment physics with BMS cutoff
    let currentLevel = normalizedCurrentSoc;
    return tips.map(t => {
      const segDist = Math.max(0.1, t.endKm - t.startKm);
      const entry = Math.max(0, Math.min(100, Math.round(currentLevel)));

      if (t.type === 'bajada') {
        const bmsFactor = entry >= 95 ? 0 : (entry <= 85 ? 1.0 : (95 - entry) / 10);
        const kwhGained = Number((segDist * 0.04 * bmsFactor).toFixed(1));
        const gainPct = Math.round((kwhGained / batteryCapacity) * 100);
        const exit = Math.min(100, entry + gainPct);
        currentLevel = exit;

        return {
          entrySoc: entry,
          exitSoc: exit,
          deltaSoc: gainPct,
          kwh: kwhGained,
          type: t.type,
          bmsLimited: bmsFactor === 0
        };
      } else if (t.type === 'subida') {
        const kwhLoss = Number((segDist * 0.22).toFixed(1));
        const lossPct = Math.max(2, Math.round((kwhLoss / batteryCapacity) * 100));
        const exit = Math.max(0, entry - lossPct);
        currentLevel = exit;

        return {
          entrySoc: entry,
          exitSoc: exit,
          deltaSoc: -lossPct,
          kwh: kwhLoss,
          type: t.type,
          bmsLimited: false
        };
      } else {
        const kwhLoss = Number((segDist * 0.15).toFixed(1));
        const lossPct = Math.max(1, Math.round((kwhLoss / batteryCapacity) * 100));
        const exit = Math.max(0, entry - lossPct);
        currentLevel = exit;

        return {
          entrySoc: entry,
          exitSoc: exit,
          deltaSoc: -lossPct,
          kwh: kwhLoss,
          type: t.type,
          bmsLimited: false
        };
      }
    });
  }, [tips, normalizedCurrentSoc, tripArrivalSocPct, batteryCapacity, tripPlan]);

  // Context-Accurate Energy Metric with Dynamic Battery SoC Arrival Projection
  const segmentEnergyDetail = useMemo(() => {
    const dist = segmentDistanceKm;
    const timelineItem = segmentSocTimeline[activeIndex] || {
      entrySoc: normalizedCurrentSoc,
      exitSoc: normalizedCurrentSoc,
      deltaSoc: 0,
      kwh: +(dist * 0.14).toFixed(1),
      type: activeTip.type,
      bmsLimited: false
    };

    const entrySoc = timelineItem.entrySoc;
    const exitSoc = timelineItem.exitSoc;
    const socDelta = timelineItem.deltaSoc;

    if (activeTip.type === 'bajada') {
      if (entrySoc >= 95 && socDelta < 0) {
        const kwhLoss = timelineItem.kwh || +(dist * 0.12).toFixed(1);
        const absDelta = Math.abs(socDelta);
        return {
          type: 'consumption',
          title: 'Descenso con BMS Activo al Inicio',
          badge: '🛡️ Regen Restringida Inicial (SoC ≥95%)',
          badgeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
          kwhMetric: `-${kwhLoss} kWh`,
          rateMetric: 'BMS limitando sobrecarga',
          entrySoc: entrySoc,
          exitSoc: exitSoc,
          socDelta: `-${absDelta}%`,
          socDeltaColor: 'text-amber-400',
          explanation: 'Al partir con batería llena (≥95%), el BMS restringe el freno regenerativo al inicio para proteger las celdas de sobrevoltaje hasta que el nivel desciende.'
        };
      }

      if (entrySoc >= 95 && socDelta >= 0) {
        return {
          type: 'regen',
          title: 'Protección BMS Activa',
          badge: '🛡️ Regeneración Bloqueada',
          badgeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
          kwhMetric: '+0.0 kWh (BMS)',
          rateMetric: 'Batería llena (≥95%)',
          entrySoc: entrySoc,
          exitSoc: exitSoc,
          socDelta: '+0%',
          socDeltaColor: 'text-slate-400',
          explanation: 'Batería llena (≥95%): El sistema BMS bloquea la recarga regenerativa para proteger las celdas de sobrevoltaje.'
        };
      }

      // If socDelta is positive, there is net regeneration
      if (socDelta > 0) {
        const kwhGained = timelineItem.kwh || +(dist * 0.04).toFixed(1);
        return {
          type: 'regen',
          title: 'Recuperación de Energía',
          badge: '⚡ Regeneración Neta',
          badgeColor: 'text-[#00E676] bg-emerald-500/15 border-emerald-500/30',
          kwhMetric: `+${kwhGained} kWh`,
          rateMetric: 'Inercia recuperada',
          entrySoc: entrySoc,
          exitSoc: exitSoc,
          socDelta: `+${socDelta}%`,
          socDeltaColor: 'text-[#00E676]',
          explanation: 'Pendiente pronunciada: El motor recupera energía neta y recarga la batería durante la bajada.'
        };
      } else if (socDelta < 0) {
        // In descents where aerodynamics at cruising speed slightly exceed regen, vehicle still regenerates energy
        const kwhLoss = timelineItem.kwh || +(dist * 0.12).toFixed(1);
        const absDelta = Math.abs(socDelta);
        return {
          type: 'consumption',
          title: 'Descenso con Tracción Parcial',
          badge: '⚡ Bajada con Regeneración Parcial',
          badgeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
          kwhMetric: `-${kwhLoss} kWh`,
          rateMetric: 'Regeneración mitigando arrastre',
          entrySoc: entrySoc,
          exitSoc: exitSoc,
          socDelta: `-${absDelta}%`,
          socDeltaColor: 'text-emerald-400',
          explanation: 'El motor eléctrico regenera energía en la bajada amortiguando la resistencia aerodinámica; el consumo neto es sustancialmente menor que en llano.'
        };
      } else {
        return {
          type: 'cruising',
          title: 'Descenso Neutro',
          badge: '⚖️ Balance Energético',
          badgeColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
          kwhMetric: '0.0 kWh',
          rateMetric: 'Equilibrio de fuerzas',
          entrySoc: entrySoc,
          exitSoc: exitSoc,
          socDelta: '0%',
          socDeltaColor: 'text-cyan-300',
          explanation: 'La regeneración compensa con exactitud las pérdidas por fricción y resistencia del aire.'
        };
      }
    } else if (activeTip.type === 'subida') {
      const kwhLoss = timelineItem.kwh || +(dist * 0.22).toFixed(1);
      const absDelta = Math.abs(socDelta) || Math.max(2, Math.round((kwhLoss / batteryCapacity) * 100));
      return {
        type: 'consumption',
        title: 'Consumo en Pendiente',
        badge: '⛰️ Ascenso Exigente',
        badgeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        kwhMetric: `-${kwhLoss} kWh`,
        rateMetric: '220 Wh/km estimado',
        entrySoc: entrySoc,
        exitSoc: exitSoc,
        socDelta: `-${absDelta}%`,
        socDeltaColor: 'text-amber-400',
        explanation: 'Mayor demanda de potencia por inclinación y masa del vehículo.'
      };
    } else {
      const kwhLoss = timelineItem.kwh || +(dist * 0.15).toFixed(1);
      const absDelta = Math.abs(socDelta) || Math.max(1, Math.round((kwhLoss / batteryCapacity) * 100));
      return {
        type: 'cruising',
        title: 'Consumo Crucero',
        badge: '🛣️ Velocidad Eficiente',
        badgeColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
        kwhMetric: `-${kwhLoss} kWh`,
        rateMetric: '150 Wh/km (Consumo Base en Plano)',
        entrySoc: entrySoc,
        exitSoc: exitSoc,
        socDelta: `-${absDelta}%`,
        socDeltaColor: 'text-cyan-300',
        explanation: 'Gasto de referencia en terreno plano a velocidad eficiente (80-90 km/h). 1 kWh ➔ ~6.7 km.'
      };
    }
  }, [activeTip, segmentDistanceKm, batteryCapacity, activeIndex, segmentSocTimeline, normalizedCurrentSoc]);

  // Regen level bar count & descriptions
  const regenLevelInfo = useMemo(() => {
    switch (activeTip.regenLevel) {
      case 'Máximo': return { label: 'Nivel 4', litBars: 4, mode: 'One-Pedal', desc: 'Máx Recuperación' };
      case 'Alto': return { label: 'Nivel 3', litBars: 3, mode: 'Regen Alto', desc: 'Freno Activo' };
      case 'Medio': return { label: 'Nivel 2', litBars: 2, mode: 'Regen Medio', desc: 'Inercia Óptima' };
      default: return { label: 'Nivel 1', litBars: 1, mode: 'Regen Bajo', desc: 'Crucero Libre' };
    }
  }, [activeTip]);

  return (
    <div className="w-full rounded-3xl bg-[#070e17] border border-cyan-500/25 shadow-[0_0_35px_rgba(6,182,212,0.12)] p-4 sm:p-5 md:p-6 flex flex-col gap-4 font-sans select-none transition-all">
      
      {/* 1. TOP HEADER BAR: TITLE & LIVE TELEMETRY STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
            <Gauge size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                Cockpit Táctico EV & Feed de Ruta
              </h3>
              <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                EN RUTA: KM {(currentDistance || 42.5).toFixed(1)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Telemetría predictiva sincronizada con la topografía del viaje
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-brand-lime font-bold flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/5">
            <ArrowUpRight size={13} /> +{totalGain}m
          </span>
          <span className="text-rose-400 font-bold flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/5">
            <ArrowDownRight size={13} /> −{totalLoss}m
          </span>
          <span className="text-slate-400 text-[10px] bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/5 hidden sm:inline-block">
            Desnivel: {Math.round(maxAlt - minAlt)}m
          </span>
        </div>
      </div>

      {/* 2. ALTIMETRIC SPARKLINE RIBBON WITH X-AXIS DISTANCE SCALE */}
      <div className="relative h-[125px] w-full min-w-0 bg-[#050b12] rounded-2xl p-2 border border-white/10 overflow-hidden">
        
        {/* Recharts Area with X-Axis Distance Scale and Click Handler */}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            margin={{ top: 12, right: 15, left: -10, bottom: 6 }}
            onClick={(e: any) => {
              if (e?.activePayload?.[0]?.payload?.dist !== undefined) {
                const dist = e.activePayload[0].payload.dist;
                const foundIdx = tips.findIndex(t => dist >= t.startKm && dist <= t.endKm);
                if (foundIdx !== -1) handleSelectSegment(foundIdx);
              }
            }}
          >
            <defs>
              <linearGradient id="opt3SparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#1e293b" opacity={0.4} />

            {/* Y-Axis (Altitude Scale - High-altitude Andean Topography) */}
            <YAxis 
              domain={[yMin, yMax]} 
              ticks={yTicks}
              tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }}
              tickFormatter={(v: number) => `${v}m`}
              axisLine={{ stroke: '#334155', strokeWidth: 1 }}
              tickLine={{ stroke: '#475569', strokeWidth: 1 }}
              width={46}
            />

            {/* X-Axis Distance Scale in Km */}
            <XAxis 
              dataKey="dist" 
              type="number"
              domain={[0, totalDist]}
              ticks={xTicks}
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
              tickFormatter={(v: number) => `${Math.round(v)} km`}
              axisLine={{ stroke: '#334155', strokeWidth: 1 }}
              tickLine={{ stroke: '#475569', strokeWidth: 1 }}
              interval={0}
            />

            {/* Semantic Colored Segment Backgrounds with Interactive Click & Selection Borders */}
            {tips.map((tip, idx) => {
              const isSelected = activeIndex === idx;
              let fill = '#06b6d4';
              let stroke = 'transparent';

              if (tip.type === 'bajada') {
                fill = '#10b981';
                stroke = isSelected ? '#10b981' : 'transparent';
              } else if (tip.type === 'subida') {
                fill = '#f59e0b';
                stroke = isSelected ? '#f59e0b' : 'transparent';
              } else {
                stroke = isSelected ? '#00e5ff' : 'transparent';
              }

              return (
                <ReferenceArea
                  key={idx}
                  x1={tip.startKm}
                  x2={tip.endKm}
                  fill={fill}
                  fillOpacity={isSelected ? 0.35 : 0.08}
                  stroke={stroke}
                  strokeWidth={isSelected ? 2 : 0}
                  className="cursor-pointer transition-all"
                  onClick={() => handleSelectSegment(idx)}
                />
              );
            })}

            {/* Current Position Marker */}
            <ReferenceLine 
              x={currentDistance || 0} 
              stroke="#00E676" 
              strokeWidth={2}
              strokeDasharray="2 2" 
            />

            {/* Elevation Line Curve */}
            <Area
              type="monotone"
              dataKey="alt"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#opt3SparkGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Transparent Clickable Tramo Buttons Overlay (Guarantees 100% reliable click anywhere in tramo) */}
        <div className="absolute inset-x-10 top-2 bottom-8 flex z-20 pointer-events-auto">
          {tips.map((tip, idx) => {
            const widthPct = Math.max(1, ((tip.endKm - tip.startKm) / totalDist) * 100);
            const isSelected = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSegment(idx)}
                style={{ width: `${widthPct}%` }}
                className={`h-full cursor-pointer transition-all group relative border-t-2 ${
                  isSelected 
                    ? 'border-amber-400 bg-amber-500/15 shadow-inner' 
                    : 'border-transparent hover:bg-white/5 hover:border-cyan-400/40'
                }`}
                title={`Tramo ${idx + 1}: ${tip.title} (${tip.startKm} - ${tip.endKm} km). Clic para ver telemetría.`}
              >
                <span className="sr-only">{tip.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. COCKPIT EN VIVO (EV OPTIMIZED: SOC PROYECTADO, PENDIENTE, TIEMPO, METRICAS DIRECTAS) */}
      <div className="rounded-2xl bg-[#091422]/95 border border-cyan-500/30 p-4 sm:p-5 shadow-[0_0_25px_rgba(6,182,212,0.1)] flex flex-col gap-4 relative overflow-hidden transition-all duration-300">
        
        {/* Active Tramo Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              activeTip.type === 'bajada' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              activeTip.type === 'subida' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            }`}>
              {activeTip.type === 'bajada' ? <TrendingDown size={18} /> :
               activeTip.type === 'subida' ? <TrendingUp size={18} /> :
               <Minus size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                  {activeTip.title}
                </h4>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${segmentSlope.color}`}>
                  <Mountain size={10} /> {segmentSlope.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                <span>{activeTip.startKm} - {activeTip.endKm} km ({segmentDistanceKm} km)</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock size={11} className="text-cyan-400" /> ~{segmentDurationMin} min
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirectTrip ? (
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                Viaje Directo (Llegada con {tripArrivalSocPct}% SoC)
              </span>
            ) : !nextChargerInfo.isReachable ? (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg flex items-center gap-1.5 border text-rose-300 bg-rose-950/70 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                <AlertTriangle size={12} className="text-rose-400 shrink-0 animate-pulse" />
                Carga requerida: a {nextChargerInfo.distanceKm} km (Batería insuficiente)
              </span>
            ) : (
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Zap size={12} className="text-cyan-400 shrink-0" />
                Próxima carga: a {nextChargerInfo.distanceKm} km ({nextChargerInfo.name})
              </span>
            )}

            {!isVehicleInActiveSegment ? (
              <button
                type="button"
                onClick={() => {
                  setInspectedIndex(null);
                  if (onSelectSegment) onSelectSegment(null as any);
                }}
                className="text-[11px] flex items-center gap-1.5 text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900/80 px-3 py-1 rounded-full border border-cyan-500/40 transition-colors font-mono cursor-pointer"
              >
                <RefreshCw size={11} /> Volver al auto
              </button>
            ) : (
              <span className="text-[10px] font-bold text-brand-lime bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-ping" />
                EN ESTE TRAMO
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsCockpitDetailsExpanded(prev => !prev)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition cursor-pointer shrink-0"
              title={isCockpitDetailsExpanded ? "Ocultar telemetría detallada del tramo" : "Ver telemetría detallada del tramo"}
            >
              {isCockpitDetailsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* HIGH-VALUE EV TELEMETRY: COLLAPSIBLE ACCORDION FOR CLEAN DASHBOARD */}
        {!isCockpitDetailsExpanded ? (
          <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
            {/* Barra compacta de telemetría táctica esencial */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-inner">
              <div className="flex items-center gap-3.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <Gauge size={13} className="text-cyan-400" />
                  <span>Crucero: <strong className="text-white">{activeTip.speedRecommendation} km/h</strong></span>
                </div>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5 text-[#00E676]">
                  <BatteryCharging size={13} />
                  <span>Regen: <strong className="text-white">{regenLevelInfo.label}</strong></span>
                </div>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Battery size={13} className="text-emerald-400" />
                  <span>Salida tramo: <strong className="text-[#00E676]">{segmentEnergyDetail.exitSoc}% SoC</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCockpitDetailsExpanded(true)}
                className="text-[11px] font-bold text-brand-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver detalles</span>
                <ChevronDown size={12} />
              </button>
            </div>

            {/* Consejo de Copiloto (1 línea limpia) */}
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">💡</span>
                <p className="text-xs text-slate-200 truncate">
                  <strong className="text-cyan-300">Consejo Copiloto:</strong> {activeTip.advice}
                </p>
              </div>
              {routeSavings.bonusKm > 0 && (
                <span className="text-[10px] font-mono font-bold text-[#00E676] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded shrink-0">
                  +{routeSavings.bonusKm} km regenerados
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            {/* ROW 1: DINÁMICA DE CONDUCCIÓN (VELOCIDAD & REGENERACIÓN) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-inner">
              
              {/* Velocidad Sugerida */}
              <div className="flex items-center gap-3.5 min-w-[170px]">
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#1e293b"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#00e5ff"
                      strokeWidth="8"
                      strokeDasharray="251"
                      strokeDashoffset="62"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.6))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-white leading-none font-mono">
                      {activeTip.speedRecommendation}
                    </span>
                    <span className="text-[8px] font-bold text-slate-300 uppercase font-mono mt-0.5">
                      km/h
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Velocidad Sugerida</span>
                  <span className="text-sm font-bold text-white whitespace-nowrap">Crucero Ideal</span>
                  <span className="text-[11px] text-cyan-400 font-mono">Aerodinámica eficiente</span>
                </div>
              </div>

              {/* Separator on wider screens */}
              <div className="hidden sm:block w-[1px] h-10 bg-white/10 shrink-0" />

              {/* Regeneración Táctica */}
              <div className="flex items-center justify-between sm:justify-end gap-3.5 flex-1 sm:flex-initial">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BatteryCharging size={11} className="text-cyan-400" />
                    Regeneración Táctica
                  </span>
                  <span className="text-sm font-bold text-[#00E676] font-mono mt-0.5 whitespace-nowrap">
                    {regenLevelInfo.label} • {regenLevelInfo.mode}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {regenLevelInfo.desc}
                  </span>
                </div>

                {/* 4 Illuminated Green Level Bars */}
                <div className="flex items-end gap-1.5 h-8 pb-1 px-2.5 bg-slate-950/80 rounded-xl border border-white/5 shrink-0">
                  {[1, 2, 3, 4].map((bar) => {
                    const isActive = bar <= regenLevelInfo.litBars;
                    const hClass = bar === 1 ? 'h-2.5' : bar === 2 ? 'h-4' : bar === 3 ? 'h-5.5' : 'h-7';
                    return (
                      <div
                        key={bar}
                        className={`w-1.5 rounded-xs transition-all duration-300 ${hClass} ${
                          isActive ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-slate-800'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ROW 2: BATERÍA & SOC AL SALIR DEL TRAMO (MÉTRICA REINA EV) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-[#061e2a]/70 to-slate-900/95 border border-cyan-500/25 flex flex-col gap-2.5 shadow-lg">
              
              {/* Header with Battery Transition */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Battery size={15} className="text-emerald-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                    Batería & SoC al Salir del Tramo
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">Entrada: <strong className="text-white">{segmentEnergyDetail.entrySoc}%</strong></span>
                  <span className="text-cyan-400 font-bold">➔</span>
                  <span className="text-white">Salida: <strong className="text-base text-[#00E676]">{segmentEnergyDetail.exitSoc}%</strong></span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${segmentEnergyDetail.badgeColor}`}>
                    {segmentEnergyDetail.socDelta}
                  </span>
                </div>
              </div>

              {/* Detailed Consumption & Explanation */}
              <div className="flex flex-col gap-1 text-xs font-mono text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${segmentEnergyDetail.socDeltaColor}`}>
                      {segmentEnergyDetail.kwhMetric}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-200 font-semibold">
                      {segmentEnergyDetail.rateMetric}
                    </span>
                  </div>

                  {segmentEnergyDetail.type === 'cruising' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                      🟢 Eficiencia Óptima (Terreno Plano)
                    </span>
                  )}
                  {segmentEnergyDetail.type === 'consumption' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                      ⛰️ Exigencia por Pendiente
                    </span>
                  )}
                  {segmentEnergyDetail.type === 'regen' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                      ⚡ Regeneración Activa
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 italic">
                  {segmentEnergyDetail.explanation}
                </span>
              </div>

            </div>

            {/* BALANCE DE RUTA & GAMIFICACIÓN */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Award size={13} className="text-[#00E676]" />
                Balance de ruta en descensos acumulados:
              </span>
              <span className="text-[11px] font-bold text-[#00E676] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                +{routeSavings.bonusKm} km ganados ({routeSavings.recoveredKwh} kWh regenerados)
              </span>
            </div>

            {/* CONSEJO DEL COPILOTO (1 LÍNEA DIRECTA Y ACCIONABLE) */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <p className="text-xs sm:text-sm text-slate-200 leading-snug">
                <strong className="text-cyan-300 font-semibold">Consejo Copiloto:</strong> {activeTip.advice}
              </p>
            </div>

            {/* GEMINI AI STRATEGIC SUMMARY (if present) */}
            {advisorFeedback?.geminiSummary && (
              <div className="px-3.5 py-2 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-2 text-xs text-purple-200">
                <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-purple-300 font-mono">Estrategia Gemini:</strong> {advisorFeedback.geminiSummary}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

export const ElevationProfile = React.memo(ElevationProfileComponent);
