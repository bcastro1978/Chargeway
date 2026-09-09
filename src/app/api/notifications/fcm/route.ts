import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPushToEmail } from '@/lib/services/fcm';

/**
 * Registro de token FCM y prueba de envío
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, token, deviceType, title, message } = body;

    // Acción 1: Guardar o actualizar token del dispositivo
    if (action === 'register_token') {
      if (!token) {
        return NextResponse.json({ error: 'Token is required' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('user_fcm_tokens')
        .upsert(
          {
            email: email || null,
            token,
            device_type: deviceType || 'web',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        )
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    // Acción 2: Enviar notificación de prueba
    if (action === 'send_test') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for test' }, { status: 400 });
      }

      const result = await sendPushToEmail(email, {
        title: title || '⚡ Notificación ChargeWay',
        body: message || 'Prueba de alerta push en tiempo real.',
        clickAction: '/app',
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
