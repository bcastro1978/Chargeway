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

export async function fetchSuggestions(query: string, proximity?: [number, number]): Promise<SearchSuggestion[]> {
  if (!MAPBOX_ACCESS_TOKEN || query.length < 3) return [];

  // Always bias toward Quito if no user location provided
  const effectiveProximity = proximity ?? QUITO_CENTER;

  // Pre-process query to replace Spanish intersection words 'y' and 'e' with '&' for Mapbox/OSM intersection recognition
  const processedQuery = query
    .replace(/\s+y\s+/gi, ' & ')
    .replace(/\s+e\s+/gi, ' & ');

  // For Mapbox, use the original query as its Spanish parser natively understands "y" / "e" for intersections.
  // We use valid types: address (which includes intersections), place, locality, and neighborhood.
  const baseParams = `access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&limit=8&types=address,place,locality,neighborhood`;
  const proxMapbox = `&proximity=${effectiveProximity[0]},${effectiveProximity[1]}`;

  const urlMapbox = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${baseParams}&country=ec${proxMapbox}`;

  // Ecuador bounding box: west=-81, south=-5, east=-75.2, north=1.5
  const ECUADOR_BBOX = '-81.0,-5.0,-75.2,1.5';
  const proxPhoton = `&lat=${effectiveProximity[1]}&lon=${effectiveProximity[0]}`;
  const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(processedQuery)}&limit=8&bbox=${ECUADOR_BBOX}${proxPhoton}`;

  let combinedResults: SearchSuggestion[] = [];

  const [resMapbox, resPhoton] = await Promise.allSettled([
    fetch(urlMapbox).then(r => r.json()),
    fetch(urlPhoton).then(r => r.json())
  ]);

  // Helper to capitalize street names nicely
  const capitalizeWords = (str: string) => {
    return str
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Detect if query looks like an intersection (e.g. "Calle A y Calle B")
  const intersectionPattern = /\s+(?:y|e|&|and)\s+/i;
  const isIntersectionQuery = intersectionPattern.test(query);
  let formattedIntersectionName = '';
  if (isIntersectionQuery) {
    const parts = query.split(intersectionPattern);
    if (parts.length >= 2) {
      const s1 = capitalizeWords(parts[0].trim());
      const s2 = capitalizeWords(parts[1].trim());
      formattedIntersectionName = `${s1} y ${s2}`;
    }
  }

  // 1. Mapbox first — it has country=ec enforced server-side
  if (resMapbox.status === 'fulfilled' && resMapbox.value.features) {
    const mapboxFeatures = resMapbox.value.features
      .filter((f: any) => f.text.toLowerCase() !== 'ecuador')
      .map((f: any) => {
        const cityContext = f.context?.find((c: any) => c.id.startsWith('place'))?.text || 'Quito';
        const displayName = isIntersectionQuery && formattedIntersectionName
          ? `${formattedIntersectionName}, ${cityContext}`
          : (f.place_name ? f.place_name.replace(/, Ecuador$/i, '') : f.text);

        return {
          id: f.id,
          name: displayName,
          place_name: f.place_name,
          center: f.center as [number, number]
        };
      });
    combinedResults = [...combinedResults, ...mapboxFeatures];
  }

  // 2. Photon as supplement — strict bbox filter applied
  if (resPhoton.status === 'fulfilled' && resPhoton.value.features) {
    const photonFeatures = resPhoton.value.features
      .map((f: any, index: number) => {
        const p = f.properties;
        const mainName = p.name || p.city || p.state;
        const city = p.city || 'Quito';
        const desc = [p.street, p.city, p.state].filter(Boolean).filter(d => d.toLowerCase() !== 'ecuador').join(', ');
        
        const displayName = isIntersectionQuery && formattedIntersectionName
          ? `${formattedIntersectionName}, ${city}`
          : (desc ? `${mainName}, ${desc}` : mainName);

        return {
          id: `photon-${p.osm_id || 'node'}-${index}-${Math.floor(Math.random() * 10000)}`,
          name: displayName,
          place_name: `${mainName}${desc ? `, ${desc}` : ''}`,
          center: f.geometry.coordinates as [number, number]
        };
      });

    for (const ph of photonFeatures) {
      if (!combinedResults.some(r => r.name.toLowerCase() === ph.name.toLowerCase())) {
        combinedResults.push(ph);
      }
    }
  }

  // Sort all results by geographic distance to the user's current location/Quito center
  const distance = (c1: [number, number], c2: [number, number]) => {
    return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
  };
  combinedResults.sort((a, b) => {
    return distance(a.center, effectiveProximity) - distance(b.center, effectiveProximity);
  });

  return combinedResults.slice(0, 8);
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
