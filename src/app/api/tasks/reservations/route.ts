import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { simulateReservationSession } from '@/lib/sustainability-core';

/**
 * Cloud Tasks Target: Ejecución asíncrona de liquidación y control de reservas
 * Invocado por Google Cloud Tasks tras un retraso programado (ej. 15 min de gracia o finalización)
 */
export async function POST(request: Request) {
  const taskHeader = request.headers.get('x-cloudtasks-taskname');
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'chargeway-cron-secret-2026';

  const isAuthorized =
    taskHeader !== null ||
    authHeader === `Bearer ${cronSecret}` ||
    process.env.NODE_ENV !== 'production';

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized task execution' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { reservation_id, action } = body;

  if (!reservation_id) {
    return NextResponse.json({ error: 'reservation_id is required' }, { status: 400 });
  }

  try {
    // 1. Obtener la reserva actual
    const { data: reservation, error: resErr } = await supabaseAdmin
      .from('charger_reservations')
      .select('*, partner_charging_points(*)')
      .eq('id', reservation_id)
      .single();

    if (resErr || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const point = reservation.partner_charging_points;

    // Acción: Expirar reserva si el conductor nunca llegó
    if (action === 'check_expiration') {
      if (reservation.status === 'pending' || reservation.status === 'confirmed') {
        const { error: cancelErr } = await supabaseAdmin
          .from('charger_reservations')
          .update({ status: 'expired' })
          .eq('id', reservation_id);

        if (cancelErr) throw cancelErr;

        return NextResponse.json({
          status: 'OK',
          action: 'expired',
          message: 'Reserva expirada por inasistencia y plaza liberada.',
        });
      }
      return NextResponse.json({ status: 'OK', message: 'Reserva ya atendida previamente.' });
    }

    // Acción: Liquidar comisión por volumen (20% a partir de la 6ta reserva)
    if (action === 'settle_commission' || !action) {
      // Si ya fue cobrada comisión, no duplicar
      if (reservation.commission_charged_usd && Number(reservation.commission_charged_usd) > 0) {
        return NextResponse.json({ status: 'OK', message: 'Comisión ya liquidada con anterioridad.' });
      }

      const monthlyCount = (point?.monthly_reservations_count || 0) + 1;
      const isFreeQuota = monthlyCount <= 5;
      const hours = reservation.hours_booked || 1;
      const powerKw = point?.power_kw || 7.0;
      const pricePerHour = point?.price_per_hour_usd || 1.20;

      // Calcular con el motor matemático certificado ARCONEL
      const sessionCalc = simulateReservationSession({
        power_kw: powerKw,
        reservation_hours: hours,
        vehicle_battery_capacity_kwh: 50.0,
        hourly_parking_price_usd: pricePerHour,
        reservation_number_in_month: monthlyCount,
      });

      const commission = sessionCalc.commission_result?.commission_amount_usd || 0;
      const currentBalance = Number(point?.prepaid_balance_usd || 0);
      const newBalance = Math.max(0, currentBalance - commission);

      // Actualizar reserva con el estatus de cuota
      await supabaseAdmin
        .from('charger_reservations')
        .update({
          commission_charged_usd: commission,
          is_free_quota: isFreeQuota,
          status: 'completed',
        })
        .eq('id', reservation_id);

      // Incrementar contador mensual y debitar saldo si aplica
      await supabaseAdmin
        .from('partner_charging_points')
        .update({
          monthly_reservations_count: monthlyCount,
          prepaid_balance_usd: newBalance,
        })
        .eq('id', point.id);

      // Registrar transacción en billetera si hubo cobro de comisión
      if (commission > 0) {
        await supabaseAdmin.from('host_wallet_transactions').insert({
          charging_point_id: point.id,
          host_id: point.host_id,
          transaction_type: 'commission_deduction',
          amount_usd: commission,
          balance_before_usd: currentBalance,
          balance_after_usd: newBalance,
          reservation_id: reservation.id,
          description: `Comisión del 20% por reserva #${monthlyCount} del mes (${hours}h)`,
        });
      }

      return NextResponse.json({
        status: 'OK',
        action: 'settled',
        monthly_count: monthlyCount,
        is_free_quota: isFreeQuota,
        commission_charged_usd: commission,
        new_balance_usd: newBalance,
      });
    }

    return NextResponse.json({ status: 'OK', message: 'No recognized action' });
  } catch (err: any) {
    console.error('Error processing reservation task:', err);
    return NextResponse.json({ error: err.message || 'Task processing error' }, { status: 500 });
  }
}
