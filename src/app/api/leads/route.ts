import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with Service Role Key for backend operations
// Use env vars in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
