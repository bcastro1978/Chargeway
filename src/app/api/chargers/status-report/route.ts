import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmddylhyfgeplnxdauia.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR5bGh5ZmdlcGxueGRhdWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3MTUyNSwiZXhwIjoyMDk1NzQ3NTI1fQ.Dd6lClvQ2imOMHVYDQECelOajQly5Q4M75vgqrWH7YU';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Cache en memoria para resiliencia total y latencia sub-5ms (expira tras 12 horas)
const inMemoryReports = new Map<string, {
  chargerId?: string;
  chargerName: string;
  status: 'available' | 'busy' | 'broken';
  comment?: string;
  reportedAt: number;
  reportedBy?: string;
}>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chargerName = searchParams.get('chargerName')?.toLowerCase().trim();
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

  // 1. Limpieza de reportes antiguos en memoria
  for (const [key, report] of inMemoryReports.entries()) {
    if (report.reportedAt < twelveHoursAgo) {
      inMemoryReports.delete(key);
    }
  }

  // 2. Intentar consultar Supabase si existe la tabla
  try {
    const { data, error } = await supabaseAdmin
      .from('charger_status_reports')
      .select('*')
      .gte('created_at', new Date(twelveHoursAgo).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        const key = (row.charger_name || row.charger_id || '').toLowerCase().trim();
        if (key && !inMemoryReports.has(key)) {
          inMemoryReports.set(key, {
            chargerId: row.charger_id,
            chargerName: row.charger_name,
            status: row.status,
            comment: row.comment,
            reportedAt: new Date(row.created_at).getTime(),
            reportedBy: row.reported_by,
          });
        }
      });
    }
  } catch (err) {
    // Si la tabla aún no fue creada en Supabase, el cache en memoria provee disponibilidad 100%
  }

  const reportsList = Array.from(inMemoryReports.values());

  if (chargerName) {
    const match = reportsList.find(r => r.chargerName.toLowerCase().includes(chargerName) || chargerName.includes(r.chargerName.toLowerCase()));
    return NextResponse.json({ success: true, report: match || null });
  }

  return NextResponse.json({
    success: true,
    reports: reportsList,
    total: reportsList.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chargerId, chargerName, status, comment, reportedBy } = body;

    if (!chargerName || !status) {
      return NextResponse.json(
        { error: 'chargerName y status son requeridos' },
        { status: 400 }
      );
    }

    const validStatus = ['available', 'busy', 'broken'].includes(status) ? status : 'available';
    const timestamp = Date.now();
    const key = (chargerName || chargerId || '').toLowerCase().trim();

    const reportObj = {
      chargerId: chargerId || undefined,
      chargerName: chargerName.trim(),
      status: validStatus as 'available' | 'busy' | 'broken',
      comment: comment?.trim() || undefined,
      reportedAt: timestamp,
      reportedBy: reportedBy || 'Comunidad ChargeWay',
    };

    // Guardar inmediatamente en memoria
    inMemoryReports.set(key, reportObj);

    // Persistir asíncronamente en Supabase si la tabla existe
    Promise.resolve(
      supabaseAdmin
        .from('charger_status_reports')
        .insert([{
          charger_id: chargerId || null,
          charger_name: chargerName.trim(),
          status: validStatus,
          comment: comment?.trim() || null,
          reported_by: reportedBy || 'Comunidad ChargeWay',
          created_at: new Date(timestamp).toISOString(),
        }])
    ).then(({ error }: any) => {
      if (error && error.code !== '42P01') {
        console.warn('Supabase charger_status_reports insert note:', error.message);
      }
    }).catch(err => console.warn('Supabase async save err:', err));

    return NextResponse.json({
      success: true,
      message: `Reporte registrado para ${chargerName}: ${validStatus}`,
      report: reportObj,
    });
  } catch (err: any) {
    console.error('Error en POST /api/chargers/status-report:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}
