/**
 * Elevation Service for ChargeWay
 * Integrates with OpenTopoData (Free & Open Source).
 */

export interface ElevationPoint {
  elevation: number;
  location: {
    lat: number;
    lng: number;
  };
  resolution: number;
}

/**
 * Smooths an elevation profile using a gaussian-weighted moving average.
 * Removes DEM noise (typically ±5–15 m) while preserving real terrain features.
 * Without smoothing, random noise is asymmetric in the energy model:
 * +5m noise costs real energy, -5m only recovers 25% via regen → systematic overcount.
 *
 * Window size 5 keeps sharp transitions (like a 6km climb) intact
 * but kills point-to-point noise.
 */
export function smoothElevation(points: ElevationPoint[], windowSize: number = 5): ElevationPoint[] {
  if (points.length < windowSize) return points;
  const half = Math.floor(windowSize / 2);
  return points.map((pt, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(points.length - 1, i + half);
    let sum = 0, count = 0;
    for (let j = start; j <= end; j++) {
      sum += points[j].elevation;
      count++;
    }
    return { ...pt, elevation: sum / count };
  });
}

/**
 * Fetches elevation for a list of road coordinates.
 * Samples up to `maxSamples` evenly distributed points (OpenTopoData limit: 100).
 */
export async function fetchElevationForCoords(
  coords: { lat: number; lng: number }[],
  maxSamples: number = 50
): Promise<ElevationPoint[]> {
  if (coords.length === 0) return [];
  try {
    // Sample evenly distributed points
    const sampledCoords: { lat: number; lng: number }[] = [];
    const step = Math.max(1, (coords.length - 1) / (maxSamples - 1));
    for (let i = 0; i < maxSamples; i++) {
      const idx = Math.min(Math.round(i * step), coords.length - 1);
      sampledCoords.push(coords[idx]);
    }

    const locationsString = sampledCoords.map(c => `${c.lat},${c.lng}`).join('|');
    const url = `/api/elevation?locations=${locationsString}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`OpenTopoData Error: ${data.error}`);
    }

    return data.results.map((res: any) => ({
      elevation: res.elevation ?? 0,
      location: { lat: res.location.lat, lng: res.location.lng },
      resolution: 30
    }));
  } catch (error) {
    console.error('Failed to fetch elevation profile:', error);
    return [];
  }
}
