/**
 * Route Geometry Cache & Spatial Helpers
 * Optimized to prevent repeated JSON.parse() across components and speed up calculations.
 */

const geometryCache = new Map<string, [number, number][]>();

export function getDecodedRouteCoordinates(geometryJson?: string | null): [number, number][] {
  if (!geometryJson) return [];
  const cached = geometryCache.get(geometryJson);
  if (cached) return cached;

  try {
    const geom = typeof geometryJson === 'string' ? JSON.parse(geometryJson) : geometryJson;
    const rawCoords = Array.isArray(geom) ? geom : (geom?.coordinates || []);
    const coords = (rawCoords as number[][]).map(c => [c[0], c[1]] as [number, number]);
    
    // LRU eviction if cache grows beyond 30 routes
    if (geometryCache.size >= 30) {
      const firstKey = geometryCache.keys().next().value;
      if (firstKey) geometryCache.delete(firstKey);
    }
    geometryCache.set(geometryJson, coords);
    return coords;
  } catch {
    return [];
  }
}

/**
 * Computes Axis-Aligned Bounding Box (AABB) with optional padding in degrees.
 * Latitude 1 deg ~= 111 km, Longitude 1 deg ~= 111 km * cos(lat) ~= 111 km at equator.
 */
export function getRouteBoundingBox(coords: [number, number][], paddingDegrees = 0.05) {
  if (!coords || coords.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return {
    minLat: minLat - paddingDegrees,
    maxLat: maxLat + paddingDegrees,
    minLng: minLng - paddingDegrees,
    maxLng: maxLng + paddingDegrees,
  };
}
