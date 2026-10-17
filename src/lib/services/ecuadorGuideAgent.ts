import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchAllEcuadorChargers, Charger } from '@/lib/services/charging';

export interface EcuadorDestination {
  name: string;
  aliases: string[];
  province: string;
  region: 'Sierra' | 'Costa' | 'Amazonia' | 'Insular';
  corridor: 'norte' | 'costa' | 'sur' | 'oriente' | 'local';
  altitudeMeters: number;
  coords: { lat: number; lng: number };
  distFromQuitoKm: number;
  tourismHighlights: string[];
  gastronomy: string[];
  drivingNotes: string;
}

export interface EcuadorGuideContext {
  intent: 'route_planning' | 'tourism_poi' | 'charging_query' | 'general_advice';
  destination?: EcuadorDestination;
  origin?: { name: string; lat: number; lng: number };
  isRoundTrip: boolean;
  waypoints?: Array<{ name: string; lat: number; lng: number }>;
  chargersFromSupabase: Array<{
    name: string;
    power: string;
    speed: string;
    operator?: string;
    location: { lat: number; lng: number };
  }>;
  placesFromGoogle: Array<{
    name: string;
    category: string;
    rating?: number;
    address?: string;
    isOpenNow?: boolean;
    mapsUri?: string;
  }>;
}

