import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface LocationCoord {
  lat: number;
  lng: number;
}

interface ElevationResult {
  elevation: number;
  location: LocationCoord;
  resolution?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationsParam = searchParams.get('locations');

  if (!locationsParam) {
    return NextResponse.json({ error: 'Missing locations parameter' }, { status: 400 });
  }

  // Parse locations "lat,lng|lat,lng"
  const rawCoords: LocationCoord[] = locationsParam
    .split('|')
    .map(pair => {
      const [latStr, lngStr] = pair.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
    })
    .filter((c): c is LocationCoord => c !== null);

  if (rawCoords.length === 0) {
    return NextResponse.json({ error: 'Invalid coordinates provided' }, { status: 400 });
  }

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const isGoogleKeyConfigured = Boolean(
    googleApiKey &&
    googleApiKey !== 'TU_LLAVE_DE_GOOGLE_MAPS_AQUI' &&
    googleApiKey.trim().length > 10
  );

  const { lookupElevationPoints } = await import('@/lib/services/elevation-lookup');
  const finalResults = await lookupElevationPoints(rawCoords);

  return NextResponse.json({
    status: 'OK',
    results: finalResults,
    provider: isGoogleKeyConfigured ? 'google_maps_cached' : 'opentopodata_fallback',
  });
}
