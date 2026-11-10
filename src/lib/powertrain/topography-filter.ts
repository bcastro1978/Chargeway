/**
 * ChargeWay Powertrain Engineering Core
 * Module: Topographic Noise Filtering & Micro-Segmentation
 * 
 * Cleans discrete satellite SRTM staircasing and bridge/cliff artifacts from elevation profiles.
 * Produces smooth, physically continuous slope (dh/ds) vectors for energy integration.
 */

export interface GeoPoint3D {
  lat: number;
  lng: number;
  elevationM: number;
  distanceAlongRouteM?: number;
}

export interface FilteredMicroSegment {
  index: number;
  distanceM: number;
  cumDistanceKm: number;
  elevationStartM: number;
  elevationEndM: number;
  elevationDeltaM: number;
  gradePct: number;             // Slope in percentage: (dh / ds) * 100
  startCoord: [number, number]; // [lng, lat]
  endCoord: [number, number];
}

const EARTH_RADIUS_M = 6371000;

/**
 * High-precision Haversine surface distance between two WGS84 coordinates.
 */
export function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 1D Gaussian kernel filter to remove digital elevation discrete stepping artifacts.
 * Uses a dynamic window size tuned to spatial resolution (~500m kernel width).
 */
export function applyGaussianElevationFilter(
  points: GeoPoint3D[],
  sigmaPoints: number = 2.0
): GeoPoint3D[] {
  if (points.length <= 3) return points.map(p => ({ ...p }));

  const kernelRadius = Math.max(1, Math.round(sigmaPoints * 3));
  const kernel: number[] = [];
  let kernelSum = 0;

  for (let i = -kernelRadius; i <= kernelRadius; i++) {
    const weight = Math.exp(-(i * i) / (2 * sigmaPoints * sigmaPoints));
    kernel.push(weight);
    kernelSum += weight;
  }
  // Normalize
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= kernelSum;
  }

  const result: GeoPoint3D[] = [];

  for (let i = 0; i < points.length; i++) {
    let weightedElev = 0;
    let localWeightSum = 0;

    for (let k = -kernelRadius; k <= kernelRadius; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < points.length) {
        const w = kernel[k + kernelRadius];
        weightedElev += points[idx].elevationM * w;
        localWeightSum += w;
      }
    }

    result.push({
      ...points[i],
      elevationM: localWeightSum > 0 ? weightedElev / localWeightSum : points[i].elevationM,
    });
  }

  return result;
}

/**
 * Resamples an arbitrary route coordinate profile into uniform micro-segments
 * suitable for differential power integration (default 200m per segment).
 */
export function generateFilteredMicroSegments(
  rawPoints: GeoPoint3D[],
  targetSegmentLengthM: number = 200
): FilteredMicroSegment[] {
  if (rawPoints.length < 2) return [];

  // 1. First smooth the elevation to suppress SRTM vertical quantizing noise
  const smoothed = applyGaussianElevationFilter(rawPoints, 2.2);

  // 2. Compute cumulative distances along the raw trace
  let cumDistanceM = 0;
  const pointDistancesM: number[] = [0];

  for (let i = 1; i < smoothed.length; i++) {
    const dM = haversineDistanceM(
      smoothed[i - 1].lat,
      smoothed[i - 1].lng,
      smoothed[i].lat,
      smoothed[i].lng
    );
    cumDistanceM += dM;
    pointDistancesM.push(cumDistanceM);
  }

  const totalLengthM = cumDistanceM;
  if (totalLengthM <= 0) return [];

  const segmentsCount = Math.max(1, Math.round(totalLengthM / targetSegmentLengthM));
  const actualSegmentLengthM = totalLengthM / segmentsCount;

  const microSegments: FilteredMicroSegment[] = [];

  // Helper to interpolate coordinate and elevation at any distance along route
  function sampleAtDistance(distM: number): { lat: number; lng: number; elevationM: number } {
    const clampedDist = Math.max(0, Math.min(totalLengthM, distM));
    // Find enclosing raw indices
    let low = 0;
    let high = pointDistancesM.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (pointDistancesM[mid] < clampedDist) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx1 = Math.max(0, low - 1);
    const idx2 = Math.min(smoothed.length - 1, low);

    if (idx1 === idx2) {
      return {
        lat: smoothed[idx1].lat,
        lng: smoothed[idx1].lng,
        elevationM: smoothed[idx1].elevationM,
      };
    }

    const segStartDist = pointDistancesM[idx1];
    const segEndDist = pointDistancesM[idx2];
    const segSpan = Math.max(0.1, segEndDist - segStartDist);
    const alpha = (clampedDist - segStartDist) / segSpan;

    return {
      lat: smoothed[idx1].lat + (smoothed[idx2].lat - smoothed[idx1].lat) * alpha,
      lng: smoothed[idx1].lng + (smoothed[idx2].lng - smoothed[idx1].lng) * alpha,
      elevationM: smoothed[idx1].elevationM + (smoothed[idx2].elevationM - smoothed[idx1].elevationM) * alpha,
    };
  }

  for (let s = 0; s < segmentsCount; s++) {
    const startDistM = s * actualSegmentLengthM;
    const endDistM = Math.min(totalLengthM, (s + 1) * actualSegmentLengthM);
    const dM = endDistM - startDistM;

    const startSample = sampleAtDistance(startDistM);
    const endSample = sampleAtDistance(endDistM);

    const deltaElevationM = endSample.elevationM - startSample.elevationM;
    // Grade clamp: Ecuadorian highways rarely exceed +/- 15% grade in paved roads
    const rawGradePct = dM > 0 ? (deltaElevationM / dM) * 100 : 0;
    const clampedGradePct = Math.max(-18, Math.min(18, rawGradePct));

    microSegments.push({
      index: s,
      distanceM: dM,
      cumDistanceKm: endDistM / 1000,
      elevationStartM: startSample.elevationM,
      elevationEndM: endSample.elevationM,
      elevationDeltaM: deltaElevationM,
      gradePct: clampedGradePct,
      startCoord: [startSample.lng, startSample.lat],
      endCoord: [endSample.lng, endSample.lat],
    });
  }

  return microSegments;
}

