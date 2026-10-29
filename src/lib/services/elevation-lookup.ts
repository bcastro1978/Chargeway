import { supabaseAdmin } from '@/lib/supabase-admin';
import { ElevationPoint } from './elevation';

export interface LocationCoord {
  lat: number;
  lng: number;
}

export async function lookupElevationPoints(rawCoords: LocationCoord[]): Promise<ElevationPoint[]> {
  if (!rawCoords || rawCoords.length === 0) return [];

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const isGoogleKeyConfigured = Boolean(
    googleApiKey &&
    googleApiKey !== 'TU_LLAVE_DE_GOOGLE_MAPS_AQUI' &&
    googleApiKey.trim().length > 10
  );

  const cachedElevations = new Map<string, number>();
  const toFetch: LocationCoord[] = [];
  const roundCoord = (val: number) => Number(val.toFixed(4));

  try {
    const coordKeys = rawCoords.map(c => ({ lat: roundCoord(c.lat), lng: roundCoord(c.lng) }));
    const { data: cacheHits, error: cacheErr } = await supabaseAdmin
      .from('elevation_cache')
      .select('lat_round, lng_round, elevation')
      .in('lat_round', coordKeys.map(k => k.lat))
      .limit(100);

    if (!cacheErr && cacheHits && cacheHits.length > 0) {
      cacheHits.forEach((row: any) => {
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
    console.warn('Cache lookup failed in lookupElevationPoints:', err);
    toFetch.push(...rawCoords);
  }

  const fetchedResults: Array<{ elevation: number; location: LocationCoord; resolution: number }> = [];
  const newPointsToCache: { lat_round: number; lng_round: number; elevation: number; source: string }[] = [];

  if (toFetch.length > 0) {
    const locationsString = toFetch.map(c => `${c.lat},${c.lng}`).join('|');

    if (isGoogleKeyConfigured) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locationsString)}&key=${googleApiKey}`;
        const googleRes = await fetch(googleUrl, { signal: AbortSignal.timeout(4000) });
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
        }
      } catch (gErr) {
        console.warn('Google Elevation failed in lookupElevationPoints:', gErr);
      }
    }

    if (fetchedResults.length === 0) {
      try {
        const fallbackUrl = `https://api.opentopodata.org/v1/mapzen?locations=${locationsString}`;
        const fallbackRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(5000) });
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
        console.warn('OpenTopoData fallback failed:', fErr);
      }
    }

    if (newPointsToCache.length > 0) {
      Promise.resolve(
        supabaseAdmin
          .from('elevation_cache')
          .upsert(newPointsToCache, { onConflict: 'lat_round,lng_round' })
      ).catch(() => {});
    }
  }

  return rawCoords.map(coord => {
    const key = `${roundCoord(coord.lat)},${roundCoord(coord.lng)}`;
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
}
