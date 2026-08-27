import { createClient } from '@supabase/supabase-js';
import type {
  PartnerChargingPoint,
  HostSchedule,
  ChargerReservation,
  ChargerReview,
  ReservationStatus,
} from '@/types/partner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmddylhyfgeplnxdauia.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_hzbCvSpczgaz6U-bx6PSNA_kqmlprsM';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR5bGh5ZmdlcGxueGRhdWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3MTUyNSwiZXhwIjoyMDk1NzQ3NTI1fQ.Dd6lClvQ2imOMHVYDQECelOajQly5Q4M75vgqrWH7YU';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Fallback in-memory / localStorage cache for seamless execution
const LOCAL_POINTS_KEY = 'chargeway_partner_points_v1';
const LOCAL_SCHEDULES_KEY = 'chargeway_host_schedules_v1';
const LOCAL_RESERVATIONS_KEY = 'chargeway_reservations_v1';
const LOCAL_REVIEWS_KEY = 'chargeway_reviews_v1';

function getLocalData<T>(key: string, defaultVal: T[]): T[] {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalData<T>(key: string, val: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
}

// Initial Seed (Vacio para iniciar unicamente con registros reales)
const SEED_PARTNER_POINTS: PartnerChargingPoint[] = [];
const SEED_SCHEDULES: HostSchedule[] = [];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 1. Fetch All Active Partner Charging Points */
export async function fetchPartnerChargingPoints(): Promise<PartnerChargingPoint[]> {
  try {
    const { data, error } = await supabase.from('partner_charging_points').select('*').eq('is_active', true);
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn('Supabase fetch failed, fallback to local partner points', e);
  }
  return getLocalData(LOCAL_POINTS_KEY, SEED_PARTNER_POINTS);
}

/** 2. Create New Partner Charging Point (Host Registration) */
export async function createPartnerChargingPoint(point: Omit<PartnerChargingPoint, 'id'>): Promise<PartnerChargingPoint> {
  const newId = generateUUID();
  const fullPoint: PartnerChargingPoint = {
    ...point,
    id: newId,
    rating_avg: 5.0,
    rating_count: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_point', point: fullPoint }),
    });

    const result = await res.json();
    if (result.success) {
      console.log('Successfully saved to partner_charging_points & charging_points via server API:', result.data);
    } else {
      console.error('Server API error creating partner point:', result.error);
    }
  } catch (e) {
    console.error('Server API fetch exception:', e);
  }

  // Local storage dual update for immediate UI reflection fallback
  const existing = getLocalData<PartnerChargingPoint>(LOCAL_POINTS_KEY, SEED_PARTNER_POINTS);
  const updated = [fullPoint, ...existing];
  setLocalData<PartnerChargingPoint>(LOCAL_POINTS_KEY, updated);

  const publicChargerPayload = {
    id: newId,
    name: fullPoint.name,
    province: fullPoint.province,
    city_or_canton: fullPoint.city,
    speed: fullPoint.power_kw >= 50 ? '🟢 RÁPIDA' : fullPoint.power_kw >= 11 ? '🟡 SEMI-RÁPIDA' : '🟠 NORMAL',
    charger_type: fullPoint.connector_type,
    power: `${fullPoint.power_kw} kW`,
    schedule: 'Reservable por ChargeWay App',
    cost_type: fullPoint.price_per_kwh ? `$${fullPoint.price_per_kwh}/kWh` : 'Gratuito para Clientes',
    lat: fullPoint.lat,
    lng: fullPoint.lng,
    photo_url: fullPoint.photo_urls?.[0] || '/images/bento/real_estaciones.png',
    is_active: true,
  };

  const LOCAL_PUBLIC_CHARGERS_KEY = 'chargeway_public_chargers_v1';
  const existingPublic = getLocalData<any>(LOCAL_PUBLIC_CHARGERS_KEY, []);
  setLocalData<any>(LOCAL_PUBLIC_CHARGERS_KEY, [publicChargerPayload, ...existingPublic]);

  return fullPoint;
}

