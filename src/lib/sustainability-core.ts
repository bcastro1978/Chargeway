/**
 * ChargeWay Sustainability & Legal Compliance Core Engine
 * Implements EV Parking Reservation Math Model, ARCONEL Price Caps,
 * Host Net Profitability Calculations, Volume Monetization (5 Free / 20% on 6th+)
 * & Prepaid Host Balance (Wallet) Logic.
 * 
 * Standards: ARCONEL-029/25, ARCERNNR-003/20, LOSPEE Ecuador.
 */

import {
  ArconelPowerTier,
  ArconelComplianceCheckInput,
  ArconelComplianceCheckResult,
  ReservationMathSimulationInput,
  ReservationMathSimulationResult,
  HostProfitabilityInput,
  HostProfitabilityResult,
  ReservationCommissionResult,
  HostWalletState,
  HostWalletDeductionResult,
  SaaSMonetizationConfig,
  LegalTermsAndConditions,
} from '@/types/sustainability';

/** System Efficiency Factor (Thermal dissipation, cabling, BMS) */
export const SYSTEM_EFFICIENCY_ETA = 0.88;

/** Default SaaS Administrative Booking Fee charged to drivers per reservation */
export const DRIVER_BOOKING_FEE_USD = 0.50;

/** Cuota mensual de reservas gratuitas por punto de parqueo/carga */
export const FREE_MONTHLY_RESERVATIONS_PER_POINT = 5;

/** Tasa de comisión de ChargeWay sobre la ganancia a partir de la 6ta reserva/hora mensual (20%) */
export const VOLUME_COMMISSION_RATE_PCT = 0.20;

/** Utility Tariff Tiers for Host Energy Acquisition in Ecuador (CNEL EP / EEQ) */
export const UTILITY_ACQUISITION_TARIFFS = {
  MADRUGADA: 0.05, // 0.05 USD/kWh (horario nocturno/madrugada)
  DIURNO: 0.08,    // 0.08 USD/kWh (horario diurno estándar)
  PUNTA: 0.10,     // 0.10 USD/kWh (horario de máxima demanda)
};

/**
 * Tabla Oficial de Parámetros y Límites Tarifarios ARCONEL (Resolución Nro. ARCONEL-029/25)
 */
export const ARCONEL_POWER_TIERS: ArconelPowerTier[] = [
  {
    id: 'modo_2_3_semi_rapida_3_7',
    charging_mode_label: 'Modo 2 / Modo 3 (Semi-rápida AC)',
    power_kw: 3.7,
    arconel_limit_usd_kwh: 0.1715,
    delivered_energy_1h_kwh: 3.26,
    max_legal_hourly_price_usd: 0.63,
  },
  {
    id: 'modo_3_monofasico_7_0',
    charging_mode_label: 'Modo 3 AC Monofásico',
    power_kw: 7.0,
    arconel_limit_usd_kwh: 0.1715,
    delivered_energy_1h_kwh: 6.16,
    max_legal_hourly_price_usd: 1.20,
  },
  {
    id: 'modo_3_domiciliario_10_0',
    charging_mode_label: 'Modo 3 AC (Límite Domiciliario)',
    power_kw: 10.0,
    arconel_limit_usd_kwh: 0.1715,
    delivered_energy_1h_kwh: 8.80,
    max_legal_hourly_price_usd: 1.71,
  },
  {
    id: 'modo_3_comercial_14_0',
    charging_mode_label: 'Modo 3 AC Comercial Pedestal',
    power_kw: 14.0,
    arconel_limit_usd_kwh: 0.1715,
    delivered_energy_1h_kwh: 12.32,
    max_legal_hourly_price_usd: 2.40,
  },
  {
    id: 'modo_3_trifasico_22_0',
    charging_mode_label: 'Modo 3 AC Semi-rápida Trifásica',
    power_kw: 22.0,
    arconel_limit_usd_kwh: 0.1715,
    delivered_energy_1h_kwh: 19.36,
    max_legal_hourly_price_usd: 3.77,
  },
  {
    id: 'modo_3_rapida_43_0',
    charging_mode_label: 'Modo 3 AC Rápida Trifásica',
    power_kw: 43.0,
    arconel_limit_usd_kwh: 0.1994,
    delivered_energy_1h_kwh: 37.84,
    max_legal_hourly_price_usd: 8.57,
  },
  {
    id: 'modo_4_dc_ultra_50_0',
    charging_mode_label: 'Modo 4 DC Ultra-rápida',
    power_kw: 50.0,
    arconel_limit_usd_kwh: 0.2851,
    delivered_energy_1h_kwh: 44.00,
    max_legal_hourly_price_usd: 14.25,
  },
];