// Catálogo enciclopédico de destinos y atractivos de Ecuador
export const ECUADOR_DESTINATIONS: EcuadorDestination[] = [
  {
    name: 'Riobamba',
    aliases: ['riobamba', 'riobamaba', 'chimborazo', 'guano', 'la sultana de los andes'],
    province: 'Chimborazo',
    region: 'Sierra',
    corridor: 'sur',
    altitudeMeters: 2750,
    coords: { lat: -1.6636, lng: -78.6546 },
    distFromQuitoKm: 190,
    tourismHighlights: ['Reserva de Producción de Fauna Chimborazo', 'Parque Maldonado', 'Tren del Hielo', 'Artesanías en Guano'],
    gastronomy: ['Hornado de Riobamba en el Mercado La Merced', 'Jugos con hielo del Chimborazo', 'Ceviche de chochos'],
    drivingNotes: 'Ruta Panamericana Sur E35 pasando por El Chasqui (3,610m) y Ambato. Vía de 4 carriles en excelente estado.',
  },
  {
    name: 'Baños de Agua Santa',
    aliases: ['banos', 'baños', 'banos de agua santa', 'baños de agua santa', 'ruta de las cascadas'],
    province: 'Tungurahua',
    region: 'Sierra',
    corridor: 'sur',
    altitudeMeters: 1820,
    coords: { lat: -1.3964, lng: -78.4247 },
    distFromQuitoKm: 175,
    tourismHighlights: ['Pailón del Diablo', 'Casa del Árbol y Columpio del Fin del Mundo', 'Termas de la Virgen', 'Ruta de las Cascadas'],
    gastronomy: ['Melcochas artesanales', 'Sánduche de trucha', 'Jugo de caña recién extraído'],
    drivingNotes: 'Desvío desde Ambato por la vía a Pelileo. Cañón montañoso con gran regeneración en el descenso.',
  },
  {
    name: 'Ambato',
    aliases: ['ambato', 'ambtao', 'tungurahua', 'tierra de flores'],
    province: 'Tungurahua',
    region: 'Sierra',
    corridor: 'sur',
    altitudeMeters: 2570,
    coords: { lat: -1.2491, lng: -78.6168 },
    distFromQuitoKm: 135,
    tourismHighlights: ['Quinta de Juan León Mera', 'Parque Montalvo', 'Feria del Jean en Pelileo', 'Mall de los Andes'],
    gastronomy: ['Llapingachos del Mercado Central', 'Pan de Pinllo', 'Gallina de Pinllo'],
    drivingNotes: 'Punto neurálgico del centro del país sobre la Panamericana E35 con cargadores rápidos en el Mall de los Andes.',
  },
  {
    name: 'Latacunga',
    aliases: ['latacunga', 'latacugna', 'cotopaxi', 'lasso', 'salcedo'],
    province: 'Cotopaxi',
    region: 'Sierra',
    corridor: 'sur',
    altitudeMeters: 2760,
    coords: { lat: -0.9316, lng: -78.6155 },
    distFromQuitoKm: 90,
    tourismHighlights: ['Parque Nacional Cotopaxi', 'Laguna del Quilotoa (Circuito)', 'Centro Histórico y Maltería Plaza'],
    gastronomy: ['Chugchucaras tradicionales', 'Helados de Salcedo (a 10 minutos)', 'Queso de hoja'],
    drivingNotes: 'Paso por el páramo de El Chasqui (3,610m). Requiere prever consumo extra en la subida desde Quito.',
  },
  {
    name: 'Guaranda',
    aliases: ['guaranda', 'guarnda', 'provincia de bolivar', 'bolivar guaranda', 'siete colinas'],
    province: 'Bolívar',
    region: 'Sierra',
    corridor: 'sur',
    altitudeMeters: 2668,
    coords: { lat: -1.5912, lng: -78.9991 },
    distFromQuitoKm: 235,
    tourismHighlights: ['Salinas de Guaranda (chocolates y quesos)', 'Monumento al Cacique Guaranga', 'El Arenal del Chimborazo'],
    gastronomy: ['Pájaro Azul tradicional', 'Chigüiles', 'Quesos maduros de Salinas'],
    drivingNotes: 'Vía panorámica cruzando El Arenal junto al volcán Chimborazo (>4,000m). Recargar en Ambato es indispensable.',
  },
  {
    name: 'Bolívar (Carchi)',
    aliases: ['bolivar carchi', 'bolívar carchi', 'bolivar del carchi', 'bolívar del carchi', 'carchi bolivar', 'canton bolivar carchi', 'canton bolivar'],
    province: 'Carchi',
    region: 'Sierra',
    corridor: 'norte',
    altitudeMeters: 2600,
    coords: { lat: 0.5011, lng: -77.9042 },
    distFromQuitoKm: 185,
    tourismHighlights: ['Bosque de los Arrayanes en San Gabriel', 'Museo Paleontológico de Bolívar (restos de mastodontes)', 'Valle del Chota y Mascarilla'],
    gastronomy: ['Cuy con papas pastusas', 'Queso amasado carchense', 'Tardón mireño tradicional'],
    drivingNotes: 'Ruta norte por la Panamericana Norte E35 pasando Cayambe e Ibarra. Subida hacia Carchi tras el Valle del Chota. Recarga estratégica en Laguna Mall de Ibarra.',
  },
  {
    name: 'Cuenca',
    aliases: ['cuenca', 'azuay', 'santa ana de los cuatro rios', 'cajas'],
    province: 'Azuay',
    region: 'Sierra',
    corridor: 'sur',
    altitudeMeters: 2560,
    coords: { lat: -2.9001, lng: -79.0059 },
    distFromQuitoKm: 460,
    tourismHighlights: ['Catedral de la Inmaculada Concepción', 'Barranco del Río Tomebamba', 'Parque Nacional Cajas', 'Mirador de Turi'],
    gastronomy: ['Mote pillo y mote sucio', 'Cuy asado con papas', 'Cascaritas de chancho'],
    drivingNotes: 'Viaje largo que requiere paradas de recarga en Ambato/Riobamba y Alausí/Cañar.',
  },
  {
    name: 'Ibarra',
    aliases: ['ibarra', 'ibara', 'ciudad blanca', 'yahuarcocha', 'laguna mall'],
    province: 'Imbabura',
    region: 'Sierra',
    corridor: 'norte',
    altitudeMeters: 2225,
    coords: { lat: 0.3517, lng: -78.1223 },
    distFromQuitoKm: 115,
    tourismHighlights: ['Laguna de Yahuarcocha y Autódromo', 'Centro Comercial Laguna Mall', 'Tren de la Libertad', 'San Antonio de Ibarra (tallados)'],
    gastronomy: ['Helados de paila de Rosalia Suárez', 'Nogadas y arrope de mora', 'Fritada de Atuntaqui'],
    drivingNotes: 'Panamericana Norte E35 cruzando Guayllabamba y Cayambe. Carga rápida de 50 kW en Laguna Mall e Ibarra BYD.',
  },
  {
    name: 'Otavalo',
    aliases: ['otavalo', 'otavlo', 'plaza de ponchos', 'san pablo'],
    province: 'Imbabura',
    region: 'Sierra',
    corridor: 'norte',
    altitudeMeters: 2550,
    coords: { lat: 0.2337, lng: -78.2625 },
    distFromQuitoKm: 95,
    tourismHighlights: ['Plaza de Ponchos (Feria Artesanal)', 'Laguna de San Pablo', 'Cascada de Peguche', 'Parque Cóndor'],
    gastronomy: ['Yamori tradicional', 'Carnes coloradas', 'Tortillas de tiesto'],
    drivingNotes: 'Autovía de 4 carriles bordeando el Lago San Pablo con hermosas vistas al volcán Imbabura.',
  },
  {
    name: 'Santo Domingo',
    aliases: ['santo domingo', 'tsachilas', 'santo domingo de los tsachilas'],
    province: 'Santo Domingo de los Tsáchilas',
    region: 'Costa',
    corridor: 'costa',
    altitudeMeters: 625,
    coords: { lat: -0.2528, lng: -79.1724 },
    distFromQuitoKm: 140,
    tourismHighlights: ['Comunas Tsáchilas (San Javier, Chigüilpe)', 'Jardín Botánico La Carolina', 'Paseo Shopping y Bombolí'],
    gastronomy: ['Parrilladas y carnes ahumadas', 'Bandeja tsáchila con plátano verde y pescado de río'],
    drivingNotes: 'Descenso pronunciado de 2,200m desde Alóag por la E20. Gran recuperación de energía por regeneración.',
  },
  {
    name: 'Manta',
    aliases: ['manta', 'tarqui', 'murcielago', 'manabi'],
    province: 'Manabí',
    region: 'Costa',
    corridor: 'costa',
    altitudeMeters: 6,
    coords: { lat: -0.9677, lng: -80.7089 },
    distFromQuitoKm: 396,
    tourismHighlights: ['Playa El Murciélago', 'Playa Santa Marianita (Kitesurf)', 'Montecristi (Sombreros de Paja Toquilla)'],
    gastronomy: ['Ceviche de pescado con maní', 'Viche de pescado', 'Camotillo frito'],
    drivingNotes: 'Ruta Quito - Santo Domingo - Chone - Manta. Recarga rápida obligatoria en Santo Domingo.',
  },
  {
    name: 'Papallacta',
    aliases: ['papallacta', 'termas de papallacta'],
    province: 'Napo',
    region: 'Amazonia',
    corridor: 'oriente',
    altitudeMeters: 3180,
    coords: { lat: -0.3789, lng: -78.1408 },
    distFromQuitoKm: 65,
    tourismHighlights: ['Complejo Termal de Papallacta', 'Laguna de Papallacta', 'Sendero del Agua'],
    gastronomy: ['Trucha fresca al ajillo o a la plancha', 'Locro de papa con queso'],
    drivingNotes: 'Subida muy empinada hasta el Paso de la Virgen (4,064m) desde Pifo. Cargar al 90%+ en Quito antes de partir.',
  },
  {
    name: 'Tena',
    aliases: ['tena', 'archidona', 'misahualli', 'napo'],
    province: 'Napo',
    region: 'Amazonia',
    corridor: 'oriente',
    altitudeMeters: 518,
    coords: { lat: -0.9938, lng: -77.8129 },
    distFromQuitoKm: 197,
    tourismHighlights: ['Puerto Misahuallí (monos y playas del río)', 'Cavernas de Jumandy en Archidona', 'Rafting en Río Jatunyacu'],
    gastronomy: ['Maito de tilapia envuelto en hoja de bijao', 'Chicha de chonta y yuca', 'Ayampaco'],
    drivingNotes: 'Paso por Papallacta y Baeza. Descenso continuo hacia la llanura amazónica.',
  },
  {
    name: 'Macas',
    aliases: ['macas', 'morona santiago', 'morona', 'esmeralda oriental'],
    province: 'Morona Santiago',
    region: 'Amazonia',
    corridor: 'sur',
    altitudeMeters: 1050,
    coords: { lat: -2.3087, lng: -78.1114 },
    distFromQuitoKm: 371,
    tourismHighlights: ['Catedral de la Purísima de Macas', 'Parque Nacional Sangay', 'Cascadas del Río Upano', 'Mirador del Quilamo'],
    gastronomy: ['Ayampaco tradicional de pescado o pollo', 'Chicha de chonta', 'Caldo de carachama'],
    drivingNotes: 'Ruta Quito - Ambato - Riobamba - Guamote - Macas (371 km). Se recomienda recargar en Riobamba (Megamaxi Multiplaza / Paseo Shopping) antes de adentrarse en la cordillera oriental hacia Morona Santiago.',
  },
];

