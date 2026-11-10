/**
 * ChargeWay Powertrain Engineering Core
 * Module: OCPI 2.2.1 Standard Taxonomy & Grid Interoperability Bridge
 * 
 * Implements strict Open Charge Point Interface (OCPI 2.2.1) data structures
 * for connector compatibility, real electrical limits and station availability.
 */

export type OcpiConnectorType =
  | 'IEC_62196_T2'        // Type 2 Mennekes (AC)
  | 'IEC_62196_T2_COMBO'  // CCS2 Combo (DC)
  | 'CHADEMO'             // CHAdeMO (DC)
  | 'GBT_DC'              // GB/T DC (Chinese EV standard common in Ecuador: BYD, Dongfeng)
  | 'GBT_AC'              // GB/T AC
  | 'TESLA_S'             // Tesla proprietary / NACS
  | 'DOMESTIC_F';         // 110V/220V Schuko/Type B emergency

export type OcpiEvseStatus =
  | 'AVAILABLE'
  | 'BLOCKED'
  | 'CHARGING'
  | 'INOPERATIVE'
  | 'OUTOFORDER'
  | 'PLANNED'
  | 'RESERVED'
  | 'UNKNOWN';

export type OcpiPowerType = 'AC_1_PHASE' | 'AC_3_PHASE' | 'DC';

export interface OcpiConnector {
  id: string;
  standard: OcpiConnectorType;
  format: 'SOCKET' | 'CABLE';
  powerType: OcpiPowerType;
  maxVoltageV: number;
  maxAmperageA: number;
  maxElectricPowerKw: number;
  tariffId?: string;
  termsAndConditionsUrl?: string;
}

export interface OcpiEvse {
  uid: string;
  evseId: string;
  status: OcpiEvseStatus;
  capabilities: Array<'RESERVABLE' | 'RFID_READER' | 'CREDIT_CARD_PAYABLE' | 'REMOTE_START_STOP_CAPABLE'>;
  connectors: OcpiConnector[];
  floorLevel?: string;
  lastUpdated: string;
}

export interface OcpiLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string; // "ECU"
  coordinates: {
    latitude: number;
    longitude: number;
  };
  evses: OcpiEvse[];
  operatorName: string;
  supportPhoneNumber?: string;
  // Local electrical infrastructure constraints
  gridSubstationDroopFactor?: number; // 0.70 to 1.0 (local grid voltage stability)
  isPublicAccess: boolean;
  timeZone: string; // "America/Guayaquil"
}

/**
 * Validates whether a vehicle's inlet accepts an EVSE connector.
 */
export function isConnectorElectricallyCompatible(
  vehicleInlets: OcpiConnectorType[],
  evseConnector: OcpiConnectorType
): boolean {
  if (vehicleInlets.includes(evseConnector)) return true;
  // CCS2 vehicles can accept Type 2 AC
  if (evseConnector === 'IEC_62196_T2' && vehicleInlets.includes('IEC_62196_T2_COMBO')) {
    return true;
  }
  return false;
}

/**
 * Calculates real available charging power taking into account grid droop and connector limits.
 */
export function getRealEvsePowerKw(evse: OcpiEvse, connectorId: string, locationGridFactor: number = 0.95): number {
  const connector = evse.connectors.find(c => c.id === connectorId) ?? evse.connectors[0];
  if (!connector) return 0;
  if (evse.status !== 'AVAILABLE') return 0;

  const nominalKw = connector.maxElectricPowerKw;
  return Number((nominalKw * Math.max(0.60, Math.min(1.0, locationGridFactor))).toFixed(1));
}

/**
 * Converts legacy ChargeWay station records into verified OCPI 2.2.1 structure.
 */
export function bridgeLegacyChargerToOcpi(legacy: any): OcpiLocation {
  const connectors: OcpiConnector[] = [];
  const connectorTypeRaw = String(legacy.connector_type || legacy.connectorType || '').toUpperCase();

  let standard: OcpiConnectorType = 'IEC_62196_T2_COMBO';
  let powerType: OcpiPowerType = 'DC';

  if (connectorTypeRaw.includes('GB/T') || connectorTypeRaw.includes('GBT')) {
    standard = 'GBT_DC';
  } else if (connectorTypeRaw.includes('CHADEMO')) {
    standard = 'CHADEMO';
  } else if (connectorTypeRaw.includes('TYPE 2') || connectorTypeRaw.includes('MENNEKES')) {
    standard = 'IEC_62196_T2';
    powerType = 'AC_3_PHASE';
  }

  const maxKw = Number(legacy.power_kw || legacy.powerKw || 50);

  connectors.push({
    id: `conn-1`,
    standard,
    format: 'CABLE',
    powerType,
    maxVoltageV: powerType === 'DC' ? 800 : 400,
    maxAmperageA: Math.round((maxKw * 1000) / (powerType === 'DC' ? 400 : 230)),
    maxElectricPowerKw: maxKw,
  });

  const evseStatus: OcpiEvseStatus = legacy.status === 'broken'
    ? 'OUTOFORDER'
    : legacy.status === 'busy'
    ? 'CHARGING'
    : 'AVAILABLE';

  return {
    id: String(legacy.id || legacy.name),
    name: legacy.name,
    address: legacy.address || legacy.location_name || '',
    city: legacy.city || 'Ecuador',
    country: 'ECU',
    coordinates: {
      latitude: legacy.location?.lat ?? legacy.lat ?? 0,
      longitude: legacy.location?.lng ?? legacy.lng ?? 0,
    },
    evses: [
      {
        uid: `evse-${legacy.id || legacy.name}`,
        evseId: `EC*CHW*E${legacy.id || '01'}`,
        status: evseStatus,
        capabilities: ['RESERVABLE'],
        connectors,
        lastUpdated: new Date().toISOString(),
      },
    ],
    operatorName: legacy.operator || legacy.network || 'Red Nacional',
    gridSubstationDroopFactor: maxKw >= 100 ? 0.92 : 0.97, // High-power stations draw heavy local loads
    isPublicAccess: true,
    timeZone: 'America/Guayaquil',
  };
}

