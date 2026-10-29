/**
 * Ecuador Route Catalogs and Corridor Chargers
 */
import { isChargerBrandCompatible, isChargerMultibrand } from '@/lib/services/charging';

export interface CopilotChargerInfo {
  name: string;
  lat: number;
  lng: number;
  power: string;
  speed: string;
  operator?: string;
  isBrandMatch?: boolean;
  isNecessaryStop?: boolean;
  legIndex?: number;
  totalLegs?: number;
  kwhToCharge?: number;
  estMinutes?: number;
  posKm?: number;
  isInbound?: boolean;
  distKm?: number;
}

export function isBrandMatch(charger: { name?: string; operator?: string }, brand?: string): boolean {
  if (!brand || !brand.trim()) return false;
  const b = brand.trim().toLowerCase();
  const text = `${charger.name || ''} ${charger.operator || ''}`.toLowerCase();

  const brandKeywords: string[] = [b];
  if (b.includes('byd')) brandKeywords.push('byd');
  if (b.includes('kia')) brandKeywords.push('kia');
  if (b.includes('jac')) brandKeywords.push('jac');
  if (b.includes('tesla')) brandKeywords.push('tesla', 'supercharger', 'nacs');
  if (b.includes('porsche')) brandKeywords.push('porsche');
  if (b.includes('audi')) brandKeywords.push('audi');
  if (b.includes('volkswagen') || b.includes('vw')) brandKeywords.push('volkswagen', 'vw');
  if (b.includes('hyundai')) brandKeywords.push('hyundai');
  if (b.includes('renault')) brandKeywords.push('renault');
  if (b.includes('nissan')) brandKeywords.push('nissan');
  if (b.includes('geely')) brandKeywords.push('geely');

  return brandKeywords.some(kw => text.includes(kw));
}

export function getChargerPowerKw(c: CopilotChargerInfo): number {
  const match = (c.power || '').match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  const s = (c.speed || '').toLowerCase();
  if (s.includes('ultra')) return 100;
  if (s.includes('ráp') || s.includes('rap')) return 50;
  if (s.includes('semi')) return 22;
  return 7;
}

export function prioritizeChargersByBrand(
  chargers: CopilotChargerInfo[],
  vehicleBrand?: string,
  options?: { multibrandOnly?: boolean; fastOnly?: boolean }
): { list: CopilotChargerInfo[]; hasBrandMatch: boolean; brandName?: string } {
  if (!chargers || chargers.length === 0) {
    return { list: [], hasBrandMatch: false };
  }

  const cleanBrand = (vehicleBrand || '').trim();

  // 1. Filtrar por compatibilidad o restricción multimarca
  let compatible = chargers.filter(c => {
    if (options?.multibrandOnly) {
      // Excluir concesionarios / cargadores de marcas exclusivas y exigir multimarca universal
      return isChargerMultibrand({ name: c.name, operator: c.operator });
    }
    return cleanBrand
      ? isChargerBrandCompatible({ name: c.name, operator: c.operator }, cleanBrand)
      : isChargerBrandCompatible({ name: c.name, operator: c.operator });
  });

  // 2. Si se solicitó específicamente carga rápida, filtrar por potencia >= 40 kW (si existen disponibles)
  if (options?.fastOnly) {
    const fastFiltered = compatible.filter(c => getChargerPowerKw(c) >= 40);
    if (fastFiltered.length > 0) {
      compatible = fastFiltered;
    }
  }

  const scored = compatible.map(c => {
    const kw = getChargerPowerKw(c);
    const isBrand = (!options?.multibrandOnly && cleanBrand) ? isBrandMatch(c, cleanBrand) : false;
    let score = kw;
    if (kw >= 40) {
      score = isBrand ? 1000 + kw : 500 + kw;
    } else if (kw >= 20) {
      score = isBrand ? 200 + kw : 100 + kw;
    } else {
      score = isBrand ? 50 + kw : kw;
    }
    return { charger: { ...c, isBrandMatch: isBrand }, score, isBrand };
  });

  scored.sort((a, b) => b.score - a.score);

  const hasBrandMatch = scored.some(s => s.isBrand);
  return {
    list: scored.map(s => s.charger),
    hasBrandMatch,
    brandName: cleanBrand || undefined,
  };
}