/** 3. Save or Update Host Schedules (Matriz Semanal Lunes a Domingo) */
export async function saveHostSchedules(chargingPointId: string, schedules: HostSchedule[]): Promise<boolean> {
  const cleanedSchedules = schedules.map((s) => ({
    charging_point_id: chargingPointId,
    day_of_week: s.day_of_week,
    open_time: s.open_time,
    close_time: s.close_time,
    slot_duration_minutes: s.slot_duration_minutes,
    is_enabled: s.is_enabled,
  }));

  try {
    const res = await fetch('/api/partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_schedules', chargingPointId, schedules: cleanedSchedules }),
    });

    const result = await res.json();
    if (result.success) {
      console.log('Successfully saved host_schedules via server API');
      return true;
    } else {
      console.error('Server API error saving host_schedules:', result.error);
    }
  } catch (e) {
    console.error('Server API fetch exception:', e);
  }

  const existing = getLocalData(LOCAL_SCHEDULES_KEY, SEED_SCHEDULES);
  const filtered = existing.filter((s) => s.charging_point_id !== chargingPointId);
  const updated = [...filtered, ...cleanedSchedules];
  setLocalData(LOCAL_SCHEDULES_KEY, updated);
  return true;
}

/** 4. Fetch Host Schedules for a Specific Point */
export async function fetchHostSchedules(chargingPointId: string): Promise<HostSchedule[]> {
  try {
    const { data, error } = await supabase.from('host_schedules').select('*').eq('charging_point_id', chargingPointId);
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Supabase schedule fetch fallback to local storage', e);
  }
  const allSchedules = getLocalData(LOCAL_SCHEDULES_KEY, SEED_SCHEDULES);
  return allSchedules.filter((s) => s.charging_point_id === chargingPointId);
}