/**
 * Encuentra el límite de ARCONEL (Lmax en USD/kWh) según la potencia ingresada
 */
export function getArconelLimitForPower(powerKw: number): number {
  if (powerKw <= 22.0) return 0.1715;
  if (powerKw <= 43.0) return 0.1994;
  return 0.2851; // DC >= 50kW
}

/**
 * 1.A Estimación de Energía Entregada al Vehículo (Ec)
 * Ec = P * t * eta_sys
 */
export function calculateDeliveredEnergyKwh(
  powerKw: number,
  reservationHours: number,
  efficiencyFactor: number = SYSTEM_EFFICIENCY_ETA
): number {
  if (powerKw <= 0 || reservationHours <= 0) return 0;
  return Number((powerKw * reservationHours * efficiencyFactor).toFixed(2));
}

/**
 * 1.B Estimación del Incremento del Porcentaje de Carga (DeltaSoC%)
 * DeltaSoC(%) = (Ec / Capbat) * 100
 */
export function calculateBatterySocIncreasePct(
  deliveredEnergyKwh: number,
  batteryCapacityKwh: number
): number {
  if (batteryCapacityKwh <= 0) return 0;
  const pct = (deliveredEnergyKwh / batteryCapacityKwh) * 100;
  return Number(pct.toFixed(2));
}

/**
 * 1.C Control de Cumplimiento Regulatorio y Tope Tarifario (ARCONEL)
 * Tareq = PrecioParqueoHora / P <= Lmax
 * Precio Maximo por Hora = P * Lmax
 */
export function validateHostPricing(
  input: ArconelComplianceCheckInput
): ArconelComplianceCheckResult {
  const { power_kw, hourly_parking_price_usd } = input;
  const arconel_limit_usd_kwh = getArconelLimitForPower(power_kw);
  const max_allowed_hourly_price_usd = Number((power_kw * arconel_limit_usd_kwh).toFixed(2));
  
  const equivalent_tariff_usd_kwh = power_kw > 0
    ? Number((hourly_parking_price_usd / power_kw).toFixed(4))
    : 0;

  // Tolerancia flotante de 0.001 USD para redondeos
  const is_exceeded = hourly_parking_price_usd > (max_allowed_hourly_price_usd + 0.001);
  const is_valid = !is_exceeded;

  let alert_message = '';
  let violation_details: string | undefined;

  if (is_valid) {
    alert_message = `Tarifa Aprobada. La tarifa equivalente ($${equivalent_tariff_usd_kwh.toFixed(4)}/kWh) cumple con el tope legal de ARCONEL ($${arconel_limit_usd_kwh.toFixed(4)}/kWh).`;
  } else {
    alert_message = `⚠️ TARIFA BLOQUEADA POR COMPLIANCE LEGAL: El precio de $${hourly_parking_price_usd.toFixed(2)} USD/h excede el tope legal de ARCONEL ($${max_allowed_hourly_price_usd.toFixed(2)} USD/h).`;
    violation_details = `La tarifa equivalente calculada es de $${equivalent_tariff_usd_kwh.toFixed(4)} USD/kWh, lo cual supera el límite legal máximo permitido por ARCONEL ($${arconel_limit_usd_kwh.toFixed(4)} USD/kWh) para cargadores de ${power_kw} kW. Ajuste la tarifa para evitar sanciones por especulación o enajenación no autorizada de energía.`;
  }

  return {
    is_valid,
    power_kw,
    hourly_parking_price_usd,
    arconel_limit_usd_kwh,
    equivalent_tariff_usd_kwh,
    max_allowed_hourly_price_usd,
    is_exceeded,
    alert_message,
    violation_details,
  };
}