/**
 * Busca un destino del catálogo utilizando alias o coincidencia difusa (Levenshtein)
 */
export function findEcuadorDestination(queryText: string): EcuadorDestination | undefined {
  if (!queryText) return undefined;
  const clean = queryText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 1. Coincidencia exacta por nombre o alias (priorizando el match más específico/largo)
  const matches: Array<{ dest: EcuadorDestination; length: number }> = [];
  for (const dest of ECUADOR_DESTINATIONS) {
    const dName = dest.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (clean.includes(dName)) {
      matches.push({ dest, length: dName.length });
      continue;
    }
    for (const alias of dest.aliases) {
      const aClean = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (clean.includes(aClean) || clean.split(/\s+/).includes(aClean)) {
        matches.push({ dest, length: aClean.length });
        break;
      }
    }
  }

  if (matches.length > 0) {
    matches.sort((a, b) => b.length - a.length);
    return matches[0].dest;
  }

  // 2. Coincidencia difusa por tokens
  const tokens = clean.split(/[\s,.-]+/).filter(t => t.length >= 4 && !['quiero', 'hasta', 'desde', 'para', 'volver', 'regresar'].includes(t));
  for (const token of tokens) {
    for (const dest of ECUADOR_DESTINATIONS) {
      for (const alias of dest.aliases) {
        const aClean = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (Math.abs(aClean.length - token.length) <= 2) {
          // Simple common substring/prefix check
          if (aClean.startsWith(token.slice(0, 5)) || token.startsWith(aClean.slice(0, 5))) {
            return dest;
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Consulta puntos de carga en Supabase filtrados por proximidad y compatibilidad
 */
export async function getRouteChargersFromSupabase(
  corridor: string,
  destCoords?: { lat: number; lng: number }
): Promise<Array<{ name: string; power: string; speed: string; operator?: string; location: { lat: number; lng: number } }>> {
  try {
    const allChargers = await fetchAllEcuadorChargers();

    const refCoords = destCoords || { lat: -0.1807, lng: -78.4678 }; // Default to Quito center if unspecified

    // Ordenar y seleccionar cargadores cercanos al destino o punto medio de referencia
    const sorted = allChargers
      .map(c => {
        const dLat = (c.location.lat - refCoords.lat) * 111;
        const dLng = (c.location.lng - refCoords.lng) * 111;
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
        return { charger: c, distKm };
      })
      .sort((a, b) => a.distKm - b.distKm);

    return sorted.slice(0, 15).map(s => ({
      name: s.charger.nombre,
      power: s.charger.potencia || '50 kW',
      speed: s.charger.velocidad || 'Rápida',
      operator: s.charger.operator || s.charger.fuente || 'Público',
      location: s.charger.location,
    }));
  } catch (err) {
    console.warn('Error al consultar cargadores de Supabase:', err);
    return [];
  }
}

/**
 * Consulta lugares de interés turístico y gastronómico mediante Google Places API con Cache en Supabase
 */
export async function getPlacesRecommendationsFromGoogle(
  coords: { lat: number; lng: number },
  category: 'restaurant' | 'attraction' | 'cafe' = 'restaurant'
): Promise<Array<{ name: string; category: string; rating?: number; address?: string; isOpenNow?: boolean; mapsUri?: string }>> {
  const stationKey = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;

  // 1. Cache en Supabase
  try {
    const { data: cached } = await supabaseAdmin
      .from('places_cache')
      .select('places_json')
      .eq('station_key', stationKey)
      .eq('category', category)
      .single();

    if (cached && Array.isArray(cached.places_json) && cached.places_json.length > 0) {
      return cached.places_json.slice(0, 3);
    }
  } catch (_) {}

  // 2. Google Places API (New)
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleApiKey || googleApiKey.length < 15 || googleApiKey === 'TU_LLAVE_DE_GOOGLE_MAPS_AQUI') {
    return [];
  }

  try {
    const includedTypes = category === 'restaurant'
      ? ['restaurant']
      : category === 'cafe'
      ? ['cafe', 'coffee_shop']
      : ['tourist_attraction', 'historical_landmark', 'park'];

    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.displayName,places.primaryType,places.rating,places.shortFormattedAddress,places.googleMapsUri,places.currentOpeningHours.openNow',
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 4,
        locationRestriction: {
          circle: {
            center: { latitude: coords.lat, longitude: coords.lng },
            radius: 2500,
          },
        },
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.places)) {
        const places = data.places.slice(0, 3).map((p: any) => ({
          name: p.displayName?.text || 'Lugar recomendado',
          category,
          rating: p.rating,
          address: p.shortFormattedAddress,
          isOpenNow: p.currentOpeningHours?.openNow,
          mapsUri: p.googleMapsUri,
        }));

        // Guardar en cache en segundo plano
        if (places.length > 0) {
          supabaseAdmin
            .from('places_cache')
            .upsert({
              station_key: stationKey,
              category,
              places_json: places,
              updated_at: new Date().toISOString(),
            })
            .then(
              () => {},
              () => {}
            );
        }

        return places;
      }
    }
  } catch (err) {
    console.warn('Google Places API fetch error:', err);
  }

  return [];
}
