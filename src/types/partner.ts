export type PartnerCategory =
  | 'hotel'
  | 'restaurante'
  | 'gasolinera'
  | 'municipio'
  | 'turistico'
  | 'particular_residencial'
  | 'particular_negocio';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface PartnerChargingPoint {
  id: string;
  host_id?: string;
  host_name: string;
  host_email: string;
  host_phone?: string;
  name: string;
  category: PartnerCategory;
  address: string;
  province: string;
  city: string;
  lat: number;
  lng: number;
  connector_type: string;
  power_kw: number;
  price_per_kwh?: number;
  price_per_hour?: number;
  photo_urls?: string[];
  is_active?: boolean;
  rating_avg?: number;
  rating_count?: number;
  prepaid_balance_usd?: number; // Saldo prepagado para habilitación de parqueadero
  monthly_reservations_count?: number; // Reservas acumuladas en el mes calendario
  created_at?: string;
}

export interface HostSchedule {
  id?: string;
  charging_point_id: string;
  day_of_week: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  open_time: string; // '08:00'
  close_time: string; // '20:00'
  slot_duration_minutes?: number;
  is_enabled: boolean;
}

export interface ChargerReservation {
  id: string;
  charging_point_id: string;
  driver_id?: string;
  driver_name: string;
  driver_email: string;
  driver_phone?: string;
  reservation_date: string; // 'YYYY-MM-DD'
  start_time: string; // '14:00'
  end_time: string; // '15:00'
  vehicle_model: string;
  status: ReservationStatus;
  reject_reason?: string;
  qr_token?: string;
  validated_at?: string;
  alert_15m_sent?: boolean;
  alert_5m_sent?: boolean;
  alert_end_sent?: boolean;
  commission_charged_usd?: number; // Comisión ChargeWay (20% a partir de la 6ta reserva)
  is_free_quota?: boolean; // True si fue una de las 5 gratuitas del mes
  created_at?: string;
  // Relaciones
  partner_point?: PartnerChargingPoint;
}

export interface ChargerReview {
  id?: string;
  reservation_id: string;
  charging_point_id: string;
  driver_id?: string;
  driver_name: string;
  rating: number; // 1 - 5
  comment: string; // máx 200 palabras
  created_at?: string;
}
