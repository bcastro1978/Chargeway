/**
 * Mapbox Service for ChargeWay
 * Handles route directions and coordinate processing.
 */

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const DIRECTIONS_API = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export interface RouteElevationPoint {
  lat: number;
  lng: number;
  elevation: number; // metres above sea level
}

export interface RouteResponse {
  distance: number;
  duration: number;
  geometry: string; // Serialized GeoJSON LineString (JSON string)
  elevationPoints: RouteElevationPoint[];
  waypoints: any[];
  legs?: Array<{ distance: number; duration: number }>;
}

export async function fetchRoute(
  coordinates: { lng: number; lat: number }[]
): Promise<RouteResponse | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('MAPBOX_ACCESS_TOKEN is missing');
    return null;
  }

  if (coordinates.length < 2) {
    console.error('At least origin and destination are required');
    return null;
  }

  const query = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
  const url = `${DIRECTIONS_API}/${query}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      console.warn(`Mapbox route: ${data.message || data.code}`);
      return null;
    }

    const route = data.routes[0];
    // GeoJSON coords: [lng, lat, elevation_m]
    const rawCoords: number[][] = route.geometry.coordinates;

    // Sample up to 200 points to keep elevation array manageable
    const MAX_SAMPLES = 200;
    const step = Math.max(1, Math.floor(rawCoords.length / MAX_SAMPLES));
    const sampled: number[][] = [];
    for (let i = 0; i < rawCoords.length; i += step) sampled.push(rawCoords[i]);
    if (sampled[sampled.length - 1] !== rawCoords[rawCoords.length - 1]) {
      sampled.push(rawCoords[rawCoords.length - 1]);
    }

    const elevationPoints: RouteElevationPoint[] = sampled.map(c => ({
      lng: c[0],
      lat: c[1],
      elevation: c[2] ?? 0
    }));

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: JSON.stringify(route.geometry), // serialized GeoJSON LineString
      elevationPoints,
      waypoints: data.waypoints,
      legs: (route.legs || []).map((l: any) => ({ distance: l.distance, duration: l.duration }))
    };
  } catch (error) {
    console.error('Failed to fetch Mapbox route:', error);
    return null;
  }
}

export interface SearchSuggestion {
  id: string;
  name: string;
  place_name: string;
  center?: [number, number]; // [lng, lat]
  placeId?: string;
  provider?: 'mapbox' | 'google' | 'photon';
}

// Quito center used as proximity fallback when user location is unavailable
const QUITO_CENTER: [number, number] = [-78.5249, -0.1807];

/**
 * Resolves an intersection between two streets in Ecuador.
 * Geocodes candidates for both streets and finds the closest intersecting pair.
 */
async function resolveIntersection(
  street1: string,
  street2: string,
  proximity: [number, number]
): Promise<SearchSuggestion | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null;

  const geocodeStreet = async (name: string) => {
    const clean = name.replace(/^(calle|av\.|avenida|pasaje|diagonal|transversal)\s+/i, '').replace(/,.*$/, '').trim();
    const queries = [
      `${clean}, Quito`,
      `Avenida ${clean}, Quito`,
      `${name}, Quito`
    ];
    const results: any[] = [];
    for (const q of queries) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=ec&limit=4&proximity=${proximity[0]},${proximity[1]}`;
      try {
        const res = await fetch(url).then(r => r.json());
        if (res.features) results.push(...res.features);
      } catch {}
    }
    return results;
  };

  try {
    const [f1, f2] = await Promise.all([geocodeStreet(street1), geocodeStreet(street2)]);
    if (f1.length === 0 || f2.length === 0) return null;

    let minD = Infinity;
    let bestA: any = null;
    let bestB: any = null;

    for (const a of f1) {
      for (const b of f2) {
        const d = Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]);
        if (d < minD) {
          minD = d;
          bestA = a;
          bestB = b;
        }
      }
    }

    // Two intersecting streets in the same urban area are typically within ~3.5 km of each other's centroid
    if (bestA && bestB && minD < 0.035) {
      const midLng = (bestA.center[0] + bestB.center[0]) / 2;
      const midLat = (bestA.center[1] + bestB.center[1]) / 2;
      const s1 = street1.trim();
      const s2 = street2.trim();
      const city = bestA.context?.find((c: any) => c.id.startsWith('place'))?.text || 'Quito';

      return {
        id: `intersection-${Date.now()}`,
        name: `${s1} y ${s2}, ${city}`,
        place_name: `Intersección ${s1} y ${s2}, ${city}, Ecuador`,
        center: [midLng, midLat]
      };
    }
  } catch (err) {
    console.warn('Error resolving intersection:', err);
  }
  return null;
}