export interface CityRouteInfo {
  name: string;
  aliases: string[];
  distKm: number;
  kwhEstimated: number;
  corridor: 'norte' | 'costa' | 'sur' | 'oriente' | 'local';
  coords: { lat: number; lng: number };
  recommendedStop: string;
  chargerNotes: string;
  chargers: CopilotChargerInfo[];
}

// Catálogo enriquecido de destinos frecuentes en Ecuador (Respuesta instantánea y coordenadas exactas)
export const ECUADOR_ROUTES: CityRouteInfo[] = [
  {
    name: 'Centro Comercial Laguna Mall en Ibarra',
    aliases: ['laguna mall', 'laguna mall ibarra', 'cc laguna mall', 'mall laguna'],
    distKm: 115,
    kwhEstimated: 18,
    corridor: 'norte',
    coords: { lat: 0.3601, lng: -78.125 },
    recommendedStop: 'Estación propia en Laguna Mall (50 kW)',
    chargerNotes: 'en el Centro Comercial Laguna Mall dispones de cargador rápido de 50 kW CCS2 y Tipo 2 con cafeterías y tiendas mientras cargas.',
    chargers: [
      { name: 'BYD - Ibarra (50 kW)', lat: 0.3550, lng: -78.1230, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Hacienda Pimán',
    aliases: ['piman', 'pimán', 'hacienda piman', 'hacienda pimán'],
    distKm: 121,
    kwhEstimated: 20,
    corridor: 'norte',
    coords: { lat: 0.3952, lng: -78.0772 },
    recommendedStop: 'Centro Comercial Laguna Mall en Ibarra',
    chargerNotes: 'en Ibarra tienes el Centro Comercial Laguna Mall a solo 15 minutos de Pimán con cargador rápido de 50 kW.',
    chargers: [
      { name: 'BYD - Ibarra (50 kW)', lat: 0.3550, lng: -78.1230, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Bolívar (Carchi)',
    aliases: ['bolivar carchi', 'bolívar carchi', 'bolivar del carchi', 'bolívar del carchi', 'carchi bolivar', 'canton bolivar carchi', 'canton bolivar'],
    distKm: 185,
    kwhEstimated: 29,
    corridor: 'norte',
    coords: { lat: 0.5011, lng: -77.9042 },
    recommendedStop: 'Centro Comercial Laguna Mall en Ibarra',
    chargerNotes: 'para viajar al Cantón Bolívar en Carchi por la Panamericana Norte E35, recarga en Laguna Mall o BYD Ibarra antes de subir la cordillera hacia Carchi.',
    chargers: [
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
      { name: 'KIA - Peaje Panavial San Gabriel Carga Ultrarrápida (100 kW)', lat: 0.5980, lng: -77.8340, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD - Supermaxi San Gabriel (50 kW)', lat: 0.5975, lng: -77.8325, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'San Gabriel',
    aliases: ['san gabriel', 'montufar', 'montúfar'],
    distKm: 200,
    kwhEstimated: 32,
    corridor: 'norte',
    coords: { lat: 0.5985, lng: -77.8353 },
    recommendedStop: 'Centro Comercial Laguna Mall en Ibarra',
    chargerNotes: 'en Ibarra tienes cargadores rápidos en el Laguna Mall sobre la Panamericana Norte antes de subir hacia Carchi.',
    chargers: [
      { name: 'KIA - Peaje Panavial San Gabriel Carga Ultrarrápida (100 kW)', lat: 0.5980, lng: -77.8340, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD - Supermaxi San Gabriel (50 kW)', lat: 0.5975, lng: -77.8325, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Tulcán',
    aliases: ['tulcan', 'tulcán', 'rumichaca', 'frontera norte'],
    distKm: 240,
    kwhEstimated: 39,
    corridor: 'norte',
    coords: { lat: 0.8123, lng: -77.717 },
    recommendedStop: 'Centro Comercial Laguna Mall en Ibarra',
    chargerNotes: 'para Tulcán es indispensable hacer una carga rápida en Ibarra antes del tramo final.',
    chargers: [
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
      { name: 'KIA - Peaje Panavial San Gabriel Carga Ultrarrápida (100 kW)', lat: 0.5980, lng: -77.8340, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
    ],
  },
  {
    name: 'Ibarra',
    aliases: ['ibarra', 'laguna de yahuarcocha', 'yahuarcocha'],
    distKm: 115,
    kwhEstimated: 18,
    corridor: 'norte',
    coords: { lat: 0.3601, lng: -78.125 },
    recommendedStop: 'Centro Comercial Laguna Mall en Ibarra o Cayambe',
    chargerNotes: 'en Ibarra tienes cargadores rápidos en el Centro Comercial Laguna Mall y en Cayambe.',
    chargers: [
      { name: 'BYD - Ibarra (50 kW)', lat: 0.3550, lng: -78.1230, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Centro Comercial Laguna Mall (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
      { name: 'Parque La Merced Ibarra (22 kW)', lat: 0.352, lng: -78.121, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Otavalo',
    aliases: ['otavalo', 'san pablo'],
    distKm: 95,
    kwhEstimated: 15,
    corridor: 'norte',
    coords: { lat: 0.2337, lng: -78.2625 },
    recommendedStop: 'Cayambe o Plaza de Ponchos',
    chargerNotes: 'en Otavalo y Cayambe cuentas con puntos de recarga rápida junto a la Panamericana.',
    chargers: [
      { name: 'Plaza de Ponchos Otavalo (22 kW)', lat: 0.2337, lng: -78.2625, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Cotacachi',
    aliases: ['cotacachi', 'cuicocha'],
    distKm: 105,
    kwhEstimated: 16,
    corridor: 'norte',
    coords: { lat: 0.2992, lng: -78.2669 },
    recommendedStop: 'Cayambe u Otavalo',
    chargerNotes: 'tienes electrolineras en Otavalo y Cayambe.',
    chargers: [
      { name: 'Plaza de Ponchos Otavalo (22 kW)', lat: 0.2337, lng: -78.2625, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Cayambe',
    aliases: ['cayambe'],
    distKm: 65,
    kwhEstimated: 10,
    corridor: 'norte',
    coords: { lat: 0.0468, lng: -78.2009 },
    recommendedStop: 'Vía Panamericana Norte',
    chargerNotes: 'en Cayambe dispones de electrolineras junto a la Panamericana.',
    chargers: [
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Atacames',
    aliases: ['atacames', 'ataca mes'],
    distKm: 350,
    kwhEstimated: 52,
    corridor: 'costa',
    coords: { lat: 0.8698, lng: -79.8459 },
    recommendedStop: 'Santo Domingo o La Concordia',
    chargerNotes: 'tienes electrolineras rápidas en Santo Domingo en el Paseo Shopping y en La Concordia.',
    chargers: [
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
      { name: 'Electrolinera La Concordia (50 kW)', lat: 0.005, lng: -79.390, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Tonsupa',
    aliases: ['tonsupa', 'ton supa'],
    distKm: 345,
    kwhEstimated: 51,
    corridor: 'costa',
    coords: { lat: 0.8872, lng: -79.8143 },
    recommendedStop: 'Santo Domingo o La Concordia',
    chargerNotes: 'te conviene parar 25 minutos en Santo Domingo antes de continuar a la playa.',
    chargers: [
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Esmeraldas',
    aliases: ['esmeraldas', 'esmeralda'],
    distKm: 340,
    kwhEstimated: 50,
    corridor: 'costa',
    coords: { lat: 0.9682, lng: -79.6517 },
    recommendedStop: 'Santo Domingo',
    chargerNotes: 'te recomendamos una recarga rápida en Santo Domingo de los Tsáchilas.',
    chargers: [
      { name: 'KIA - Primax Servi Ruiz Santo Domingo (100 kW)', lat: -0.2518, lng: -79.1758, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD Bombolí Santo Domingo (60 kW)', lat: -0.2544, lng: -79.1922, power: '60 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Mompiche',
    aliases: ['mompiche', 'monpiche'],
    distKm: 380,
    kwhEstimated: 56,
    corridor: 'costa',
    coords: { lat: 0.5072, lng: -80.0215 },
    recommendedStop: 'Santo Domingo o Pedernales',
    chargerNotes: 'recarga en Santo Domingo o Pedernales para asegurar tu llegada.',
    chargers: [
      { name: 'KIA - Primax Servi Ruiz Santo Domingo (100 kW)', lat: -0.2518, lng: -79.1758, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD Bombolí Santo Domingo (60 kW)', lat: -0.2544, lng: -79.1922, power: '60 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Pedernales',
    aliases: ['pedernales', 'cojimies', 'cojimíes'],
    distKm: 288,
    kwhEstimated: 44,
    corridor: 'costa',
    coords: { lat: 0.0698, lng: -80.0548 },
    recommendedStop: 'La Concordia o Santo Domingo',
    chargerNotes: 'puedes parar en La Concordia o en Santo Domingo para recargar.',
    chargers: [
      { name: 'Electrolinera La Concordia (50 kW)', lat: 0.005, lng: -79.390, power: '50 kW', speed: 'Rápida' },
      { name: 'KIA - Primax Servi Ruiz Santo Domingo (100 kW)', lat: -0.2518, lng: -79.1758, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD Bombolí Santo Domingo (60 kW)', lat: -0.2544, lng: -79.1922, power: '60 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Santo Domingo',
    aliases: ['santo domingo', 'santo domingo de los tsachilas', 'tsachilas'],
    distKm: 140,
    kwhEstimated: 16,
    corridor: 'costa',
    coords: { lat: -0.2528, lng: -79.1724 },
    recommendedStop: 'Alóag o Paseo Shopping Santo Domingo',
    chargerNotes: 'en Santo Domingo hay cargadores en el Paseo Shopping y estaciones de paso.',
    chargers: [
      { name: 'KIA - Primax Servi Ruiz Santo Domingo (100 kW)', lat: -0.2518, lng: -79.1758, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'BYD Bombolí Santo Domingo (60 kW)', lat: -0.2544, lng: -79.1922, power: '60 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Volcán Cotopaxi',
    aliases: ['volcan cotopaxi', 'cotopaxi volcan', 'parque nacional cotopaxi', 'refugio cotopaxi', 'volcan cotopaxio', 'cotopaxio', 'cotopaxi'],
    distKm: 75,
    kwhEstimated: 16,
    corridor: 'sur',
    coords: { lat: -0.6838, lng: -78.4372 },
    recommendedStop: 'Machachi o Lasso',
    chargerNotes: 'en la subida al Parque Nacional Cotopaxi se recomienda verificar carga en Machachi, Lasso o Latacunga.',
    chargers: [
      { name: 'Maltería Plaza Latacunga (22 kW)', lat: -0.9250, lng: -78.6100, power: '22 kW', speed: 'Semirrápida' },
      { name: 'BYD - Mall de los Andes (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    name: 'Latacunga',
    aliases: ['latacunga', 'ciudad de latacunga'],
    distKm: 90,
    kwhEstimated: 14,
    corridor: 'sur',
    coords: { lat: -0.9316, lng: -78.6155 },
    recommendedStop: 'Maltería Plaza',
    chargerNotes: 'en Latacunga cuentas con cargadores en Maltería Plaza y sobre la E35.',
    chargers: [
      { name: 'Maltería Plaza Latacunga (22 kW)', lat: -0.9250, lng: -78.6100, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Ambato',
    aliases: ['ambato'],
    distKm: 135,
    kwhEstimated: 22,
    corridor: 'sur',
    coords: { lat: -1.2491, lng: -78.6168 },
    recommendedStop: 'Mall de los Andes en Ambato',
    chargerNotes: 'en Ambato dispones de estaciones en el Mall de los Andes y la Av. Atahualpa.',
    chargers: [
      { name: 'BYD - Mall de los Andes (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Baños de Agua Santa',
    aliases: ['banos', 'baños', 'banos de agua santa', 'baños de agua santa'],
    distKm: 175,
    kwhEstimated: 27,
    corridor: 'sur',
    coords: { lat: -1.3964, lng: -78.4247 },
    recommendedStop: 'Pelileo o centro de Baños',
    chargerNotes: 'en Baños hay puntos de recarga en hoteles y restaurantes céntricos.',
    chargers: [
      { name: 'BYD - Mall de los Andes (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Riobamba',
    aliases: ['riobamba', 'riobamaba', 'chimborazo'],
    distKm: 190,
    kwhEstimated: 31,
    corridor: 'sur',
    coords: { lat: -1.6636, lng: -78.6546 },
    recommendedStop: 'Paseo Shopping Riobamba',
    chargerNotes: 'en Riobamba dispones de cargadores en el Paseo Shopping y sobre la Panamericana Sur.',
    chargers: [
      { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' },
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
      { name: 'BYD - Mall de los Andes (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    name: 'Guaranda',
    aliases: ['guaranda', 'provincia de bolivar', 'bolivar guaranda'],
    distKm: 235,
    kwhEstimated: 38,
    corridor: 'sur',
    coords: { lat: -1.5912, lng: -78.9991 },
    recommendedStop: 'Mall de los Andes en Ambato (50 kW)',
    chargerNotes: 'para viajar a Guaranda desde Quito pasas por Latacunga y Ambato, donde tienes cargadores rápidos de 50 kW en el Mall de los Andes antes de tomar el desvío hacia la provincia de Bolívar.',
    chargers: [
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
      { name: 'Maltería Plaza Latacunga (22 kW)', lat: -0.9250, lng: -78.6100, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Cuenca',
    aliases: ['cuenca', 'azuay'],
    distKm: 460,
    kwhEstimated: 75,
    corridor: 'sur',
    coords: { lat: -2.9001, lng: -79.0059 },
    recommendedStop: 'Riobamba o Ambato',
    chargerNotes: 'para Cuenca es indispensable recargar en Riobamba o Ambato antes de la subida a Cañar.',
    chargers: [
      { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' },
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Guayaquil',
    aliases: ['guayaquil', 'gye', 'samborondon', 'samborondón'],
    distKm: 420,
    kwhEstimated: 64,
    corridor: 'sur',
    coords: { lat: -2.1894, lng: -79.8891 },
    recommendedStop: 'Ambato o Riobamba, y El Triunfo',
    chargerNotes: 'para Guayaquil requieres paradas en Ambato o Riobamba y una carga en El Triunfo.',
    chargers: [
      { name: 'Electrolinera El Triunfo (50 kW)', lat: -2.327, lng: -79.405, power: '50 kW', speed: 'Rápida' },
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Manta',
    aliases: ['manta', 'tarqui', 'murcielago'],
    distKm: 396,
    kwhEstimated: 58,
    corridor: 'costa',
    coords: { lat: -0.9677, lng: -80.7089 },
    recommendedStop: 'Santo Domingo de los Tsáchilas (km 140)',
    chargerNotes: 'para Manta requieres recargar en Santo Domingo de los Tsáchilas (Paseo Shopping o KIA Servi Ruiz a 100 kW) antes de continuar hacia Manabí.',
    chargers: [
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
      { name: 'KIA - Primax Servi Ruiz Santo Domingo (100 kW)', lat: -0.2518, lng: -79.1758, power: '100 kW', speed: 'Ultrarrápida' },
      { name: 'BYD Bombolí Santo Domingo (60 kW)', lat: -0.2544, lng: -79.1922, power: '60 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Salinas',
    aliases: ['salinas', 'chipipe', 'santa elena'],
    distKm: 540,
    kwhEstimated: 82,
    corridor: 'costa',
    coords: { lat: -2.2234, lng: -80.9585 },
    recommendedStop: 'Santo Domingo de los Tsáchilas y El Triunfo',
    chargerNotes: 'requiere paradas en Santo Domingo de los Tsáchilas y en la vía hacia la península de Santa Elena.',
    chargers: [
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
      { name: 'Electrolinera El Triunfo (50 kW)', lat: -2.327, lng: -79.405, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Papallacta',
    aliases: ['papallacta', 'termas'],
    distKm: 65,
    kwhEstimated: 16,
    corridor: 'oriente',
    coords: { lat: -0.3789, lng: -78.1408 },
    recommendedStop: 'Pifo antes de la subida a la cordillera',
    chargerNotes: 'en Papallacta hay puntos en los complejos termales.',
    chargers: [
      { name: 'Estación Pifo Ruta Viva (22 kW)', lat: -0.233, lng: -78.341, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Tena',
    aliases: ['tena', 'archidona'],
    distKm: 197,
    kwhEstimated: 28,
    corridor: 'oriente',
    coords: { lat: -0.9938, lng: -77.8129 },
    recommendedStop: 'Baeza o Papallacta',
    chargerNotes: 'en la ruta oriental hay puntos de recarga en Baeza y hosterías del Tena.',
    chargers: [
      { name: 'Estación Baeza Panamericana (22 kW)', lat: -0.461, lng: -77.889, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Loja',
    aliases: ['loja', 'vilcabamba', 'catamayo'],
    distKm: 650,
    kwhEstimated: 95,
    corridor: 'sur',
    coords: { lat: -3.9971, lng: -79.202 },
    recommendedStop: 'Ambato, Riobamba y Cuenca',
    chargerNotes: 'para Loja requieres paradas en Ambato o Riobamba, Cuenca y Saraguro.',
    chargers: [
      { name: 'Mall del Río Cuenca (50 kW)', lat: -2.915, lng: -79.015, power: '50 kW', speed: 'Rápida' },
      { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Aeropuerto Internacional Mariscal Sucre (Tababela)',
    aliases: ['aeropuerto de quito', 'aeropuerto quito', 'aeropuerto uio', 'tababela', 'aeropuerto mariscal sucre', 'uio', 'puembo', 'pifo', 'conector alpachaca'],
    distKm: 42,
    kwhEstimated: 7,
    corridor: 'local',
    coords: { lat: -0.1294, lng: -78.3575 },
    recommendedStop: 'Estación Pifo Ruta Viva o Cumbayá',
    chargerNotes: 'hacia el Aeropuerto de Quito cuentas con cargadores en Pifo sobre la Ruta Viva, Cumbayá y en el conector a Tababela.',
    chargers: [
      { name: 'Cargador Rápido Aeropuerto Tababela (50 kW)', lat: -0.1294, lng: -78.3575, power: '50 kW', speed: 'Rápida' },
      { name: 'Estación Pifo Ruta Viva (22 kW)', lat: -0.2330, lng: -78.3410, power: '22 kW', speed: 'Semirrápida' },
      { name: 'BYD - Cumbayá (50 kW)', lat: -0.2030, lng: -78.4350, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Scala Shopping Cumbayá (22 kW)', lat: -0.2050, lng: -78.4380, power: '22 kW', speed: 'Semirrápida' },
      { name: 'KIA - C.C. Granados Plaza (50 kW)', lat: -0.1650, lng: -78.4720, power: '50 kW', speed: 'Rápida', operator: 'KIA' },
      { name: 'EPMMOP Av. Amazonas (50 kW)', lat: -0.1807, lng: -78.4870, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Aeropuerto Internacional José Joaquín de Olmedo (Guayaquil)',
    aliases: ['aeropuerto de guayaquil', 'aeropuerto guayaquil', 'aeropuerto jose joaquin de olmedo', 'aeropuerto olmedo', 'aeropuerto gye'],
    distKm: 418,
    kwhEstimated: 65,
    corridor: 'costa',
    coords: { lat: -2.1575, lng: -79.8836 },
    recommendedStop: 'Paseo Shopping Quevedo o Santo Domingo',
    chargerNotes: 'hacia el Aeropuerto de Guayaquil cuentas con cargadores en Mall del Sol y Terminal Terrestre adyacente.',
    chargers: [
      { name: 'Mall del Sol Guayaquil (50 kW)', lat: -2.1540, lng: -79.8920, power: '50 kW', speed: 'Rápida' },
      { name: 'BYD Mall del Sol (50 kW)', lat: -2.1540, lng: -79.8920, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    name: 'Lago Agrio (Nueva Loja)',
    aliases: ['lago agrio', 'nueva loja', 'sucumbios', 'sucumbíos'],
    distKm: 276,
    kwhEstimated: 44,
    corridor: 'oriente',
    coords: { lat: 0.0847, lng: -76.8828 },
    recommendedStop: 'Estación Baeza Panamericana (km 105)',
    chargerNotes: 'en la ruta a Lago Agrio debes detenerte en Baeza tras descender de Papallacta.',
    chargers: [
      { name: 'Estación Baeza Panamericana (22 kW)', lat: -0.461, lng: -77.889, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Estación Pifo Ruta Viva (22 kW)', lat: -0.233, lng: -78.341, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'El Coca (Francisco de Orellana)',
    aliases: ['coca', 'el coca', 'francisco de orellana', 'orellana'],
    distKm: 300,
    kwhEstimated: 48,
    corridor: 'oriente',
    coords: { lat: -0.4664, lng: -76.9878 },
    recommendedStop: 'Estación Baeza Panamericana (km 105)',
    chargerNotes: 'recarga en Baeza antes de continuar por la vía Loreto hacia El Coca.',
    chargers: [
      { name: 'Estación Baeza Panamericana (22 kW)', lat: -0.461, lng: -77.889, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Estación Pifo Ruta Viva (22 kW)', lat: -0.233, lng: -78.341, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Puyo',
    aliases: ['puyo', 'pastaza'],
    distKm: 245,
    kwhEstimated: 35,
    corridor: 'oriente',
    coords: { lat: -1.4883, lng: -77.9984 },
    recommendedStop: 'Ambato o Baños de Agua Santa',
    chargerNotes: 'en el descenso Baños-Puyo aprovechas gran regeneración de energía.',
    chargers: [
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
      { name: 'Estación Baeza Panamericana (22 kW)', lat: -0.461, lng: -77.889, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  {
    name: 'Macas',
    aliases: ['macas', 'morona santiago', 'morona'],
    distKm: 371,
    kwhEstimated: 58,
    corridor: 'sur',
    coords: { lat: -2.3087, lng: -78.1114 },
    recommendedStop: 'Megamaxi Multiplaza CONDOR CHARGE o Paseo Shopping en Riobamba (km 183)',
    chargerNotes: 'para viajar a Macas la parada estratégica indispensable es en Riobamba (km 183) donde dispones de Megamaxi Multiplaza (60 kW) y Paseo Shopping (50 kW) para cargar al 85% antes de cruzar la cordillera oriental.',
    chargers: [
      { name: 'Megamaxi Multiplaza — CONDOR CHARGE (60 kW)', lat: -1.6635, lng: -78.6543, power: '60 kW', speed: 'Rápida' },
      { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' },
      { name: 'BYD - Mall de los Andes (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    name: 'Valle de los Chillos',
    aliases: ['valle de los chillos', 'los chillos', 'sangolqui', 'sangolquí', 'san rafael', 'el triangulo'],
    distKm: 24,
    kwhEstimated: 4,
    corridor: 'local',
    coords: { lat: -0.3150, lng: -78.4500 },
    recommendedStop: 'San Luis Shopping',
    chargerNotes: 'hacia el Valle de los Chillos cuentas con cargadores en San Luis Shopping y San Rafael.',
    chargers: [
      { name: 'San Luis Shopping — Valle de los Chillos (22 kW)', lat: -0.3150, lng: -78.4500, power: '22 kW', speed: 'Semirrápida' },
      { name: 'BYD en Valle de los Chillos — San Rafael (50 kW)', lat: -0.3040, lng: -78.4510, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
    ],
  },
  {
    name: 'Puerto Quito',
    aliases: ['puerto quito', 'pto quito'],
    distKm: 140,
    kwhEstimated: 22,
    corridor: 'costa',
    coords: { lat: 0.1264, lng: -79.2558 },
    recommendedStop: 'Calacalí o Nanegalito',
    chargerNotes: 'en la vía a Puerto Quito por Calacalí-La Independencia cruzas el subtrópico.',
    chargers: [
      { name: 'Estación Nanegalito (22 kW)', lat: 0.0600, lng: -78.6800, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
];

export const CORRIDOR_CHARGERS: Record<string, { text: string; list: CopilotChargerInfo[] }> = {
  norte: {
    text: 'En la ruta norte cuentas con: 1) BYD Ibarra (50 kW rápido), 2) Centro Comercial Laguna Mall en Ibarra (50 kW rápido CCS2 y Tipo 2, a 15 min de Pimán), 3) Estación Panamericana Norte en Cayambe (50 kW rápido), y 4) Plaza de Ponchos en Otavalo (22 kW). Te recomiendo el Laguna Mall o BYD en Ibarra para una recarga rápida antes de regresar a Quito.',
    list: [
      { name: 'BYD - Ibarra (50 kW)', lat: 0.3550, lng: -78.1230, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
      { name: 'Plaza de Ponchos Otavalo (22 kW)', lat: 0.2337, lng: -78.2625, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  costa: {
    text: 'En la ruta a la Costa tienes: 1) BYD Bombolí Shopping (60 kW rápido), 2) KIA Primax Servi Ruiz (100 kW ultrarrápido), 3) Paseo Shopping Santo Domingo (50 kW rápido), y 4) Estación en La Concordia. La parada en Santo Domingo es la más estratégica para cargar al 80%.',
    list: [
      { name: 'BYD Bomboli Shopping — CONDOR CHARGE (60 kW)', lat: -0.2544, lng: -79.1922, power: '60 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'KIA - Primax  Servi Ruiz Carga Ultrarrápida (100 kW)', lat: -0.2518, lng: -79.1758, power: '100 kW', speed: 'Ultrarrápida', operator: 'KIA' },
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
      { name: 'Electrolinera La Concordia (50 kW)', lat: 0.005, lng: -79.390, power: '50 kW', speed: 'Rápida' },
    ],
  },
  sur: {
    text: 'Hacia el Sur dispones de: 1) BYD Mall de los Andes (50 kW rápido), 2) Mall de los Andes en Ambato (50 kW rápido), 3) Paseo Shopping en Riobamba, y 4) Maltería Plaza en Latacunga. Son puntos seguros junto a la Panamericana Sur.',
    list: [
      { name: 'BYD - Mall de los Andes — Electrolinera (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
      { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' },
      { name: 'Maltería Plaza Latacunga (22 kW)', lat: -0.9250, lng: -78.6100, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  oriente: {
    text: 'Hacia la Amazonía cuentas con cargadores en Pifo antes de subir a la cordillera, estaciones en Baeza y complejos turísticos en Tena.',
    list: [
      { name: 'Estación Pifo Ruta Viva (22 kW)', lat: -0.233, lng: -78.341, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Estación Baeza Panamericana (22 kW)', lat: -0.461, lng: -77.889, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  local: {
    text: 'En el Distrito Metropolitano dispones de estaciones rápidas en Cumbayá (BYD), Granados Plaza (KIA), Av. Amazonas (EPMMOP), C.C. El Recreo, Quicentro Sur y centros comerciales. Toca los pines del mapa para iniciar la navegación guiada.',
    list: [
      { name: 'BYD - Cumbayá (50 kW)', lat: -0.2030, lng: -78.4350, power: '50 kW', speed: 'Rápida', operator: 'BYD' },
      { name: 'KIA - C.C. Granados  Plaza (50 kW)', lat: -0.1650, lng: -78.4720, power: '50 kW', speed: 'Rápida', operator: 'KIA' },
      { name: 'EPMMOP Av. Amazonas (50 kW)', lat: -0.1807, lng: -78.4870, power: '50 kW', speed: 'Rápida' },
      { name: 'C.C. El Recreo (50 kW)', lat: -0.2443, lng: -78.5204, power: '50 kW', speed: 'Rápida' },
      { name: 'Quicentro Sur (50 kW)', lat: -0.2858, lng: -78.5471, power: '50 kW', speed: 'Rápida' },
      { name: 'San Luis Shopping — Valle de los Chillos (22 kW)', lat: -0.3150, lng: -78.4500, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Mall El Jardín (22 kW)', lat: -0.1934, lng: -78.4867, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Mall El Condado (22 kW)', lat: -0.0936, lng: -78.5017, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
};