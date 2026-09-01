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
      waypoints: data.waypoints
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
  center: [number, number]; // [lng, lat]
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

export async function fetchSuggestions(query: string, proximity?: [number, number]): Promise<SearchSuggestion[]> {
  if (!MAPBOX_ACCESS_TOKEN || query.length < 3) return [];

  // Always bias toward Quito if no user location provided
  const effectiveProximity = proximity ?? QUITO_CENTER;

  // Detect if query looks like an intersection (e.g. "Calle A y Calle B")
  const intersectionPattern = /\s+(?:y|e|&|and)\s+/i;
  const isIntersectionQuery = intersectionPattern.test(query);

  let intersectionResult: SearchSuggestion | null = null;
  if (isIntersectionQuery) {
    const parts = query.split(intersectionPattern);
    if (parts.length >= 2 && parts[0].trim().length >= 3 && parts[1].trim().length >= 3) {
      intersectionResult = await resolveIntersection(parts[0].trim(), parts[1].trim(), effectiveProximity);
    }
  }

  // Pre-process query for Mapbox/OSM search
  const processedQuery = query
    .replace(/\s+y\s+/gi, ' & ')
    .replace(/\s+e\s+/gi, ' & ');

  const baseParams = `access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&limit=8&types=address,place,locality,neighborhood`;
  const proxMapbox = `&proximity=${effectiveProximity[0]},${effectiveProximity[1]}`;
  const urlMapbox = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${baseParams}&country=ec${proxMapbox}`;

  // Ecuador bounding box: west=-81, south=-5, east=-75.2, north=1.5
  const ECUADOR_BBOX = '-81.0,-5.0,-75.2,1.5';
  const proxPhoton = `&lat=${effectiveProximity[1]}&lon=${effectiveProximity[0]}`;
  const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(processedQuery)}&limit=6&bbox=${ECUADOR_BBOX}${proxPhoton}`;

  let combinedResults: (SearchSuggestion & { relevance?: number })[] = [];

  const [resMapbox, resPhoton] = await Promise.allSettled([
    fetch(urlMapbox).then(r => r.json()),
    fetch(urlPhoton).then(r => r.json())
  ]);

  // 1. Mapbox features first
  if (resMapbox.status === 'fulfilled' && resMapbox.value.features) {
    const mapboxFeatures = resMapbox.value.features
      .filter((f: any) => f.text.toLowerCase() !== 'ecuador')
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
    combinedResults = [...combinedResults, ...mapboxFeatures];
  }

  // 2. Photon as supplement if available
  if (resPhoton.status === 'fulfilled' && resPhoton.value?.features) {
    const photonFeatures = resPhoton.value.features
      .map((f: any, index: number) => {
        const p = f.properties;
        const mainName = p.name || p.city || p.state;
        const desc = [p.street, p.city, p.state].filter(Boolean).filter(d => d.toLowerCase() !== 'ecuador').join(', ');
        const displayName = desc ? `${mainName}, ${desc}` : mainName;

        return {
          id: `photon-${p.osm_id || 'node'}-${index}-${Math.floor(Math.random() * 10000)}`,
          name: displayName,
          place_name: `${mainName}${desc ? `, ${desc}` : ''}`,
          center: f.geometry.coordinates as [number, number],
          relevance: 0.8
        };
      });

    for (const ph of photonFeatures) {
      if (!combinedResults.some(r => r.name.toLowerCase() === ph.name.toLowerCase())) {
        combinedResults.push(ph);
      }
    }
  }

  // Sort preserving Mapbox search relevance: only use distance as tie-breaker for similar relevance
  const distance = (c1: [number, number], c2: [number, number]) => {
    return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
  };

  combinedResults.sort((a, b) => {
    const relA = a.relevance ?? 1.0;
    const relB = b.relevance ?? 1.0;
    // If relevance differs by > 0.08, the higher text match wins
    if (Math.abs(relA - relB) > 0.08) {
      return relB - relA;
    }
    // Otherwise tie-break with proximity
    return distance(a.center, effectiveProximity) - distance(b.center, effectiveProximity);
  });

  // Prepend verified intersection result if found
  if (intersectionResult) {
    combinedResults.unshift(intersectionResult);
  }

  return combinedResults.slice(0, 8).map(r => ({
    id: r.id,
    name: r.name,
    place_name: r.place_name,
    center: r.center
  }));
}

/**
 * Geocode a single place name to coordinates.
 * Uses fetchSuggestions and returns the first result.
 */
export async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query || query.length < 2) return null;
  try {
    const results = await fetchSuggestions(query);
    if (results.length === 0) return null;
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