const suggestionsCache = new Map<string, { timestamp: number; data: SearchSuggestion[] }>();

/**
 * Resolve exact coordinates from a Google Places placeId.
 */
export async function resolveGooglePlaceCoords(
  placeId: string,
  sessionToken?: string
): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    let url = `/api/places/autocomplete?placeId=${encodeURIComponent(placeId)}`;
    if (sessionToken) url += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.lat !== undefined && data.lng !== undefined) {
        return { lat: data.lat, lng: data.lng, name: data.name };
      }
    }
  } catch (err) {
    console.warn('Resolve Google Place coords error:', err);
  }
  return null;
}

// Curated instant-match dictionary for popular Ecuadorian cities, landmarks & destinations
const INSTANT_ECUADOR_PLACES: { keywords: string[]; suggestion: SearchSuggestion }[] = [
  {
    keywords: ['termas papallacta', 'papallacta', 'termas de papallacta', 'aguas termales papallacta'],
    suggestion: { id: 'instant-papallacta', name: 'Termas de Papallacta, Napo, Ecuador', place_name: 'Termas de Papallacta, Napo, Ecuador', center: [-78.1466, -0.3606] }
  },
  {
    keywords: ['quito', 'quito ecuador', 'centro historico quito'],
    suggestion: { id: 'instant-quito', name: 'Quito, Pichincha, Ecuador', place_name: 'Quito, Pichincha, Ecuador', center: [-78.4678, -0.1807] }
  },
  {
    keywords: ['guayaquil', 'malecon 2000'],
    suggestion: { id: 'instant-guayaquil', name: 'Guayaquil, Guayas, Ecuador', place_name: 'Guayaquil, Guayas, Ecuador', center: [-79.8862, -2.1894] }
  },
  {
    keywords: ['cuenca', 'parque calderon'],
    suggestion: { id: 'instant-cuenca', name: 'Cuenca, Azuay, Ecuador', place_name: 'Cuenca, Azuay, Ecuador', center: [-79.0045, -2.9001] }
  },
  {
    keywords: ['baños', 'banos', 'baños de agua santa'],
    suggestion: { id: 'instant-banos', name: 'Baños de Agua Santa, Tungurahua, Ecuador', place_name: 'Baños de Agua Santa, Tungurahua, Ecuador', center: [-78.4228, -1.3964] }
  },
  {
    keywords: ['cotopaxi', 'volcan cotopaxi', 'parque nacional cotopaxi'],
    suggestion: { id: 'instant-cotopaxi', name: 'Parque Nacional Cotopaxi, Ecuador', place_name: 'Parque Nacional Cotopaxi, Ecuador', center: [-78.4372, -0.6806] }
  },
  {
    keywords: ['otavalo', 'plaza de los ponchos'],
    suggestion: { id: 'instant-otavalo', name: 'Otavalo, Imbabura, Ecuador', place_name: 'Otavalo, Imbabura, Ecuador', center: [-78.2618, 0.2305] }
  },
  {
    keywords: ['ibarra', 'laguna mall', 'yahuarcocha'],
    suggestion: { id: 'instant-ibarra', name: 'Ibarra, Imbabura, Ecuador', place_name: 'Ibarra, Imbabura, Ecuador', center: [-78.1224, 0.3517] }
  },
  {
    keywords: ['latacunga', 'malteria plaza'],
    suggestion: { id: 'instant-latacunga', name: 'Latacunga, Cotopaxi, Ecuador', place_name: 'Latacunga, Cotopaxi, Ecuador', center: [-78.6155, -0.9346] }
  },
  {
    keywords: ['ambato', 'mall de los andes'],
    suggestion: { id: 'instant-ambato', name: 'Ambato, Tungurahua, Ecuador', place_name: 'Ambato, Tungurahua, Ecuador', center: [-78.6268, -1.2491] }
  },
  {
    keywords: ['riobamba', 'paseo shopping riobamba'],
    suggestion: { id: 'instant-riobamba', name: 'Riobamba, Chimborazo, Ecuador', place_name: 'Riobamba, Chimborazo, Ecuador', center: [-78.6547, -1.6710] }
  },
  {
    keywords: ['santo domingo', 'santo domingo de los tsachilas'],
    suggestion: { id: 'instant-santodomingo', name: 'Santo Domingo de los Tsáchilas, Ecuador', place_name: 'Santo Domingo de los Tsáchilas, Ecuador', center: [-79.1754, -0.2530] }
  },
  {
    keywords: ['tena', 'misahualli'],
    suggestion: { id: 'instant-tena', name: 'Tena, Napo, Ecuador', place_name: 'Tena, Napo, Ecuador', center: [-77.8129, -0.9938] }
  },
  {
    keywords: ['puyo'],
    suggestion: { id: 'instant-puyo', name: 'Puyo, Pastaza, Ecuador', place_name: 'Puyo, Pastaza, Ecuador', center: [-78.0024, -1.4878] }
  },
  {
    keywords: ['manta', 'playa murcielago'],
    suggestion: { id: 'instant-manta', name: 'Manta, Manabí, Ecuador', place_name: 'Manta, Manabí, Ecuador', center: [-80.7089, -0.9621] }
  },
  {
    keywords: ['quilotoa', 'laguna del quilotoa'],
    suggestion: { id: 'instant-quilotoa', name: 'Laguna del Quilotoa, Pujilí, Cotopaxi', place_name: 'Laguna del Quilotoa, Pujilí, Cotopaxi', center: [-78.9073, -0.8580] }
  },
  {
    keywords: ['guayllabamba'],
    suggestion: { id: 'instant-guayllabamba', name: 'Guayllabamba, Pichincha, Ecuador', place_name: 'Guayllabamba, Pichincha, Ecuador', center: [-78.3436, -0.0617] }
  },
  {
    keywords: ['cayambe'],
    suggestion: { id: 'instant-cayambe', name: 'Cayambe, Pichincha, Ecuador', place_name: 'Cayambe, Pichincha, Ecuador', center: [-78.1452, 0.0402] }
  }
];

