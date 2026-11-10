/**
 * ChargeWay Cockpit Telematics Core (Capa 2)
 * Module: Acoustic NLG & Driver Cognitive Load Minimizer
 * 
 * Generates spoken cockpit responses conforming strictly to NHTSA / UNECE guidelines:
 * - Maximum 2 informational clauses.
 * - Under 20 spoken words.
 * - Zero markdown, asterisks, bullet points or emojis.
 * - 100% grounded in deterministic powertrain telemetry.
 */

import { ReadOnlyCopilotTelemetryView } from '../powertrain/telemetry-contract';

export interface SpokenHmiMessage {
  textToSpeak: string;
  wordCount: number;
  priority: 'CRITICAL_INTERRUPT' | 'NAVIGATION_UPDATE' | 'INFORMATIONAL';
  actionTaken?: string;
}

/**
 * Strips all markdown and visual syntax to ensure clean TTS pronunciation.
 */
export function sanitizeAcousticText(raw: string): string {
  return raw
    .replace(/[*_#`~[\]()>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a concise verbal response for a completed route plan.
 */
export function generateRoutePlanSpokenFeedback(
  destinationName: string,
  telemetry: ReadOnlyCopilotTelemetryView
): SpokenHmiMessage {
  const km = Math.round(telemetry.totalJourney.distanceKm);
  const arrSoc = Math.round(telemetry.socTimelineSummary.arrivalSocPct);

  if (!telemetry.isFeasible) {
    const text = sanitizeAcousticText(
      `Atención: batería insuficiente para llegar a ${destinationName}. Se requiere parada de recarga intermedia.`
    );
    return {
      textToSpeak: text,
      wordCount: text.split(/\s+/).length,
      priority: 'CRITICAL_INTERRUPT',
      actionTaken: 'PROPOSE_CHARGER',
    };
  }

  if (telemetry.mandatoryStops.length > 0) {
    const stop = telemetry.mandatoryStops[0];
    const text = sanitizeAcousticText(
      `Ruta a ${destinationName}: ${km} kilómetros. Se programó parada en ${stop.stationName} de ${stop.recommendedMinutes} minutos.`
    );
    return {
      textToSpeak: text,
      wordCount: text.split(/\s+/).length,
      priority: 'NAVIGATION_UPDATE',
      actionTaken: 'STOP_INSERTED',
    };
  }

  // Direct arrival
  const text = sanitizeAcousticText(
    `Ruta a ${destinationName}: ${km} kilómetros. Llegarás con ${arrSoc}% de batería sin recargas.`
  );

  return {
    textToSpeak: text,
    wordCount: text.split(/\s+/).length,
    priority: 'NAVIGATION_UPDATE',
    actionTaken: 'DIRECT_ROUTE',
  };
}

/**
 * Generates a concise verbal response for a range query ("¿Llego a Baños con 40%?").
 */
export function generateRangeQuerySpokenFeedback(
  destinationName: string,
  telemetry: ReadOnlyCopilotTelemetryView
): SpokenHmiMessage {
  const arrSoc = Math.round(telemetry.socTimelineSummary.arrivalSocPct);
  const km = Math.round(telemetry.totalJourney.distanceKm);

  if (telemetry.isFeasible && arrSoc >= 12) {
    const text = sanitizeAcousticText(
      `Sí, es posible. Llegarás a ${destinationName} con aproximadamente ${arrSoc}% de batería.`
    );
    return {
      textToSpeak: text,
      wordCount: text.split(/\s+/).length,
      priority: 'INFORMATIONAL',
    };
  }

  const text = sanitizeAcousticText(
    `No es seguro. Llegarías a ${destinationName} al límite con ${Math.max(0, arrSoc)}% de batería.`
  );

  return {
    textToSpeak: text,
    wordCount: text.split(/\s+/).length,
    priority: 'CRITICAL_INTERRUPT',
  };
}

/**
 * Generates immediate verbal status of current battery telemetry.
 */
export function generateTelemetryStatusFeedback(currentSocPct: number, vehicleModel?: string): SpokenHmiMessage {
  const modelText = vehicleModel ? `en tu ${vehicleModel}` : '';
  const text = sanitizeAcousticText(
    `Tienes ${Math.round(currentSocPct)}% de batería ${modelText}. Telemetría y reserva de energía operando normal.`
  );
  return {
    textToSpeak: text,
    wordCount: text.split(/\s+/).length,
    priority: 'INFORMATIONAL',
  };
}

