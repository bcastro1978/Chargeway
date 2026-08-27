import { NextResponse } from 'next/server';
import { fetchOCMChargers, mergeChargers } from '@/lib/services/ocm';
import { fetchAllEcuadorChargers } from '@/lib/services/charging';

/**
 * GET /api/ocm-chargers
 *
 * Returns a merged dataset of:
 *   1. Local chargers (Supabase DB / JSON fallback) — editorial quality
 *   2. Open Charge Map chargers for Ecuador — community-verified, richer data
 *
 * Deduplication: OCM chargers within 100m of a local record enrich it.
 * New OCM records (no local match) are appended.
 *
 * Response cached by Next.js for 1 hour (revalidate = 3600).
 */
export const revalidate = 3600; // ISR: revalidate every hour

export async function GET() {
  const apiKey = process.env.OPEN_CHARGE_MAP_KEY;
  if (!apiKey) {
    // No OCM key — return local data only
    const local = await fetchAllEcuadorChargers();
    return NextResponse.json({ chargers: local, source: 'local-only', total: local.length });
  }

  try {
    // Fetch both sources in parallel
    const [local, ocm] = await Promise.all([
      fetchAllEcuadorChargers(),
      fetchOCMChargers(apiKey),
    ]);

    const merged = mergeChargers(local, ocm);

    return NextResponse.json({
      chargers: merged,
      source: 'hybrid',
      total: merged.length,
      breakdown: {
        local: local.length,
        ocm: ocm.length,
        merged: merged.length,
      },
    });
  } catch (err) {
    console.error('[ocm-chargers] OCM fetch failed, falling back to local:', err);
    const local = await fetchAllEcuadorChargers();
    return NextResponse.json({
      chargers: local,
      source: 'local-fallback',
      total: local.length,
      error: String(err),
    });
  }
}