/**
 * 1.D Rentabilidad Neta para el Anfitrión (Rs)
 * Rs = Ec * (Tarv - eta_sys * Tarc)
 */
export function calculateHostProfitability(
  input: HostProfitabilityInput
): HostProfitabilityResult {
  const {
    delivered_energy_kwh,
    equivalent_tariff_usd_kwh,
    utility_buying_tariff_usd_kwh,
    system_efficiency_factor = SYSTEM_EFFICIENCY_ETA,
  } = input;

  const gross_revenue_usd = Number((delivered_energy_kwh * equivalent_tariff_usd_kwh).toFixed(2));
  const energy_cost_usd = Number((delivered_energy_kwh * system_efficiency_factor * utility_buying_tariff_usd_kwh).toFixed(2));
  const net_profit_usd = Number((gross_revenue_usd - energy_cost_usd).toFixed(2));

  const margin_pct = gross_revenue_usd > 0
    ? Number(((net_profit_usd / gross_revenue_usd) * 100).toFixed(2))
    : 0;

  let schedule_time_window: 'madrugada' | 'diurno' | 'punta' | 'custom' = 'custom';
  if (utility_buying_tariff_usd_kwh === UTILITY_ACQUISITION_TARIFFS.MADRUGADA) schedule_time_window = 'madrugada';
  else if (utility_buying_tariff_usd_kwh === UTILITY_ACQUISITION_TARIFFS.DIURNO) schedule_time_window = 'diurno';
  else if (utility_buying_tariff_usd_kwh === UTILITY_ACQUISITION_TARIFFS.PUNTA) schedule_time_window = 'punta';

  return {
    gross_revenue_usd,
    energy_cost_usd,
    net_profit_usd,
    margin_pct,
    schedule_time_window,
  };
}

/**
 * 2.A Cálculo de Comisión ChargeWay por Volumen
 * - Reservas 1 a 5 en el mes: Comisión $0.00 (Cuota Gratuita)
 * - Reservas >= 6 en el mes: Comisión 20% sobre la ganancia
 */
export function calculateReservationCommission(
  reservationNumberInMonth: number,
  baseProfitUsd: number
): ReservationCommissionResult {
  const is_free_quota = reservationNumberInMonth <= FREE_MONTHLY_RESERVATIONS_PER_POINT;
  const commission_rate_pct = is_free_quota ? 0 : VOLUME_COMMISSION_RATE_PCT;
  const commission_amount_usd = is_free_quota
    ? 0
    : Number((baseProfitUsd * VOLUME_COMMISSION_RATE_PCT).toFixed(2));
  const host_retained_profit_usd = Number((baseProfitUsd - commission_amount_usd).toFixed(2));

  return {
    reservation_number_in_month: reservationNumberInMonth,
    is_free_quota,
    free_quota_limit: FREE_MONTHLY_RESERVATIONS_PER_POINT,
    commission_rate_pct: VOLUME_COMMISSION_RATE_PCT,
    base_profit_usd: baseProfitUsd,
    commission_amount_usd,
    host_retained_profit_usd,
  };
}

/**
 * 2.B Gestión de Saldo Prepagado del Anfitrión (Deducción por Comisión)
 */
