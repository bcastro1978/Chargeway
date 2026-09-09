/**
 * Google Places API (New) Service - "Carga y Disfruta"
 * Busca amenidades cercanas (cafeterías, restaurantes, centros comerciales, farmacias)
 * a puntos de carga para optimizar el tiempo de espera del conductor.
 */

export interface NearbyPlace {
  id: string;
  name: string;
  category: 'cafe' | 'restaurant' | 'shopping' | 'convenience' | 'general';
  rating?: number;
  userRatingCount?: number;
  address?: string;
  distanceMeters?: number;
  mapsUri?: string;
  isOpenNow?: boolean;
}

export interface PlacesNearbyResponse {
  places: NearbyPlace[];
  cached?: boolean;
  provider: string;
}

export async function fetchNearbyAmenities(
  lat: number,
  lng: number,
  radiusMeters: number = 400
): Promise<NearbyPlace[]> {
  try {
    const url = `/api/places/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch places: ${response.statusText}`);
    }
    const data: PlacesNearbyResponse = await response.json();
    return data.places || [];
  } catch (err) {
    console.error('Error fetching nearby amenities:', err);
    return [];
  }
}
