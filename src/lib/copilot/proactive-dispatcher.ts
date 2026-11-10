/**
 * ChargeWay Cockpit Telematics Core (Capa 2)
 * Module: Proactive Event Dispatcher
 * 
 * Monitors the continuous telemetry stream and proactively issues voice alerts
 * when physical road or energy invariants are compromised.
 */

import { SpokenHmiMessage, sanitizeAcousticText } from './acoustic-nlg';

export type TelemetryEventType =
  | 'EVENT_ENERGY_BUFFER_BREACH'
  | 'EVENT_CHARGER_OPTIMAL_CUTOFF'
  | 'EVENT_STEEP_DESCENT_REGEN_DERATING'
  | 'EVENT_STATION_OFFLINE_REROUTE';

export interface TelemetryAlertEvent {
  type: TelemetryEventType;
  currentSocPct: number;
  projectedArrivalSocPct?: number;
  details?: string;
}

/**
 * Dispatches an immediate, concise proactive voice alert if vehicle safety limits are triggered.
 */
export function evaluateProactiveEvent(event: TelemetryAlertEvent): SpokenHmiMessage | null {
  switch (event.type) {
    case 'EVENT_ENERGY_BUFFER_BREACH': {
      const projSoc = Math.round(event.projectedArrivalSocPct ?? 5);
      const text = sanitizeAcousticText(
        `Alerta de energía: consumo elevado por pendiente. Reserva proyectada en ${projSoc}%. Se sugiere parada preventiva.`
      );
      return {
        textToSpeak: text,
        wordCount: text.split(/\s+/).length,
        priority: 'CRITICAL_INTERRUPT',
        actionTaken: 'ALERT_LOW_ENERGY',
      };
    }

    case 'EVENT_CHARGER_OPTIMAL_CUTOFF': {
      const soc = Math.round(event.currentSocPct);
      const text = sanitizeAcousticText(
        `Batería al ${soc}%. Potencia reducida por curva de carga. Recomendado desconectar y reanudar viaje.`
      );
      return {
        textToSpeak: text,
        wordCount: text.split(/\s+/).length,
        priority: 'INFORMATIONAL',
        actionTaken: 'NOTIFY_DISCONNECT_READY',
      };
    }

    case 'EVENT_STEEP_DESCENT_REGEN_DERATING': {
      const text = sanitizeAcousticText(
        `Descenso pronunciado adelante. Batería alta: frenado regenerativo limitado para proteger las celdas.`
      );
      return {
        textToSpeak: text,
        wordCount: text.split(/\s+/).length,
        priority: 'CRITICAL_INTERRUPT',
        actionTaken: 'ALERT_BRAKE_DERATING',
      };
    }

    case 'EVENT_STATION_OFFLINE_REROUTE': {
      const station = event.details ?? 'siguiente';
      const text = sanitizeAcousticText(
        `Estación ${station} reportada fuera de servicio. Recalculando ruta hacia cargador alterno.`
      );
      return {
        textToSpeak: text,
        wordCount: text.split(/\s+/).length,
        priority: 'CRITICAL_INTERRUPT',
        actionTaken: 'REROUTE_OFFLINE_CHARGER',
      };
    }

    default:
      return null;
  }
}