export async function fetchSuggestions(
  query: string, 
  proximity?: [number, number],
  sessionToken?: string,
  signal?: AbortSignal
): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  const normQuery = query.toLowerCase().trim();
  const effectiveProximity = proximity ?? QUITO_CENTER;

  // In-memory cache for ultra-fast autocomplete response
  const cacheKey = `${normQuery}_${effectiveProximity.join(',')}`;
  const cached = suggestionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 120000) {
    return cached.data;
  }

  // Instant local dictionary lookup (0ms latency)
  const instantMatches = INSTANT_ECUADOR_PLACES
    .filter(item => item.keywords.some(k => k.includes(normQuery) || normQuery.includes(k)))
    .map(item => item.suggestion);

  // Pre-process query for Mapbox/OSM search
  const processedQuery = query
    .replace(/\s+y\s+/gi, ' & ')
    .replace(/\s+e\s+/gi, ' & ');

  const baseParams = `access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&limit=8&types=address,place,locality,neighborhood,poi`;
  const proxMapbox = `&proximity=${effectiveProximity[0]},${effectiveProximity[1]}`;
  const urlMapbox = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${baseParams}&country=ec${proxMapbox}`;

  let combinedResults: (SearchSuggestion & { relevance?: number })[] = [...instantMatches];

  // Primary: Mapbox high-speed official geocoding (runs directly on client in ~100ms)
  const mapboxPromise = (async () => {
    try {
      const resMapbox = await fetch(urlMapbox, { signal });
      if (resMapbox.ok) {
        const data = await resMapbox.json();
        if (data.features && data.features.length > 0) {
          return data.features
            .filter((f: any) => f.text?.toLowerCase() !== 'ecuador')
            .map((f: any) => {
              const displayName = f.place_name ? f.place_name.replace(/, Ecuador$/i, '') : f.text;
              return {
                id: f.id,
                name: displayName,
                place_name: f.place_name,
                center: f.center as [number, number],
                relevance: typeof f.relevance === 'number' ? f.relevance : 1.0
              };
            });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Mapbox fast geocode error:', err);
      }
    }
    return [];
  })();

  // Secondary: Google Places API (New) with 400ms timeout in parallel
  const googlePromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 400);
      const googleRes = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query, proximity: effectiveProximity, sessionToken }),
        signal: signal ? signal : controller.signal
      });
      clearTimeout(timeoutId);

      if (googleRes.ok) {
        const gData = await googleRes.json();
        if (gData.suggestions && gData.suggestions.length > 0) {
          return gData.suggestions.map((s: any) => ({
            id: s.id,
            placeId: s.placeId,
            name: s.name,
            place_name: s.name,
            provider: 'google' as const
          }));
        }
      }
    } catch {
      // Ignore Google Places timeout or missing key
    }
    return [];
  })();

  // Run Mapbox and Google in parallel for maximum speed
  const [mapboxResults, googleResults] = await Promise.all([mapboxPromise, googlePromise]);

  // Combine Mapbox and Google results (prioritizing direct coordinates from Mapbox)
  const existingIds = new Set(combinedResults.map(r => r.name.toLowerCase()));
  
  for (const item of mapboxResults) {
    if (!existingIds.has(item.name.toLowerCase())) {
      existingIds.add(item.name.toLowerCase());
      combinedResults.push(item);
    }
  }

  for (const item of googleResults) {
    if (!existingIds.has(item.name.toLowerCase())) {
      existingIds.add(item.name.toLowerCase());
      combinedResults.push(item);
    }
  }

  // Fallback: query Photon if total matches < 3
  if (combinedResults.length < 3) {
    try {
      const ECUADOR_BBOX = '-81.0,-5.0,-75.2,1.5';
      const proxPhoton = `&lat=${effectiveProximity[1]}&lon=${effectiveProximity[0]}`;
      const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(processedQuery)}&limit=5&bbox=${ECUADOR_BBOX}${proxPhoton}`;
      const resPhoton = await fetch(urlPhoton, { signal });

      if (resPhoton.ok) {
        const data = await resPhoton.json();
        if (data.features && data.features.length > 0) {
          const photonFeatures = data.features.map((f: any, index: number) => {
            const p = f.properties;
            const mainName = p.name || p.city || p.state;
            const desc = [p.street, p.city, p.state].filter(Boolean).filter((d: string) => d.toLowerCase() !== 'ecuador').join(', ');
            const displayName = desc ? `${mainName}, ${desc}` : mainName;

            return {
              id: `photon-${p.osm_id || 'node'}-${index}-${Math.floor(Math.random() * 10000)}`,
              name: displayName,
              place_name: `${mainName}${desc ? `, ${desc}` : ''}`,
              center: f.geometry.coordinates as [number, number],
              relevance: 0.7
            };
          });

          for (const item of photonFeatures) {
            if (!existingIds.has(item.name.toLowerCase())) {
              existingIds.add(item.name.toLowerCase());
              combinedResults.push(item);
            }
          }
        }
      }
    } catch {
      // Ignore photon error
    }
  }

  const finalResults = combinedResults.slice(0, 8).map(r => ({
    id: r.id,
    placeId: r.placeId,
    name: r.name,
    place_name: r.place_name,
    center: r.center
  }));

  suggestionsCache.set(cacheKey, { timestamp: Date.now(), data: finalResults });
  return finalResults;
}

/**
 * Geocode a single place name to coordinates.
 * Uses fetchSuggestions and returns the first result.
 */
export async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query || query.length < 2) return null;
  try {
    const results = await fetchSuggestions(query);
    if (results.length === 0 || !results[0].center) return null;
    const [lng, lat] = results[0].center;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Decode a serialized GeoJSON LineString geometry back to [lng, lat] pairs.
 * Use this instead of decodePolyline when geometry comes from fetchRoute.
 */
export function decodeGeoJSONGeometry(geometryJSON: string): [number, number][] {
  try {
    const geom = JSON.parse(geometryJSON);
    return (geom.coordinates as number[][]).map(c => [c[0], c[1]]);
  } catch {
    return [];
  }
}

/**
 * @deprecated Use decodeGeoJSONGeometry — kept for legacy callers only.
 * Utility to decode polyline6 format (Mapbox default)
 */
export function decodePolyline(str: string, precision: number = 6) {
  const factor = Math.pow(10, precision);
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates = [];
  const len = str.length;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
        } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}
