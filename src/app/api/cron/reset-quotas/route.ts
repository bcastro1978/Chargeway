import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Cloud Scheduler Target: Reseteo mensual de cuotas gratuitas (5 reservas gratis por mes)
 * Invocado el primer día de cada mes (00:00 UTC / Ecuador)
 * Protegido mediante CRON_SECRET o Header de Cloud Scheduler (X-CloudScheduler)
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cloudSchedulerHeader = request.headers.get('x-cloudscheduler');
  const cronSecret = process.env.CRON_SECRET || 'chargeway-cron-secret-2026';

  const isAuthorized =
    cloudSchedulerHeader === 'true' ||
    authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized cron execution' }, { status: 401 });
  }

  try {
    // 1. Resetear contador mensual de reservas a 0 para todos los puntos de anfitrión
    const { data: updatedPoints, error: updateErr } = await supabaseAdmin
      .from('partner_charging_points')
      .update({ monthly_reservations_count: 0 })
      .gte('monthly_reservations_count', 1)
      .select('id, name');

    if (updateErr) {
      console.error('Error resetting monthly quotas:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const count = updatedPoints ? updatedPoints.length : 0;

    return NextResponse.json({
      status: 'OK',
      message: `Cuotas mensuales de 5 reservas gratuitas restablecidas exitosamente.`,
      reset_count: count,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Unexpected error in reset-quotas cron:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Permitir verificación rápida con GET en entornos autorizados
export async function GET(request: Request) {
  return POST(request);
}
