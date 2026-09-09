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

  // Intentar consultar en cache de Supabase primero para ahorrar cuota
  const cachedElevations = new Map<string, number>();
  const toFetch: LocationCoord[] = [];

  try {
    const roundCoord = (val: number) => Number(val.toFixed(4));

    // Buscar en supabase
    const coordKeys = rawCoords.map(c => ({ lat: roundCoord(c.lat), lng: roundCoord(c.lng) }));
    const { data: cacheHits, error: cacheErr } = await supabaseAdmin
      .from('elevation_cache')
      .select('lat_round, lng_round, elevation')
      .in('lat_round', coordKeys.map(k => k.lat))
      .limit(100);

    if (!cacheErr && cacheHits && cacheHits.length > 0) {
      cacheHits.forEach(row => {
        cachedElevations.set(`${row.lat_round},${row.lng_round}`, Number(row.elevation));
      });
    }

    rawCoords.forEach(c => {
      const key = `${roundCoord(c.lat)},${roundCoord(c.lng)}`;
      if (!cachedElevations.has(key)) {
        toFetch.push(c);
      }
    });
  } catch (err) {
    console.warn('Cache lookup failed, querying direct provider:', err);
    toFetch.push(...rawCoords);
  }

  const fetchedResults: ElevationResult[] = [];
  const newPointsToCache: { lat_round: number; lng_round: number; elevation: number; source: string }[] = [];

  // Si hay puntos que no estaban en cache, consultar a Google Maps o OpenTopoData
  if (toFetch.length > 0) {
    const locationsString = toFetch.map(c => `${c.lat},${c.lng}`).join('|');

    if (isGoogleKeyConfigured) {
      // 1. Proveedor Principal: Google Maps Elevation API
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locationsString)}&key=${googleApiKey}`;
        const googleRes = await fetch(googleUrl);
        const googleData = await googleRes.json();

        if (googleData.status === 'OK' && Array.isArray(googleData.results)) {
          googleData.results.forEach((item: any, idx: number) => {
            const loc = toFetch[idx] || item.location;
            fetchedResults.push({
              elevation: item.elevation,
              location: { lat: loc.lat, lng: loc.lng },
              resolution: item.resolution || 10,
            });

            newPointsToCache.push({
              lat_round: Number(loc.lat.toFixed(4)),
              lng_round: Number(loc.lng.toFixed(4)),
              elevation: Number(item.elevation.toFixed(2)),
              source: 'google_maps',
            });
          });
        } else {
          console.warn('Google Elevation API returned non-OK status:', googleData.status, googleData.error_message);
          throw new Error(googleData.error_message || googleData.status);
        }
      } catch (gErr) {
        console.warn('Google Elevation failed, falling back to OpenTopoData:', gErr);
      }
    }

    // 2. Si falló Google o no hay key configurada, usar OpenTopoData como fallback
    if (fetchedResults.length === 0) {
      try {
        const fallbackUrl = `https://api.opentopodata.org/v1/mapzen?locations=${locationsString}`;
        const fallbackRes = await fetch(fallbackUrl);
        const fallbackData = await fallbackRes.json();

        if (fallbackData.status === 'OK' && Array.isArray(fallbackData.results)) {
          fallbackData.results.forEach((item: any, idx: number) => {
            const loc = toFetch[idx] || item.location;
            fetchedResults.push({
              elevation: item.elevation ?? 0,
              location: { lat: loc.lat, lng: loc.lng },
              resolution: 30,
            });

            newPointsToCache.push({
              lat_round: Number(loc.lat.toFixed(4)),
              lng_round: Number(loc.lng.toFixed(4)),
              elevation: Number((item.elevation ?? 0).toFixed(2)),
              source: 'opentopodata',
            });
          });
        }
      } catch (fErr) {
        console.error('All elevation providers failed:', fErr);
      }
    }

    // Guardar en cache en background (no bloqueante)
    if (newPointsToCache.length > 0) {
      Promise.resolve(
        supabaseAdmin
          .from('elevation_cache')
          .upsert(newPointsToCache, { onConflict: 'lat_round,lng_round' })
      )
        .then(({ error }: any) => {
          if (error) console.warn('Could not save to elevation_cache:', error.message);
        })
        .catch((err: any) => console.warn('Cache upsert error:', err));
    }
  }

  // Combinar resultados en el orden original
  const finalResults: ElevationResult[] = rawCoords.map(coord => {
    const key = `${Number(coord.lat.toFixed(4))},${Number(coord.lng.toFixed(4))}`;
    if (cachedElevations.has(key)) {
      return {
        elevation: cachedElevations.get(key)!,
        location: coord,
        resolution: 15,
      };
    }

    const fetched = fetchedResults.find(
      r => Math.abs(r.location.lat - coord.lat) < 0.001 && Math.abs(r.location.lng - coord.lng) < 0.001
    );

    return (
      fetched || {
        elevation: 0,
        location: coord,
        resolution: 0,
      }
    );
  });

  return NextResponse.json({
    status: 'OK',
    results: finalResults,
    provider: isGoogleKeyConfigured ? 'google_maps_cached' : 'opentopodata_fallback',
  });
}
