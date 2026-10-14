import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, contact_info, daily_km, brand_interest, model_interest } = body;

    if (!name || !contact_info) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          contact_info,
          daily_km,
          brand_interest,
          model_interest
        }
      ])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Error guardando en base de datos' }, { status: 500 });
    }

    // AQUI: Podríamos integrar envío de correo (ej. Resend/Sendgrid) para notificar al equipo de ventas

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('API Leads Error:', error);
    return NextResponse.json({ error: 'Error procesando solicitud' }, { status: 500 });
  }
}