/** 5. Create a Reservation Request (Driver Request) */
export async function createReservation(res: Omit<ChargerReservation, 'id' | 'status' | 'created_at'>): Promise<ChargerReservation> {
  const localId = generateUUID();
  const fallbackReservation: ChargerReservation = {
    ...res,
    id: localId,
    status: 'pending',
    qr_token: `CW-QR-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    created_at: new Date().toISOString(),
  };

  try {
    const apiRes = await fetch('/api/partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_reservation', reservation: res }),
    });

    const result = await apiRes.json();
    if (result.success && result.data) {
      console.log('Successfully created reservation in Supabase via API:', result.data);
      const existing = getLocalData<ChargerReservation>(LOCAL_RESERVATIONS_KEY, []);
      setLocalData(LOCAL_RESERVATIONS_KEY, [result.data, ...existing]);
      return result.data;
    } else {
      console.error('API create_reservation returned error:', result.error);
    }
  } catch (e) {
    console.error('Server API fetch exception during reservation:', e);
  }

  const existing = getLocalData<ChargerReservation>(LOCAL_RESERVATIONS_KEY, []);
  const updated = [fallbackReservation, ...existing];
  setLocalData(LOCAL_RESERVATIONS_KEY, updated);
  return fallbackReservation;
}

/** 6. Fetch Reservations for Host or Driver */
export async function fetchReservations(filter?: { hostEmail?: string; driverEmail?: string }): Promise<ChargerReservation[]> {
  try {
    const apiRes = await fetch('/api/partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetch_reservations' }),
    });

    const result = await apiRes.json();
    if (result.success && result.data && result.data.length > 0) {
      let dataList: ChargerReservation[] = result.data;
      if (filter?.driverEmail) {
        dataList = dataList.filter((r) => r.driver_email === filter.driverEmail);
      }
      return dataList;
    }
  } catch (e) {
    console.warn('Supabase reservation fetch fallback to local storage', e);
  }

  const allRes = getLocalData<ChargerReservation>(LOCAL_RESERVATIONS_KEY, []);
  if (filter?.driverEmail) {
    return allRes.filter((r) => r.driver_email === filter.driverEmail);
  }
  return allRes;
}

/** 7. Approve or Reject Reservation (Host Manual Action) */
export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  rejectReason?: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('charger_reservations')
      .update({ status, reject_reason: rejectReason || null })
      .eq('id', reservationId);
    if (!error) return true;
  } catch (e) {
    console.warn('Supabase reservation update fallback to local storage', e);
  }

  const allRes = getLocalData<ChargerReservation>(LOCAL_RESERVATIONS_KEY, []);
  const updated = allRes.map((r) => (r.id === reservationId ? { ...r, status, reject_reason: rejectReason } : r));
  setLocalData<ChargerReservation>(LOCAL_RESERVATIONS_KEY, updated);
  return true;
}

/** 8. Validate QR Code Token In Situ (Host Camera Validation) */
export async function validateQrToken(qrToken: string): Promise<{ success: boolean; reservation?: ChargerReservation; message: string }> {
  const tokenClean = qrToken.trim().toUpperCase();

  try {
    const { data, error } = await supabase.from('charger_reservations').select('*').eq('qr_token', tokenClean).single();
    if (!error && data) {
      if (data.status !== 'confirmed' && data.status !== 'in_progress') {
        return { success: false, message: `La reserva no está confirmada (Estado actual: ${data.status.toUpperCase()}).` };
      }
      // Update validated_at timestamp
      await supabase.from('charger_reservations').update({ status: 'in_progress', validated_at: new Date().toISOString() }).eq('id', data.id);
      return { success: true, reservation: data as ChargerReservation, message: '¡Código QR Válido! Reserva confirmada para ingresar.' };
    }
  } catch (e) {
    console.warn('Supabase QR validate fallback to local storage', e);
  }

  const allRes = getLocalData<ChargerReservation>(LOCAL_RESERVATIONS_KEY, []);
  const match = allRes.find((r) => r.qr_token?.toUpperCase() === tokenClean);

  if (!match) {
    return { success: false, message: 'Código QR no encontrado en el sistema. Verifique el pase digital.' };
  }

  if (match.status !== 'confirmed' && match.status !== 'in_progress') {
    return { success: false, message: `La reserva no está en estado activo (Estado actual: ${match.status.toUpperCase()}).` };
  }

  match.status = 'in_progress';
  match.validated_at = new Date().toISOString();
  setLocalData<ChargerReservation>(LOCAL_RESERVATIONS_KEY, allRes);

  return {
    success: true,
    reservation: match,
    message: '¡Código QR Válido! Reserva verificada correctamente.',
  };
}

/** 9. Submit Review and Update Charger Average Rating (1-5 Stars, <= 200 Words) */
export async function submitChargerReview(review: Omit<ChargerReview, 'id' | 'created_at'>): Promise<boolean> {
  const newReview: ChargerReview = {
    ...review,
    id: `rev-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('charger_reviews').insert([newReview]);
  } catch (e) {
    console.warn('Supabase review insert fallback to local storage', e);
  }

  const allReviews = getLocalData<ChargerReview>(LOCAL_REVIEWS_KEY, []);
  const updatedReviews = [newReview, ...allReviews];
  setLocalData<ChargerReview>(LOCAL_REVIEWS_KEY, updatedReviews);

  // Recalculate Average Rating for Point
  const pointReviews = updatedReviews.filter((r) => r.charging_point_id === review.charging_point_id);
  const sum = pointReviews.reduce((acc, r) => acc + r.rating, 0);
  const newAvg = Number((sum / pointReviews.length).toFixed(1));

  const allPoints = getLocalData<PartnerChargingPoint>(LOCAL_POINTS_KEY, SEED_PARTNER_POINTS);
  const updatedPoints = allPoints.map((p) => (p.id === review.charging_point_id ? { ...p, rating_avg: newAvg, rating_count: pointReviews.length } : p));
  setLocalData<PartnerChargingPoint>(LOCAL_POINTS_KEY, updatedPoints);

  return true;
}
