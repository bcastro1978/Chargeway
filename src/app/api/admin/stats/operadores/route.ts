import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ECUADOR_CHARGERS_FALLBACK } from '@/lib/data/ecuador-chargers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin === true;
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request.headers.get('Authorization'));
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ── Load chargers (Supabase or fallback) ─────────────────────────────────
  let chargers: any[] = [];
  try {
    const { data, error } = await supabase.from('charging_points').select('*');
    chargers = (!error && data && data.length > 0) ? data : ECUADOR_CHARGERS_FALLBACK;
  } catch {
    chargers = ECUADOR_CHARGERS_FALLBACK;
  }

  // ── Province aggregates ───────────────────────────────────────────────────
  const provinciaMap: Record<string, number> = {};
  for (const c of chargers) {
    const prov = c.provincia || c.province || 'Sin provincia';
    provinciaMap[prov] = (provinciaMap[prov] || 0) + 1;
  }
  const byProvincia = Object.entries(provinciaMap)
    .map(([provincia, total]) => ({ provincia, total }))
    .sort((a, b) => b.total - a.total);

  // ── Speed distribution ────────────────────────────────────────────────────
  let rapidos = 0, normales = 0;
  for (const c of chargers) {
    const speed = (c.velocidad || c.speed || '').toLowerCase();
    if (speed.includes('rápid') || speed.includes('rapido') || speed.includes('rapid') || speed.includes('verde')) {
      rapidos++;
    } else {
      normales++;
    }
  }

  // ── Cost distribution ─────────────────────────────────────────────────────
  const costMap: Record<string, number> = {};
  for (const c of chargers) {
    const cost = c.costo || c.cost_type || 'Desconocido';
    const key = cost.includes('Gratuito') || cost.includes('gratuito') ? 'Gratuito'
      : cost.includes('Consultar') || cost.includes('consultar') ? 'Consultar'
      : cost.includes('$') || cost.includes('USD') ? 'Pago'
      : 'Desconocido';
    costMap[key] = (costMap[key] || 0) + 1;
  }
  const byCost = Object.entries(costMap)
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total);

  // ── Charger type distribution ─────────────────────────────────────────────
  const typeMap: Record<string, number> = {};
  for (const c of chargers) {
    const tipo = c.tipo_cargador || c.charger_type || 'Desconocido';
    const key = tipo.length > 30 ? tipo.substring(0, 30) + '…' : tipo;
    typeMap[key] = (typeMap[key] || 0) + 1;
  }
  const byType = Object.entries(typeMap)
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // ── Power distribution ────────────────────────────────────────────────────
  const powerMap: Record<string, number> = {};
  for (const c of chargers) {
    const potencia = c.potencia || c.power || '?';
    powerMap[potencia] = (powerMap[potencia] || 0) + 1;
  }
  const byPower = Object.entries(powerMap)
    .map(([potencia, total]) => ({ potencia, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalChargers = chargers.length;
  const totalProvincias = byProvincia.length;

  // ── Charger list (for table) ──────────────────────────────────────────────
  const chargerList = chargers.slice(0, 50).map((c: any) => ({
    id: c.id,
    nombre: c.nombre || c.name || 'Sin nombre',
    provincia: c.provincia || c.province || '',
    canton: c.canton || c.city_or_canton || '',
    velocidad: c.velocidad || c.speed || '',
    potencia: c.potencia || c.power || '',
    costo: c.costo || c.cost_type || '',
    horario: c.horario || c.schedule || '',
  }));

  return NextResponse.json({
    kpis: { totalChargers, totalProvincias, rapidos, normales },
    byProvincia,
    bySpeed: [
      { tipo: 'Carga Rápida', total: rapidos },
      { tipo: 'Carga Normal', total: normales },
    ],
    byCost,
    byType,
    byPower,
    chargerList,
  });
}
