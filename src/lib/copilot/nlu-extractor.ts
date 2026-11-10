/**
 * ChargeWay Cockpit Telematics Core (Capa 2)
 * Module: NLU Intent Classifier & Slot Extractor
 * 
 * Extracts canonical intents and entities with zero ambiguity,
 * matching local Ecuadorian driving phrasing.
 */

import {
  CockpitIntent,
  ExtractedDriverIntent,
  resolveCanonicalPlace,
} from './ontology';

/**
 * Normalizes input text by removing accents, lowercasing and trimming punctuation.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!,.]/g, ' ')
    .trim();
}

/**
 * Fast deterministic intent classifier & slot extractor.
 * Operates in < 2ms without cloud dependencies.
 */
export function extractDriverIntentDeterministic(rawUtterance: string): ExtractedDriverIntent {
  const norm = normalizeText(rawUtterance);

  // 1. Check for cancel / abort navigation
  if (
    norm.includes('cancela') ||
    norm.includes('cancelar') ||
    norm.includes('detener') ||
    norm.includes('para la ruta') ||
    norm.includes('salir de la ruta') ||
    norm.includes('apagar navegacion')
  ) {
    return {
      intent: 'INTENT_ABORT_NAVIGATION',
      confidence: 0.98,
      slots: {},
    };
  }

  // 2. Check for vehicle telemetry / status check
  if (
    norm.includes('cuanta bateria') ||
    norm.includes('estado de la bateria') ||
    norm.includes('telemetria') ||
    norm.includes('autonomia restante') ||
    norm.includes('cuanto me queda')
  ) {
    return {
      intent: 'INTENT_QUERY_VEHICLE_TELEMETRY',
      confidence: 0.95,
      slots: {},
    };
  }

  // 3. Check for adding a charging stop
  if (
    norm.includes('agrega la parada') ||
    norm.includes('anade la parada') ||
    norm.includes('parar en') ||
    norm.includes('recargar en') ||
    norm.includes('pasar por la electrolinera')
  ) {
    const stationMatch = norm.replace(/(?:agrega|anade|parar en|recargar en|parada en)\s+/g, '').trim();
    return {
      intent: 'INTENT_ADD_RECHARGE_STOP',
      confidence: 0.90,
      slots: {
        addStop: {
          stationNameOrId: stationMatch,
        },
      },
    };
  }

  // 4. Check for charging network exploration
  if (
    norm.includes('electrolinera') ||
    norm.includes('donde hay cargador') ||
    norm.includes('cargadores en') ||
    norm.includes('puntos de carga')
  ) {
    let connector: 'CCS2' | 'GBT' | 'TYPE2' | 'CHADEMO' | undefined = undefined;
    if (norm.includes('gbt') || norm.includes('gb/t')) connector = 'GBT';
    else if (norm.includes('ccs') || norm.includes('ccs2')) connector = 'CCS2';
    else if (norm.includes('tipo 2') || norm.includes('type 2')) connector = 'TYPE2';

    return {
      intent: 'INTENT_QUERY_CHARGING_NETWORK',
      confidence: 0.92,
      slots: {
        chargingNetwork: {
          connectorType: connector,
          fastOnly: norm.includes('rapido') || norm.includes('dc'),
        },
      },
    };
  }

  // 5. Check for Range Query / Feasibility: "Llego a X con Y%?"
  const isRangeQuery =
    norm.includes('llego a') ||
    norm.includes('alcanzo a') ||
    norm.includes('puedo llegar') ||
    norm.includes('con una sola carga') ||
    norm.includes('sin recargar');

  // 6. Check for Route Planning
  const isPlanQuery =
    norm.includes('ir a') ||
    norm.includes('viajar a') ||
    norm.includes('traza la ruta') ||
    norm.includes('vamos a') ||
    norm.includes('ruta hacia') ||
    norm.includes('ruta a');

  // Extract destination place
  const words = norm.split(/\s+/);
  let detectedPlace: string | undefined = undefined;

  for (let i = 0; i < words.length; i++) {
    const candidate = words.slice(i).join(' ');
    const resolved = resolveCanonicalPlace(candidate);
    if (resolved) {
      detectedPlace = resolved.name;
      break;
    }
  }

  // Extract starting SoC if mentioned (e.g. "con el 80%", "saliendo al 90%")
  const socMatch = norm.match(/(?:con(?: el)?|al|bateria en)\s+(\d{1,3})\s*%/);
  const startingSoc = socMatch ? parseInt(socMatch[1], 10) : undefined;
  const isRoundTrip = norm.includes('ida y vuelta') || norm.includes('regres') || norm.includes('volver');

  if (isRangeQuery && detectedPlace) {
    return {
      intent: 'INTENT_QUERY_RANGE',
      confidence: 0.94,
      slots: {
        queryRange: {
          destination: detectedPlace,
          currentSoc: startingSoc,
        },
      },
    };
  }

  if ((isPlanQuery || detectedPlace) && detectedPlace) {
    return {
      intent: 'INTENT_PLAN_ROUTE',
      confidence: 0.92,
      slots: {
        planRoute: {
          destination: detectedPlace,
          isRoundTrip,
          startingSoc,
        },
      },
    };
  }

  return {
    intent: 'INTENT_GENERAL_QUERY',
    confidence: 0.60,
    slots: {
      rawTopic: rawUtterance,
    },
  };
}