export function processPrepaidDeduction(
  currentBalanceUsd: number,
  commissionAmountUsd: number,
  isFreeQuota: boolean
): HostWalletDeductionResult {
  if (isFreeQuota || commissionAmountUsd <= 0) {
    return {
      success: true,
      previous_balance_usd: currentBalanceUsd,
      deducted_commission_usd: 0,
      new_balance_usd: currentBalanceUsd,
      is_free_quota: true,
      point_remains_enabled: true,
      alert_message: `Reserva dentro de la cuota mensual gratuita (5 reservas/mes). No se debita comisión. Saldo actual: $${currentBalanceUsd.toFixed(2)} USD.`,
    };
  }

  if (currentBalanceUsd >= commissionAmountUsd) {
    const new_balance_usd = Number((currentBalanceUsd - commissionAmountUsd).toFixed(2));
    const point_remains_enabled = new_balance_usd > 0;
    return {
      success: true,
      previous_balance_usd: currentBalanceUsd,
      deducted_commission_usd: commissionAmountUsd,
      new_balance_usd,
      is_free_quota: false,
      point_remains_enabled,
      alert_message: `Comisión del 20% debitada ($${commissionAmountUsd.toFixed(2)} USD). Nuevo saldo disponible: $${new_balance_usd.toFixed(2)} USD.`,
    };
  } else {
    // Saldo insuficiente
    return {
      success: false,
      previous_balance_usd: currentBalanceUsd,
      deducted_commission_usd: 0,
      new_balance_usd: currentBalanceUsd,
      is_free_quota: false,
      point_remains_enabled: false,
      alert_message: `⚠️ Saldo prepagado insuficiente. Saldo disponible: $${currentBalanceUsd.toFixed(2)} USD, comisión requerida: $${commissionAmountUsd.toFixed(2)} USD. Recargue saldo para mantener habilitado el parqueadero.`,
    };
  }
}

/**
 * 2.C Verificación del Estado Operativo del Punto de Parqueo
 */
export function evaluatePointOperationalState(
  pointId: string,
  prepaidBalanceUsd: number,
  monthlyReservationsCount: number
): HostWalletState {
  const is_within_free_quota = monthlyReservationsCount < FREE_MONTHLY_RESERVATIONS_PER_POINT;
  const is_enabled_for_reservations = is_within_free_quota || prepaidBalanceUsd > 0;

  let status_message = '';
  if (is_within_free_quota) {
    const remaining_free = FREE_MONTHLY_RESERVATIONS_PER_POINT - monthlyReservationsCount;
    status_message = `Activo (Cuota Gratuita): Le quedan ${remaining_free} reserva(s) gratis este mes.`;
  } else if (prepaidBalanceUsd > 0) {
    status_message = `Activo (Prepago): Saldo disponible de $${prepaidBalanceUsd.toFixed(2)} USD. Comisión del 20% activa.`;
  } else {
    status_message = `⚠️ Inhabilitado: Cuota gratuita de 5 reservas agotada y saldo en $0.00 USD. Recargue para habilitar nuevas reservas.`;
  }

  return {
    charging_point_id: pointId,
    prepaid_balance_usd: prepaidBalanceUsd,
    monthly_reservations_count: monthlyReservationsCount,
    monthly_free_reservations_limit: FREE_MONTHLY_RESERVATIONS_PER_POINT,
    is_enabled_for_reservations,
    status_message,
  };
}

/**
 * Simulador Integrado Backend para Sesiones de Reserva por Horas (Con Comisión por Volumen)
 */
export function simulateReservationSession(
  input: ReservationMathSimulationInput
): ReservationMathSimulationResult {
  const {
    power_kw,
    reservation_hours,
    vehicle_battery_capacity_kwh,
    hourly_parking_price_usd,
    utility_buying_tariff_usd_kwh = UTILITY_ACQUISITION_TARIFFS.DIURNO,
    reservation_number_in_month = 1,
  } = input;

  const delivered_energy_kwh = calculateDeliveredEnergyKwh(power_kw, reservation_hours);
  const battery_soc_increase_pct = calculateBatterySocIncreasePct(delivered_energy_kwh, vehicle_battery_capacity_kwh);
  const compliance = validateHostPricing({ power_kw, hourly_parking_price_usd });

  let host_profitability: HostProfitabilityResult | undefined;
  let commission_result: ReservationCommissionResult | undefined;

  if (compliance.is_valid) {
    host_profitability = calculateHostProfitability({
      delivered_energy_kwh,
      equivalent_tariff_usd_kwh: compliance.equivalent_tariff_usd_kwh,
      utility_buying_tariff_usd_kwh,
    });

    commission_result = calculateReservationCommission(
      reservation_number_in_month,
      host_profitability.net_profit_usd
    );
  }

  return {
    power_kw,
    reservation_hours,
    system_efficiency_factor: SYSTEM_EFFICIENCY_ETA,
    delivered_energy_kwh,
    battery_soc_increase_pct,
    compliance,
    host_profitability,
    commission_result,
  };
}

