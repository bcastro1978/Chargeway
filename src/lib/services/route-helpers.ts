export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteStopInput {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  posKm?: number;
  isInbound?: boolean;
  totalTripKm?: number;
}

/**
 * Calculates Euclidean distance in approximate kilometers between two lat/lng points.
 */
export function getGeoDistanceKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const dLat = (p1.lat - p2.lat) * 111.0;
  const avgLatRad = ((p1.lat + p2.lat) / 2) * (Math.PI / 180);
  const dLng = (p1.lng - p2.lng) * 111.0 * Math.cos(avgLatRad);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Determines whether a route is a round trip (ida y vuelta).
 */
export function isRoundTripRoute(points: Waypoint[]): boolean {
  if (points.length < 2) return false;
  const origin = points[0];
  const finalPoint = points[points.length - 1];

  if (!origin || !finalPoint || origin.lat === 0 || finalPoint.lat === 0) return false;

  const isReturnName = finalPoint.name.toLowerCase().includes('retorno') || finalPoint.name.toLowerCase().includes('vuelta');
  const isCloseCoords = getGeoDistanceKm(origin, finalPoint) < 1.0;

  return isReturnName || isCloseCoords;
}

/**
 * Correctly orders and inserts one or more charging stops into a route.
 * Handles both one-way trips and round trips (Ida y Vuelta) without putting
 * intermediate stops in reversed or scrambled order.
 */
export function orderRouteWithStops(
  currentPoints: Waypoint[],
  newStops: RouteStopInput[],
  tripTotalDistanceKm?: number
): Waypoint[] {
  if (!currentPoints || currentPoints.length === 0) return [];
  if (currentPoints.length === 1) {
    const formatted = newStops.map((s, idx) => ({
      id: s.id || `stop-${Date.now()}-${idx}`,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
    }));
    return [currentPoints[0], ...formatted];
  }

  const origin = currentPoints[0];
  const finalPoint = currentPoints[currentPoints.length - 1];
  const isRound = isRoundTripRoute(currentPoints);

  // Filter out any stop that already exists in the route (< 400m distance)
  const isAlreadyIn = (target: { lat: number; lng: number }, list: Waypoint[]) =>
    list.some(p => getGeoDistanceKm(p, target) < 0.4);

  // CASE 1: ONE-WAY ROUTE
  if (!isRound) {
    const existingIntermediates = currentPoints.slice(1, -1);
    const validNewStops: Waypoint[] = [];

    for (let i = 0; i < newStops.length; i++) {
      const s = newStops[i];
      if (!isAlreadyIn(s, currentPoints) && !isAlreadyIn(s, validNewStops)) {
        validNewStops.push({
          id: s.id || `stop-${Date.now()}-${i}`,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
        });
      }
    }

    const allIntermediates = [...existingIntermediates, ...validNewStops];
    // Sort all intermediates by distance from origin towards destination
    allIntermediates.sort((a, b) => getGeoDistanceKm(origin, a) - getGeoDistanceKm(origin, b));

    return [origin, ...allIntermediates, finalPoint];
  }

  // CASE 2: ROUND TRIP (IDA Y VUELTA)
  // In a round trip:
  // Origin and FinalPoint are both the starting city (e.g. Quito).
  // The turnaround point is the primary destination (furthest point from origin, e.g. Macas).
  let turnaroundIdx = 1;
  let maxDistFromOrigin = -1;

  for (let i = 1; i < currentPoints.length - 1; i++) {
    const dist = getGeoDistanceKm(origin, currentPoints[i]);
    if (dist > maxDistFromOrigin) {
      maxDistFromOrigin = dist;
      turnaroundIdx = i;
    }
  }

  const turnaroundPoint = currentPoints[turnaroundIdx];
  const outboundDistanceKm = maxDistFromOrigin;
  const estimatedHalfwayKm = tripTotalDistanceKm ? tripTotalDistanceKm / 2 : outboundDistanceKm * 1.35;

  // Existing outbound stops (between origin and turnaround point)
  const existingOutbound = currentPoints.slice(1, turnaroundIdx);
  // Existing inbound stops (between turnaround point and final return point)
  const existingInbound = currentPoints.slice(turnaroundIdx + 1, -1);

  const newOutbound: Waypoint[] = [];
  const newInbound: Waypoint[] = [];

  for (let i = 0; i < newStops.length; i++) {
    const s = newStops[i];

    const wp: Waypoint = {
      id: s.id || `stop-${Date.now()}-${i}`,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
    };

    // Determine whether this stop is for the outbound trip or the return trip
    const isExplicitlyInbound = s.isInbound === true;
    const isPastHalfwayByKm = Boolean(s.posKm && s.posKm > estimatedHalfwayKm * 1.02);
    const assignToInbound = isExplicitlyInbound || isPastHalfwayByKm;

    if (assignToInbound) {
      // Inbound stops only deduplicate against existing and new inbound stops
      if (!isAlreadyIn(s, existingInbound) && !isAlreadyIn(s, newInbound) && getGeoDistanceKm(s, turnaroundPoint) > 0.4 && getGeoDistanceKm(s, finalPoint) > 0.4) {
        newInbound.push(wp);
      }
    } else {
      // Outbound stops only deduplicate against existing and new outbound stops
      if (!isAlreadyIn(s, existingOutbound) && !isAlreadyIn(s, newOutbound) && getGeoDistanceKm(s, origin) > 0.4 && getGeoDistanceKm(s, turnaroundPoint) > 0.4) {
        newOutbound.push(wp);
      }
    }
  }

  // Outbound stops are ordered by increasing distance from origin
  const allOutbound = [...existingOutbound, ...newOutbound];
  allOutbound.sort((a, b) => getGeoDistanceKm(origin, a) - getGeoDistanceKm(origin, b));

  // Inbound stops are ordered by decreasing distance from origin (or increasing distance from turnaround)
  const allInbound = [...existingInbound, ...newInbound];
  allInbound.sort((a, b) => getGeoDistanceKm(turnaroundPoint, a) - getGeoDistanceKm(turnaroundPoint, b));

  return [origin, ...allOutbound, turnaroundPoint, ...allInbound, finalPoint];
}
