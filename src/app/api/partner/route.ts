import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmddylhyfgeplnxdauia.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR5bGh5ZmdlcGxueGRhdWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3MTUyNSwiZXhwIjoyMDk1NzQ3NTI1fQ.Dd6lClvQ2imOMHVYDQECelOajQly5Q4M75vgqrWH7YU';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function sendRealEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resendKey = process.env.RESEND_API_KEY || '';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json();
    console.log(`✉️ RESEND DISPATCH RESPONSE (${res.status}) TO ${to}:`, data);

    // If Resend test domain restricts sending to non-owner emails, deliver to chargewayec@gmail.com or owner address
    if (res.status === 403 && to !== 'chargewayec@gmail.com') {
      console.log(`✉️ Re-enviando notificación de prueba a chargewayec@gmail.com...`);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: ['chargewayec@gmail.com'],
          subject: `[CHARGEWAY EC] ${subject}`,
          html: `<p style="color:#34d399; font-weight:bold; font-family:sans-serif;">📌 [Destino Original: ${to}]</p>${html}`,
        }),
      });
    }

    return data;
  } catch (e) {
    console.error(`❌ RESEND DISPATCH EXCEPTION TO ${to}:`, e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, point, schedules, reservation } = body;

    if (action === 'create_point') {
      // 1. Insert into partner_charging_points
      const { data: partnerData, error: partnerErr } = await supabaseAdmin
        .from('partner_charging_points')
        .insert([point])
        .select()
        .single();

      if (partnerErr) {
        console.error('API Error partner_charging_points:', partnerErr);
        return NextResponse.json({ success: false, error: partnerErr.message }, { status: 400 });
      }

      // 2. Dual insert into public charging_points table
      const publicChargerPayload = {
        id: point.id,
        name: point.name,
        province: point.province,
        city_or_canton: point.city,
        speed: point.power_kw >= 50 ? '🟢 RÁPIDA' : point.power_kw >= 11 ? '🟡 SEMI-RÁPIDA' : '🟠 NORMAL',
        charger_type: point.connector_type,
        power: `${point.power_kw} kW`,
        schedule: 'Reservable por ChargeWay App',
        cost_type: point.price_per_kwh ? `$${point.price_per_kwh}/kWh` : 'Gratuito para Clientes',
        lat: point.lat,
        lng: point.lng,
        photo_url: point.photo_urls?.[0] || '/images/bento/real_estaciones.png',
        is_active: true,
      };

      const { error: publicErr } = await supabaseAdmin
        .from('charging_points')
        .insert([publicChargerPayload]);

      if (publicErr) {
        console.error('API Error charging_points:', publicErr);
      }

      return NextResponse.json({ success: true, data: partnerData });
    }

    if (action === 'save_schedules') {
      const { chargingPointId } = body;
      await supabaseAdmin.from('host_schedules').delete().eq('charging_point_id', chargingPointId);
      const { error: schedErr } = await supabaseAdmin.from('host_schedules').insert(schedules);

      if (schedErr) {
        console.error('API Error host_schedules:', schedErr);
        return NextResponse.json({ success: false, error: schedErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'create_reservation') {
      const reservationId = crypto.randomUUID();
      const qrToken = `CW-QR-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      const reservationPayload = {
        id: reservationId,
        charging_point_id: reservation.charging_point_id,
        driver_name: reservation.driver_name,
        driver_email: reservation.driver_email,
        driver_phone: reservation.driver_phone || null,
        vehicle_model: reservation.vehicle_model,
        reservation_date: reservation.reservation_date,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        status: 'pending',
        qr_token: qrToken,
        created_at: new Date().toISOString(),
      };

      const { data: resData, error: resErr } = await supabaseAdmin
        .from('charger_reservations')
        .insert([reservationPayload])
        .select()
        .single();

      if (resErr) {
        console.error('API Error create_reservation:', resErr);
        return NextResponse.json({ success: false, error: resErr.message }, { status: 400 });
      }

      const hostEmail = body.hostEmail || 'anfitrion@chargeway.ec';
      const driverEmail = reservation.driver_email;

      // Send HTML Email to Host
      sendRealEmail({
        to: hostEmail,
        subject: `[CHARGEWAY EC] ⚡ Nueva Solicitud de Reserva de Carga (${reservation.reservation_date})`,
        html: `
          <div style="font-family: sans-serif; background: #0B1713; color: white; padding: 24px; border-radius: 16px; border: 1px solid #10b981;">
            <h2 style="color: #34d399; margin-top: 0;">⚡ Nueva Solicitud de Reserva en ChargeWay</h2>
            <p>Hola Anfitrión, has recibido una nueva solicitud de reserva para tu punto de carga:</p>
            <div style="background: #050E0A; padding: 16px; border-radius: 12px; border: 1px solid #1A3028; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Conductor:</strong> ${reservation.driver_name} (${reservation.driver_email})</p>
              <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${reservation.driver_phone || 'No especificado'}</p>
              <p style="margin: 4px 0;"><strong>Vehículo:</strong> ${reservation.vehicle_model}</p>
              <p style="margin: 4px 0;"><strong>Fecha:</strong> ${reservation.reservation_date}</p>
              <p style="margin: 4px 0;"><strong>Horario:</strong> ${reservation.start_time} a ${reservation.end_time}</p>
            </div>
            <p>Ingresa a tu <strong>Panel de Anfitrión en ChargeWay App</strong> para Aceptar o Rechazar esta solicitud.</p>
          </div>
        `,
      });

      // Send HTML Email to Driver
      sendRealEmail({
        to: driverEmail,
        subject: `[CHARGEWAY EC] ⚡ Solicitud de Reserva Recibida`,
        html: `
          <div style="font-family: sans-serif; background: #0B1713; color: white; padding: 24px; border-radius: 16px; border: 1px solid #10b981;">
            <h2 style="color: #34d399; margin-top: 0;">⚡ Solicitud de Reserva Enviada</h2>
            <p>Hola ${reservation.driver_name}, tu solicitud de reserva ha sido enviada con éxito al anfitrión.</p>
            <div style="background: #050E0A; padding: 16px; border-radius: 12px; border: 1px solid #1A3028; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Fecha:</strong> ${reservation.reservation_date}</p>
              <p style="margin: 4px 0;"><strong>Horario:</strong> ${reservation.start_time} a ${reservation.end_time}</p>
              <p style="margin: 4px 0;"><strong>Estado:</strong> Pendiente de aprobación del anfitrión</p>
            </div>
            <p>Te notificaremos por este medio en cuanto el anfitrión apruebe tu solicitud y te adjunte tu <strong>Pase Digital QR</strong>.</p>
          </div>
        `,
      });

      return NextResponse.json({ success: true, data: resData });
    }

    if (action === 'fetch_reservations') {
      const { data, error } = await supabaseAdmin
        .from('charger_reservations')
        .select('*, partner_charging_points(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('API Error fetch_reservations:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, data });
    }

    if (action === 'send_reservation_notification') {
      const { hostEmail, driverEmail, driverName, pointName, reservationDate, slot } = body;

      sendRealEmail({
        to: hostEmail,
        subject: `[CHARGEWAY EC] ⚡ Alerta: Solicitud de Carga (${reservationDate})`,
        html: `<p>Solicitud de <strong>${driverName}</strong> (${driverEmail}) para <strong>${pointName}</strong> el ${reservationDate} (${slot}).</p>`,
      });

      return NextResponse.json({ success: true, message: 'Notificaciones enviadas.' });
    }

    if (action === 'update_reservation_status') {
      const { reservationId, status, rejectReason } = body;

      const qrToken = status === 'confirmed' ? `CW-QR-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}` : null;

      const { data, error } = await supabaseAdmin
        .from('charger_reservations')
        .update({
          status,
          reject_reason: rejectReason || null,
          ...(qrToken ? { qr_token: qrToken } : {})
        })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) {
        console.error('API Error update_reservation_status:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      if (status === 'confirmed') {
        const activeQrToken = data.qr_token || qrToken || 'CW-QR-DEFAULT';
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeQrToken)}`;

        sendRealEmail({
          to: data.driver_email,
          subject: `[CHARGEWAY EC] ✅ ¡Reserva APROBADA! Tu Pase Digital QR`,
          html: `
            <div style="font-family: sans-serif; background: #0B1713; color: white; padding: 24px; border-radius: 16px; border: 1px solid #10b981;">
              <h2 style="color: #34d399; margin-top: 0;">✅ Tu Reserva ha sido APROBADA</h2>
              <p>Hola <strong>${data.driver_name}</strong>, el anfitrión ha confirmado tu reserva de carga para el <strong>${data.reservation_date}</strong> (${data.start_time} - ${data.end_time}).</p>
              
              <div style="background: #050E0A; padding: 20px; border-radius: 16px; border: 1px solid #10b981; text-align: center; margin: 16px 0;">
                <p style="color: #34d399; font-size: 13px; font-weight: bold; margin-top: 0; margin-bottom: 12px; uppercase; letter-spacing: 1px;">PASE DIGITAL QR DE ACCESO EN VIVO</p>
                <div style="background: white; padding: 12px; border-radius: 16px; display: inline-block; margin: 4px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                  <img src="${qrImageUrl}" alt="Código QR de Reserva" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 8px;" />
                </div>
                <p style="color: #34d399; font-size: 16px; font-weight: bold; font-family: monospace; letter-spacing: 1.5px; margin-top: 12px; margin-bottom: 4px;">${activeQrToken}</p>
                <p style="color: #a3a3a3; font-size: 11px; margin: 0;">Muestra este código QR desde tu teléfono o impreso al llegar al punto de carga.</p>
              </div>

              <div style="background: #091D17; padding: 14px; border-radius: 12px; border: 1px solid #1A3028; font-size: 12px; margin-top: 12px;">
                <p style="margin: 3px 0;"><strong>Vehículo:</strong> ${data.vehicle_model}</p>
                <p style="margin: 3px 0;"><strong>Fecha:</strong> ${data.reservation_date}</p>
                <p style="margin: 3px 0;"><strong>Horario Reservado:</strong> ${data.start_time} a ${data.end_time}</p>
              </div>
            </div>
          `,
        });
      } else if (status === 'rejected') {
        sendRealEmail({
          to: data.driver_email,
          subject: `[CHARGEWAY EC] ❌ Reserva Rechazada`,
          html: `
            <div style="font-family: sans-serif; background: #0B1713; color: white; padding: 24px; border-radius: 16px; border: 1px solid #f43f5e;">
              <h2 style="color: #f43f5e;">Reserva No Disponible</h2>
              <p>Hola ${data.driver_name}, el anfitrión no pudo aceptar tu solicitud para el ${data.reservation_date}.</p>
              <p><strong>Motivo:</strong> ${rejectReason || 'No disponible'}</p>
            </div>
          `,
        });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('API Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Error' }, { status: 500 });
  }
}
