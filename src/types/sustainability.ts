/**
 * ChargeWay Sustainability & Regulatory Compliance Data Types
 * ARCONEL Resolution Nro. ARCONEL-029/25 & ARCERNNR-003/20 Standards for Ecuador
 * Volume Monetization with Prepaid Balance & Free Monthly Quota Model
 */

export type ChargerMode =
  | 'modo_2_3_semi_rapida_3_7'
  | 'modo_3_monofasico_7_0'
  | 'modo_3_domiciliario_10_0'
  | 'modo_3_comercial_14_0'
  | 'modo_3_trifasico_22_0'
  | 'modo_3_rapida_43_0'
  | 'modo_4_dc_ultra_50_0';

export interface ArconelPowerTier {
  id: ChargerMode;
  charging_mode_label: string;
  power_kw: number;
  arconel_limit_usd_kwh: number; // Lmax
  delivered_energy_1h_kwh: number; // Ec en 1 hora con eta_sys = 0.88
  max_legal_hourly_price_usd: number; // P * Lmax
}

export interface ArconelComplianceCheckInput {
  power_kw: number;
  hourly_parking_price_usd: number;
}

export interface ArconelComplianceCheckResult {
  is_valid: boolean;
  power_kw: number;
  hourly_parking_price_usd: number;
  arconel_limit_usd_kwh: number;
  equivalent_tariff_usd_kwh: number; // Tareq = Price / P
  max_allowed_hourly_price_usd: number; // P * Lmax
  is_exceeded: boolean;
  alert_message: string;
  violation_details?: string;
}

export interface ReservationMathSimulationInput {
  power_kw: number;
  reservation_hours: number;
  vehicle_battery_capacity_kwh: number; // Capbat (ej. 30 a 65 kWh)
  hourly_parking_price_usd: number;
  utility_buying_tariff_usd_kwh?: number; // Tarc (ej. 0.05, 0.08, 0.10 USD/kWh)
  reservation_number_in_month?: number; // Contador de la reserva en el mes (1, 2, ...)
}

export interface ReservationMathSimulationResult {
  power_kw: number;
  reservation_hours: number;
  system_efficiency_factor: number; // eta_sys = 0.88
  delivered_energy_kwh: number; // Ec = P * t * 0.88
  battery_soc_increase_pct: number; // DeltaSoC% = (Ec / Capbat) * 100
  compliance: ArconelComplianceCheckResult;
  host_profitability?: HostProfitabilityResult;
  commission_result?: ReservationCommissionResult;
}

export interface HostProfitabilityInput {
  delivered_energy_kwh: number; // Ec
  equivalent_tariff_usd_kwh: number; // Tarv (Tarv <= Lmax)
  utility_buying_tariff_usd_kwh: number; // Tarc (0.05, 0.08, 0.10 USD/kWh)
  system_efficiency_factor?: number; // default 0.88
}

export interface HostProfitabilityResult {
  gross_revenue_usd: number; // Ec * Tarv (Ingreso total cobrado por el parqueo)
  energy_cost_usd: number; // Ec * eta_sys * Tarc (Costo de adquisición de la energía)
  net_profit_usd: number; // Rs = Ec * (Tarv - eta_sys * Tarc)
  margin_pct: number;
  schedule_time_window: 'madrugada' | 'diurno' | 'punta' | 'custom';
}

/**
 * Resultado del cálculo de comisión de ChargeWay para una reserva por volumen
 */
export interface ReservationCommissionResult {
  reservation_number_in_month: number;
  is_free_quota: boolean; // True si está entre las primeras 5 del mes
  free_quota_limit: number; // 5 reservas
  commission_rate_pct: number; // 20% (0.20) a partir de la 6ta reserva
  base_profit_usd: number; // Ganancia de referencia del anfitrión
  commission_amount_usd: number; // 0.00 o 0.20 * base_profit_usd
  host_retained_profit_usd: number; // base_profit_usd - commission_amount_usd
}

/**
 * Operación sobre el saldo prepagado del Anfitrión (Wallet de Habilitación)
 */
export interface HostWalletState {
  host_id?: string;
  charging_point_id: string;
  prepaid_balance_usd: number;
  monthly_reservations_count: number;
  monthly_free_reservations_limit: number; // default: 5
  is_enabled_for_reservations: boolean;
  status_message: string;
}

export interface HostWalletDeductionResult {
  success: boolean;
  previous_balance_usd: number;
  deducted_commission_usd: number;
  new_balance_usd: number;
  is_free_quota: boolean;
  point_remains_enabled: boolean;
  alert_message: string;
}

export interface HostWalletRechargeInput {
  charging_point_id: string;
  recharge_amount_usd: number; // ej. 10.00, 25.00, 50.00 USD
  payment_method?: string; // 'transferencia', 'tarjeta', 'payphone'
}

export interface SaaSMonetizationConfig {
  volume_model: {
    name: string;
    description: string;
    free_reservations_per_month_per_point: number; // 5
    commission_rate_pct_above_threshold: number; // 20%
    prepaid_scheme_enabled: boolean;
    recommended_recharge_packages_usd: number[]; // [10, 25, 50, 100]
  };
  driver_booking_fee_usd: number; // Tarifa administrativa digital fija al conductor
  geolocated_ads_enabled: boolean;
}

export interface LegalTermsAndConditions {
  operational_liability_disclaimer: string;
  estimation_nature_disclaimer: string;
  regulatory_compliance_warranty: string;
  lospee_exemption_clause: string;
  arcernnr_003_20_delegated_responsibility: string;
  volume_monetization_clause: string;
}