/**
 * Configuración Estándar del Esquema de Monetización para ChargeWay SaaS
 */
export function getSaaSMonetizationModel(): SaaSMonetizationConfig {
  return {
    volume_model: {
      name: 'Monetización por Volumen y Saldo Prepagado',
      description: '5 reservas al mes gratuitas por punto de parqueo. A partir de la 6ª reserva, 20% de comisión sobre la ganancia deducida de saldo prepagado.',
      free_reservations_per_month_per_point: FREE_MONTHLY_RESERVATIONS_PER_POINT,
      commission_rate_pct_above_threshold: VOLUME_COMMISSION_RATE_PCT * 100, // 20%
      prepaid_scheme_enabled: true,
      recommended_recharge_packages_usd: [10, 25, 50, 100],
    },
    driver_booking_fee_usd: DRIVER_BOOKING_FEE_USD,
    geolocated_ads_enabled: true,
  };
}

/**
 * Generador de Cláusulas Indispensables para Términos y Condiciones (T&C)
 */
export function generateLegalTermsAndConditions(): LegalTermsAndConditions {
  return {
    operational_liability_disclaimer:
      'Descargo de Responsabilidad Operativa: ChargeWay actúa únicamente como una plataforma tecnológica de intermediación e información de disponibilidad. La plataforma no garantiza la disponibilidad física final del espacio si el anfitrión o un tercero bloquean el parqueo, ni responde por fallas mecánicas, interrupciones o fluctuaciones de la red eléctrica local.',
    estimation_nature_disclaimer:
      'Naturaleza Estimativa de los Cálculos: Los porcentajes de recuperación de batería (ΔSoC%) y la energía entregada (kWh) calculados por la SaaS son estimaciones matemáticas referenciales (considerando ηsys = 88%). Los valores reales quedan sujetos a variables externas como el estado de salud de la batería (SoC), la temperatura ambiente y el BMS del vehículo.',
    regulatory_compliance_warranty:
      'Garantía de Cumplimiento Regulatorio: El anfitrión declara y garantiza que las tarifas de parqueo configuradas no superan los topes máximos por kWh fijados en el Pliego Tarifario de ARCONEL. La SaaS emitirá alertas preventivas y bloqueará de forma automática cualquier valor que contravenga dicha regulación.',
    lospee_exemption_clause:
      'Delimitación del Objeto Contractual (Exención LOSPEE): La plataforma ChargeWay se define estrictamente como un sistema de información y reserva de parqueo. ChargeWay no factura consumo eléctrico ni comercializa/revende energía eléctrica, quedando liberada del requisito de título habilitante de comercialización bajo la Ley Orgánica del Servicio Público de Energía Eléctrica (LOSPEE).',
    arcernnr_003_20_delegated_responsibility:
      'Responsabilidad Delegada (Regulación ARCERNNR-003/20): El anfitrión es el único y exclusivo responsable de contar con la infraestructura física adecuada, medidor dedicado exclusivo y Contrato de Comercialización correspondiente con la empresa distribuidora local (CNEL EP, EEQ u otra).',
    volume_monetization_clause:
      'Esquema de Volumen y Saldo Prepagado: El anfitrión goza de 5 reservas mensuales gratuitas por cada punto de parqueo registrado. A partir de la sexta (6ª) reserva/hora del mes, ChargeWay percibirá una comisión del 20% sobre la ganancia generada por la reserva. Dicho valor se descontará automáticamente del saldo prepagado que el anfitrión mantenga activo en su billetera digital para la habilitación continua de sus parqueaderos.',
  };
}
