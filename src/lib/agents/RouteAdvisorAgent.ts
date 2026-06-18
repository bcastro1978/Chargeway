import { TripPlan } from '@/lib/route-orchestrator';

export interface SegmentTip {
  startKm: number;
  endKm: number;
  type: 'subida' | 'bajada' | 'plano' | 'ondulado';
  title: string;
  advice: string;
  speedRecommendation: number;
  regenLevel: 'Bajo' | 'Medio' | 'Alto' | 'Máximo';
}

export interface AdvisorFeedback {
  drivingStyleAdvice: string;
  speedLimitRecommendation: number; // km/h
  weatherWarning: string | null;
  overallStatus: 'Seguro' | 'Precaución' | 'Crítico';
  segmentTips: SegmentTip[];
}

/**
 * Agente Asesor Autónomo de ChargeWay
 * Analiza la topografía (elevación), distancia y clima (simulado)
 * para emitir recomendaciones de manejo enfocadas en alcanzar el destino.
 */
export async function RouteAdvisorAgent(
  plan: TripPlan, 
  weatherCondition: 'Despejado' | 'Lluvia' | 'Viento en contra' = 'Despejado'
): Promise<AdvisorFeedback> {
  let status: 'Seguro' | 'Precaución' | 'Crítico' = 'Seguro';
  let advice = "";
  let speedLimit = 100;
  let warning = null;

  // Analizar Topografía General
  let maxElevation = 0;
  let minElevation = Infinity;
  let totalAscent = 0;
  
  const totalPoints = plan.elevation ? plan.elevation.length : 0;
  if (totalPoints > 0) {
    for (let i = 1; i < totalPoints; i++) {
      const diff = plan.elevation[i].elevation - plan.elevation[i-1].elevation;
      if (diff > 0) totalAscent += diff;
      if (plan.elevation[i].elevation > maxElevation) maxElevation = plan.elevation[i].elevation;
      if (plan.elevation[i].elevation < minElevation) minElevation = plan.elevation[i].elevation;
    }
  }
  const elevRange = maxElevation - (minElevation === Infinity ? 0 : minElevation);

  // Categorize terrain based on total ascent and elevation range
  if (totalAscent > 600 || elevRange > 500) {
    status = 'Precaución';
    advice = `⛰️ Pendientes fuertes (+${Math.round(totalAscent)} m). Sube constante y regenera en bajadas.`;
    speedLimit = 80;
  } else if (totalAscent > 200 || elevRange > 150) {
    status = 'Seguro';
    advice = `🏔️ Terreno irregular (+${Math.round(totalAscent)} m). Evita acelerar brusco y usa regeneración.`;
    speedLimit = 90;
  } else if (totalAscent > 50) {
    advice = `Ruta con ondulaciones leves (+${Math.round(totalAscent)} m). Clima ideal.`;
  } else {
    advice = "Ruta plana y despejada. Conducción estándar.";
  }

  if (weatherCondition === 'Viento en contra') {
    warning = "Viento de frente. Autonomía reducida un 15%.";
    speedLimit = Math.min(speedLimit, 75);
    status = status === 'Seguro' ? 'Precaución' : 'Crítico';
  } else if (weatherCondition === 'Lluvia') {
    warning = "Lluvia detectada. Mayor fricción en asfalto.";
    speedLimit = Math.min(speedLimit, 80);
  }

  // Analizar SoC final y autonomía
  if (plan.arrivalSoc < 0.15) {
    status = 'Crítico';
    advice += " ¡Batería baja al llegar! Clima/calefacción OFF y máximo " + speedLimit + " km/h.";
  }

  // ----------------------------------------------------
  // GENERAR CONSEJOS DETALLADOS POR SEGMENTOS DE LA RUTA
  // ----------------------------------------------------
  const segmentTips: SegmentTip[] = [];
  const totalDistanceKm = (plan.route?.distance || 0) / 1000;

  if (totalPoints >= 2 && totalDistanceKm > 0.5) {
    // 1. Asignar distancia estimada a cada punto de elevación
    const pointsWithDist = plan.elevation.map((p, i) => {
      const dist = (i / (totalPoints - 1)) * totalDistanceKm;
      return {
        dist,
        elevation: p.elevation,
      };
    });

    // 2. Dividir en chunks de análisis
    const chunkSize = Math.max(2, Math.floor(totalPoints / 10)); // ~10 chunks
    const chunks: { startKm: number; endKm: number; elevDiff: number; type: 'subida' | 'bajada' | 'plano' }[] = [];

    for (let i = 0; i < pointsWithDist.length; i += chunkSize) {
      const chunkPoints = pointsWithDist.slice(i, i + chunkSize + 1);
      if (chunkPoints.length < 2) continue;

      const start = chunkPoints[0];
      const end = chunkPoints[chunkPoints.length - 1];
      const elevDiff = end.elevation - start.elevation;
      const distDiff = end.dist - start.dist;
      const slope = distDiff > 0 ? (elevDiff / (distDiff * 1000)) * 100 : 0;

      let type: 'subida' | 'bajada' | 'plano' = 'plano';
      if (slope > 1.0) type = 'subida';
      else if (slope < -1.0) type = 'bajada';

      chunks.push({
        startKm: start.dist,
        endKm: end.dist,
        elevDiff,
        type
      });
    }

    // 3. Unificar chunks contiguos del mismo tipo
    const mergedChunks: { startKm: number; endKm: number; type: 'subida' | 'bajada' | 'plano'; elevDiff: number }[] = [];
    for (const chunk of chunks) {
      if (mergedChunks.length === 0) {
        mergedChunks.push({ ...chunk });
      } else {
        const prev = mergedChunks[mergedChunks.length - 1];
        if (prev.type === chunk.type) {
          prev.endKm = chunk.endKm;
          prev.elevDiff += chunk.elevDiff;
        } else {
          mergedChunks.push({ ...chunk });
        }
      }
    }

    // 4. Mapear consejos expertos de conducción EV a cada tramo consolidado
    for (const chunk of mergedChunks) {
      const dist = chunk.endKm - chunk.startKm;
      if (dist < 0.2) continue; // Ignorar micro-segmentos

      let segAdvice = "";
      let title = "";
      let speed = speedLimit;
      let regen: 'Bajo' | 'Medio' | 'Alto' | 'Máximo' = 'Medio';

      if (chunk.type === 'subida') {
        const slopePct = (dist > 0) ? (chunk.elevDiff / (dist * 1000)) * 100 : 0;
        if (slopePct > 3.5) {
          title = "Subida Pronunciada";
          speed = Math.min(75, Math.round(speedLimit * 0.8));
          segAdvice = `Pendiente de +${Math.round(slopePct)}%. Mantén velocidad constante y evita acelerar fuerte.`;
          regen = 'Bajo';
        } else {
          title = "Subida Leve";
          speed = Math.min(85, Math.round(speedLimit * 0.9));
          segAdvice = `Usa control de crucero para estabilizar consumo.`;
          regen = 'Bajo';
        }
      } else if (chunk.type === 'bajada') {
        const slopePct = (dist > 0) ? (Math.abs(chunk.elevDiff) / (dist * 1000)) * 100 : 0;
        if (slopePct > 3.5) {
          title = "Descenso Fuerte";
          speed = Math.min(80, speedLimit);
          segAdvice = `Usa One-Pedal o freno regenerativo. Recuperarás hasta 12% de batería.`;
          regen = 'Máximo';
        } else {
          title = "Bajada Leve";
          speed = Math.min(90, speedLimit);
          segAdvice = `Aprovecha inercia del auto. Regeneración en nivel alto.`;
          regen = 'Alto';
        }
      } else {
        title = "Plano - Eficiente";
        speed = speedLimit;
        segAdvice = `Mantén ritmo constante y activa el modo ECO.`;
        regen = 'Medio';
      }

      segmentTips.push({
        startKm: Math.round(chunk.startKm * 10) / 10,
        endKm: Math.round(chunk.endKm * 10) / 10,
        type: chunk.type,
        title,
        advice: segAdvice,
        speedRecommendation: speed,
        regenLevel: regen
      });
    }
  }

  // Si no se pudieron generar segmentos, añade un fallback
  if (segmentTips.length === 0) {
    segmentTips.push({
      startKm: 0,
      endKm: Math.round(totalDistanceKm * 10) / 10,
      type: 'plano',
      title: "Conducción Estándar",
      advice: advice,
      speedRecommendation: speedLimit,
      regenLevel: 'Medio'
    });
  }

  return {
    drivingStyleAdvice: advice,
    speedLimitRecommendation: speedLimit,
    weatherWarning: warning,
    overallStatus: status,
    segmentTips
  };
}

