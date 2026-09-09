import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Servicio de Notificaciones Push (Firebase Cloud Messaging - FCM)
 * Permite despachar alertas instantáneas a conductores y anfitriones.
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  clickAction?: string;
}

/**
 * Enviar notificación push a un usuario por email
 */
export async function sendPushToEmail(
  email: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; count: number }> {
  try {
    const { data: tokens, error } = await supabaseAdmin
      .from('user_fcm_tokens')
      .select('token')
      .eq('email', email);

    if (error || !tokens || tokens.length === 0) {
      console.log(`[FCM] No tokens registered for email: ${email}`);
      return { success: false, count: 0 };
    }

    const tokenList = tokens.map(t => t.token);
    return await dispatchFcmMulticast(tokenList, payload);
  } catch (err) {
    console.error('[FCM] Error dispatching to email:', err);
    return { success: false, count: 0 };
  }
}

/**
 * Despacho a lista de tokens mediante la API de FCM
 */
export async function dispatchFcmMulticast(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; count: number }> {
  const serverKey = process.env.FCM_SERVER_KEY;

  if (!serverKey || serverKey === 'TU_FCM_SERVER_KEY') {
    console.log('[FCM] Simulación de envío push (sin FCM_SERVER_KEY configurada):', {
      recipientCount: tokens.length,
      title: payload.title,
      body: payload.body,
    });
    return { success: true, count: tokens.length };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icon.png',
          click_action: payload.clickAction || '/app',
        },
        data: payload.data || {},
      }),
    });

    const result = await response.json();
    return { success: response.ok, count: result.success || 0 };
  } catch (err) {
    console.error('[FCM] Network error sending multicast push:', err);
    return { success: false, count: 0 };
  }
}
