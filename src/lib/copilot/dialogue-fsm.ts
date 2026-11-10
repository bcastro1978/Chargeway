/**
 * ChargeWay Cockpit Telematics Core (Capa 2)
 * Module: Dialogue State Tracker (DST) & Finite State Machine (FSM)
 * 
 * Manages deterministic dialogue state transitions without letting the LLM decide state flow.
 */

import { CockpitIntent, ExtractedDriverIntent } from './ontology';
import { ReadOnlyCopilotTelemetryView } from '../powertrain/telemetry-contract';

export type FsmCockpitState =
  | 'IDLE'
  | 'ROUTE_ACTIVE'
  | 'AWAITING_CHARGER_CONFIRMATION'
  | 'CHARGING_ACTIVE'
  | 'CRITICAL_ENERGY_DEFICIT';

export interface DialogueSessionContext {
  state: FsmCockpitState;
  vehicleModel?: string;
  vehicleBrand?: string;
  currentSocPct: number;
  activeTelemetry?: ReadOnlyCopilotTelemetryView;
  pendingStop?: {
    stationName: string;
    routeKm: number;
    recommendedMinutes: number;
  };
  lastIntent?: CockpitIntent;
  lastUpdatedTimestamp: number;
}

export interface FsmTransitionResult {
  nextState: FsmCockpitState;
  actionRequired: 'NONE' | 'EXECUTE_SOLVER' | 'ADD_WAYPOINT' | 'ABORT_ROUTE' | 'PROMPT_CONFIRMATION' | 'ALERT_DRIVER';
  updatedContext: DialogueSessionContext;
}

/**
 * Transitions the dialogue state machine based on incoming driver intent and current state.
 */
export function transitionDialogueState(
  current: DialogueSessionContext,
  driverIntent: ExtractedDriverIntent
): FsmTransitionResult {
  const now = Date.now();
  const intent = driverIntent.intent;

  switch (current.state) {
    case 'IDLE':
      if (intent === 'INTENT_PLAN_ROUTE' || intent === 'INTENT_QUERY_RANGE') {
        return {
          nextState: 'ROUTE_ACTIVE',
          actionRequired: 'EXECUTE_SOLVER',
          updatedContext: {
            ...current,
            state: 'ROUTE_ACTIVE',
            lastIntent: intent,
            lastUpdatedTimestamp: now,
          },
        };
      }
      return {
        nextState: 'IDLE',
        actionRequired: 'NONE',
        updatedContext: { ...current, lastIntent: intent, lastUpdatedTimestamp: now },
      };

    case 'ROUTE_ACTIVE':
      if (intent === 'INTENT_ABORT_NAVIGATION') {
        return {
          nextState: 'IDLE',
          actionRequired: 'ABORT_ROUTE',
          updatedContext: {
            ...current,
            state: 'IDLE',
            activeTelemetry: undefined,
            pendingStop: undefined,
            lastIntent: intent,
            lastUpdatedTimestamp: now,
          },
        };
      }
      if (intent === 'INTENT_ADD_RECHARGE_STOP') {
        return {
          nextState: 'ROUTE_ACTIVE',
          actionRequired: 'ADD_WAYPOINT',
          updatedContext: {
            ...current,
            lastIntent: intent,
            lastUpdatedTimestamp: now,
          },
        };
      }
      if (intent === 'INTENT_PLAN_ROUTE') {
        return {
          nextState: 'ROUTE_ACTIVE',
          actionRequired: 'EXECUTE_SOLVER',
          updatedContext: {
            ...current,
            lastIntent: intent,
            lastUpdatedTimestamp: now,
          },
        };
      }
      return {
        nextState: 'ROUTE_ACTIVE',
        actionRequired: 'NONE',
        updatedContext: { ...current, lastIntent: intent, lastUpdatedTimestamp: now },
      };

    case 'CRITICAL_ENERGY_DEFICIT':
      if (intent === 'INTENT_ADD_RECHARGE_STOP') {
        return {
          nextState: 'ROUTE_ACTIVE',
          actionRequired: 'ADD_WAYPOINT',
          updatedContext: {
            ...current,
            state: 'ROUTE_ACTIVE',
            lastIntent: intent,
            lastUpdatedTimestamp: now,
          },
        };
      }
      return {
        nextState: 'CRITICAL_ENERGY_DEFICIT',
        actionRequired: 'ALERT_DRIVER',
        updatedContext: { ...current, lastIntent: intent, lastUpdatedTimestamp: now },
      };

    case 'CHARGING_ACTIVE':
      if (intent === 'INTENT_PLAN_ROUTE' || intent === 'INTENT_QUERY_RANGE') {
        return {
          nextState: 'ROUTE_ACTIVE',
          actionRequired: 'EXECUTE_SOLVER',
          updatedContext: {
            ...current,
            state: 'ROUTE_ACTIVE',
            lastIntent: intent,
            lastUpdatedTimestamp: now,
          },
        };
      }
      return {
        nextState: 'CHARGING_ACTIVE',
        actionRequired: 'NONE',
        updatedContext: { ...current, lastIntent: intent, lastUpdatedTimestamp: now },
      };

    default:
      return {
        nextState: 'IDLE',
        actionRequired: 'NONE',
        updatedContext: { ...current, state: 'IDLE', lastUpdatedTimestamp: now },
      };
  }
}

