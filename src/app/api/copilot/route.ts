import { NextResponse } from 'next/server';

interface CopilotContext {
  vehicleModel?: string;
  batteryCapacityKwh?: number;
  currentSoC?: number;
  destinationCity?: string;
  ambientTempC?: number;
  currentCoords?: [number, number]; // [lng, lat]
}

interface MessageHistoryItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CopilotChargerInfo {
  name: string;
  lat: number;
  lng: number;
  power: string;
  speed: string;
}

interface CityRouteInfo {
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
const ECUADOR_ROUTES: CityRouteInfo[] = [
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
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
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
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Pedernales',
    aliases: ['pedernales', 'cojimies', 'cojimíes'],
    distKm: 270,
    kwhEstimated: 40,
    corridor: 'costa',
    coords: { lat: 0.0698, lng: -80.0548 },
    recommendedStop: 'La Concordia o Santo Domingo',
    chargerNotes: 'puedes parar en La Concordia o en Santo Domingo para recargar.',
    chargers: [
      { name: 'Electrolinera La Concordia (50 kW)', lat: 0.005, lng: -79.390, power: '50 kW', speed: 'Rápida' },
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
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Latacunga',
    aliases: ['latacunga', 'cotopaxi'],
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
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Riobamba',
    aliases: ['riobamba', 'chimborazo'],
    distKm: 190,
    kwhEstimated: 31,
    corridor: 'sur',
    coords: { lat: -1.6636, lng: -78.6546 },
    recommendedStop: 'Paseo Shopping Riobamba',
    chargerNotes: 'en Riobamba dispones de cargadores en el Paseo Shopping y sobre la Panamericana Sur.',
    chargers: [
      { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' },
      { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' },
    ],
  },
  {
    name: 'Guaranda',
    aliases: ['guaranda', 'bolivar', 'bolívar'],
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
];

const CORRIDOR_CHARGERS: Record<string, { text: string; list: CopilotChargerInfo[] }> = {
  norte: {
    text: 'En la ruta norte cuentas con: 1) Centro Comercial Laguna Mall en Ibarra (50 kW rápido CCS2 y Tipo 2, a 15 min de Pimán), 2) Estación Panamericana Norte en Cayambe (50 kW rápido), y 3) Plaza de Ponchos en Otavalo (22 kW). Te recomiendo el Laguna Mall en Ibarra para una recarga rápida antes de regresar a Quito.',
    list: [
      { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' },
      { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' },
      { name: 'Plaza de Ponchos Otavalo (22 kW)', lat: 0.2337, lng: -78.2625, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
  costa: {
    text: 'En la ruta a la Costa tienes: 1) Paseo Shopping Santo Domingo (50 kW rápido), 2) Estación de paso en La Concordia, y 3) Puntos en Quinindé y Esmeraldas. La parada en Santo Domingo es la más estratégica para cargar al 80%.',
    list: [
      { name: 'Paseo Shopping Santo Domingo (50 kW)', lat: -0.2530, lng: -79.1750, power: '50 kW', speed: 'Rápida' },
      { name: 'Electrolinera La Concordia (50 kW)', lat: 0.005, lng: -79.390, power: '50 kW', speed: 'Rápida' },
    ],
  },
  sur: {
    text: 'Hacia el Sur dispones de: 1) Maltería Plaza en Latacunga, 2) Mall de los Andes en Ambato (50 kW rápido), y 3) Paseo Shopping en Riobamba. Son puntos seguros junto a la Panamericana Sur.',
    list: [
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
    text: 'En el Distrito Metropolitano dispones de estaciones rápidas en Av. Amazonas (EPMMOP), Mall El Jardín, Mall El Condado, Quicentro Shopping y Cumbayá. Toca los pines verdes del mapa para iniciar la navegación guiada.',
    list: [
      { name: 'EPMMOP Av. Amazonas (50 kW)', lat: -0.1807, lng: -78.4870, power: '50 kW', speed: 'Rápida' },
      { name: 'Mall El Jardín (22 kW)', lat: -0.1934, lng: -78.4867, power: '22 kW', speed: 'Semirrápida' },
      { name: 'Mall El Condado (22 kW)', lat: -0.0936, lng: -78.5017, power: '22 kW', speed: 'Semirrápida' },
    ],
  },
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Cálculo Dinámico de Rutas usando Mapbox Geocoding & Directions
 */
async function calculateDynamicRoute(
  destinationName: string,
  originCoords: [number, number] = [-78.4678, -0.1807]
): Promise<{ placeName: string; distKm: number; durationText: string; corridor: string; coords: { lat: number; lng: number } } | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) return null;

  try {
    const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      destinationName + ' Ecuador'
    )}.json?country=EC&access_token=${mapboxToken}`;

    const geoRes = await fetch(geoUrl, { next: { revalidate: 86400 } });
    const geoData = await geoRes.json();
    const feature = geoData?.features?.[0];
    if (!feature) return null;

    const textNorm = normalize(feature.text || '');
    if (textNorm === 'ecuador' || feature.place_type?.includes('country')) {
      return null;
    }

    const [destLng, destLat] = feature.center;
    const placeName = feature.text || destinationName;

    // Determinar corredor según coordenadas
    let corridor = 'local';
    if (destLat > 0.1) corridor = 'norte';
    else if (destLat < -0.8) corridor = 'sur';
    else if (destLng < -78.8) corridor = 'costa';
    else if (destLng > -78.1) corridor = 'oriente';

    const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destLng},${destLat}?overview=false&access_token=${mapboxToken}`;
    const dirRes = await fetch(dirUrl);
    const dirData = await dirRes.json();
    const route = dirData?.routes?.[0];
    if (!route) return null;

    const distKm = Math.round(route.distance / 1000);
    const durationMin = Math.round(route.duration / 60);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationText = hours > 0 ? `${hours} horas y ${mins} minutos` : `${mins} minutos`;

    return { placeName, distKm, durationText, corridor, coords: { lat: destLat, lng: destLng } };
  } catch (err) {
    console.error('Dynamic routing error:', err);
    return null;
  }
}

/**
 * Extraer destino previo e información de distancia de los mensajes anteriores o del viaje activo
 */
interface ConversationalTripState {
  destName: string;
  distKm: number;
  totalDistKm?: number;
  corridor: string;
  coords: { lat: number; lng: number };
  chargers: CopilotChargerInfo[];
  deficitKm: number;
  isRoundTrip?: boolean;
}

/**
 * Extraer estado y destino previo con persistencia de contexto entre turnos de conversación
 */
function extractConversationState(
  history: MessageHistoryItem[],
  activeTrip?: any,
  context?: any
): ConversationalTripState | null {
  // 1. Prioridad: Viaje activo en el mapa
  if (activeTrip && Number(activeTrip.distanceKm) > 0) {
    const destName = activeTrip.destinationName || 'Destino';
    const isRound = !!activeTrip.isRoundTrip;
    const totalDistKm = Math.round(Number(activeTrip.distanceKm));
    const distKm = isRound ? Math.round(totalDistKm / 2) : totalDistKm;
    const norm = normalize(destName);
    const routeMatch = ECUADOR_ROUTES.find(r => r.aliases.some(a => norm.includes(a)));

    let corridor = routeMatch ? routeMatch.corridor : 'local';
    let coords = routeMatch?.coords || { lat: -0.18, lng: -78.46 };
    let chargers = routeMatch?.chargers || [];

    if (!routeMatch) {
      const dLat = Number(activeTrip.destinationLat);
      const dLng = Number(activeTrip.destinationLng);
      const hasCoords = !isNaN(dLat) && !isNaN(dLng) && (Math.abs(dLat) > 0.001 || Math.abs(dLng) > 0.001);

      if (norm.includes('lago agrio') || norm.includes('sucumbios') || norm.includes('coca') || norm.includes('tena') || norm.includes('puyo') || norm.includes('baeza') || (hasCoords && dLng > -78.1)) {
        corridor = 'oriente';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: 0.0847, lng: -76.8828 };
        chargers = CORRIDOR_CHARGERS['oriente'].list;
      } else if (norm.includes('esmeraldas') || norm.includes('atacames') || norm.includes('manta') || norm.includes('guayaquil') || norm.includes('santo domingo') || norm.includes('quevedo') || norm.includes('pedernales') || norm.includes('cojimies') || norm.includes('manabi') || norm.includes('bahia') || norm.includes('portoviejo') || norm.includes('chone') || (hasCoords && dLng < -78.8)) {
        corridor = 'costa';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: 0.0698, lng: -80.0548 };
        chargers = CORRIDOR_CHARGERS['costa'].list;
      } else if (norm.includes('cuenca') || norm.includes('loja') || norm.includes('machala') || norm.includes('riobamba') || norm.includes('ambato') || (hasCoords && dLat < -0.6)) {
        corridor = 'sur';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: -1.2491, lng: -78.6168 };
        chargers = CORRIDOR_CHARGERS['sur'].list;
      } else if (norm.includes('ibarra') || norm.includes('tulcan') || norm.includes('otavalo') || norm.includes('cayambe') || (hasCoords && dLat > 0.1 && dLng >= -78.8 && dLng <= -77.8)) {
        corridor = 'norte';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: 0.3601, lng: -78.125 };
        chargers = CORRIDOR_CHARGERS['norte'].list;
      } else {
        corridor = 'local';
        coords = hasCoords ? { lat: dLat, lng: dLng } : { lat: -0.18, lng: -78.46 };
        chargers = [];
      }
    }

    if ((!chargers || chargers.length === 0) && context?.routeChargers && context.routeChargers.length > 0) {
      chargers = context.routeChargers.filter((c: any) => {
        if (distKm > 80 && c.lat > -0.42 && c.lng > -78.52) return false;
        return true;
      });
      if (chargers.length === 0) chargers = context.routeChargers;
    }

    const deficitKm = Math.max(0, distKm - Number(context?.estimatedRangeKm || 200));

    return {
      destName,
      distKm,
      totalDistKm,
      corridor,
      coords,
      chargers,
      deficitKm,
      isRoundTrip: isRound,
    };
  }

  // 2. Prioridad: Mensajes previos en el historial (de más reciente a más antiguo)
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i] as any;
    if (msg.role === 'assistant') {
      const isMsgRoundTrip = !!msg.destination?.isRoundTrip || (msg.content && msg.content.toLowerCase().includes('ir y regresar'));
      if (msg.destination && msg.destination.name) {
        const destName = msg.destination.name;
        let distKm = msg.destination.distKm || 150;
        let totalDistKm = isMsgRoundTrip ? distKm * 2 : distKm;
        const routeCheck = ECUADOR_ROUTES.find(r => normalize(r.name) === normalize(destName) || r.aliases.some(a => normalize(destName).includes(a)));
        if (routeCheck && isMsgRoundTrip && distKm > routeCheck.distKm * 1.5) {
          totalDistKm = distKm;
          distKm = Math.round(totalDistKm / 2);
        }
        const coords = { lat: msg.destination.lat || 0, lng: msg.destination.lng || 0 };

        let corridor = 'costa';
        if (coords.lng > -78.1) corridor = 'oriente';
        else if (coords.lng < -78.8) corridor = 'costa';
        else if (coords.lat < -0.6) corridor = 'sur';
        else if (coords.lat > 0.1 && coords.lng >= -78.8 && coords.lng <= -77.8) corridor = 'norte';

        const routeMatch = ECUADOR_ROUTES.find(r => normalize(r.name) === normalize(destName) || r.aliases.some(a => normalize(destName).includes(a)));
        const catalogChargers = routeMatch?.chargers || CORRIDOR_CHARGERS[corridor]?.list || [];

        const rawChargers = msg.chargers && msg.chargers.length > 0 ? msg.chargers : catalogChargers;
        // Filtrar cargadores pegados al origen (ej. Pillajo en Quito) para viajes interurbanos
        const chargers = rawChargers.filter((c: any) => {
          if (distKm > 80 && c.lat > -0.42 && c.lng > -78.52) return false;
          return true;
        });
        const finalChargers = chargers.length > 0 ? chargers : rawChargers;
        const deficitKm = Math.max(0, distKm - Number(context?.estimatedRangeKm || 200));

        return {
          destName,
          distKm,
          corridor,
          coords,
          chargers: finalChargers,
          deficitKm,
          isRoundTrip: isMsgRoundTrip,
        };
      }

      const text = msg.content || '';
      const match = text.match(/Para viajar a (.+?) son(?: aproximadamente)? (\d+) kilómetros/i);
      if (match && match[1] && match[2]) {
        const destName = match[1].trim();
        const distKm = parseInt(match[2], 10);
        const norm = normalize(destName);

        const routeMatch = ECUADOR_ROUTES.find(r => r.aliases.some(a => norm.includes(a)));
        let corridor = routeMatch ? routeMatch.corridor : 'local';
        let coords = routeMatch?.coords || { lat: 0, lng: 0 };
        let chargers = routeMatch?.chargers || [];

        if (!routeMatch) {
          if (norm.includes('lago agrio') || norm.includes('sucumbios') || norm.includes('coca') || norm.includes('tena') || norm.includes('puyo') || norm.includes('baeza')) {
            corridor = 'oriente';
            coords = { lat: 0.0847, lng: -76.8828 };
            chargers = CORRIDOR_CHARGERS['oriente'].list;
          } else if (norm.includes('esmeraldas') || norm.includes('atacames') || norm.includes('manta') || norm.includes('guayaquil') || norm.includes('santo domingo') || norm.includes('quevedo') || norm.includes('pedernales') || norm.includes('cojimies') || norm.includes('manabi')) {
            corridor = 'costa';
            coords = { lat: 0.0698, lng: -80.0548 };
            chargers = CORRIDOR_CHARGERS['costa'].list;
          } else if (norm.includes('cuenca') || norm.includes('loja') || norm.includes('machala') || norm.includes('riobamba') || norm.includes('ambato')) {
            corridor = 'sur';
            coords = { lat: -1.2491, lng: -78.6168 };
            chargers = CORRIDOR_CHARGERS['sur'].list;
          } else if (norm.includes('ibarra') || norm.includes('tulcan') || norm.includes('otavalo') || norm.includes('cayambe')) {
            corridor = 'norte';
            coords = { lat: 0.3601, lng: -78.125 };
            chargers = CORRIDOR_CHARGERS['norte'].list;
          } else {
            corridor = 'local';
            coords = { lat: -0.18, lng: -78.46 };
            chargers = [];
          }
        }

        const deficitKm = Math.max(0, distKm - Number(context?.estimatedRangeKm || 200));

        return {
          destName,
          distKm,
          corridor,
          coords,
          chargers,
          deficitKm,
        };
      }
    }
  }

  return null;
}

// Resolución ultrarrápida de destino para sincronización previa en mapa (Caso B -> Caso A)
async function resolveDestinationFromQuery(normQuery: string): Promise<{
  name: string;
  lat: number;
  lng: number;
  distKm: number;
  isRoundTrip: boolean;
  chargers?: any[];
  corridor?: string;
  recommendedStop?: string;
} | null> {
  const isRoundTrip =
    normQuery.includes('ida y vuelta') ||
    normQuery.includes('de ida y vuelta') ||
    normQuery.includes('y regresar') ||
    normQuery.includes('y regreso') ||
    normQuery.includes('y volver') ||
    normQuery.includes('redondo');

  const destRegex = /(?:quiero ir a|quiero ir al|voy a viajar a|voy a ir a|voy a|viajar a|llegar a|para ir a|para ir al|cuanto necesito para ir a|como llego a|llego a|viaje a|hacia|ruta a)\s+([a-záéíóúñ\s]+)/i;
  const destMatch = normQuery.match(destRegex);

  let cleanCandidate = destMatch && destMatch[1] ? destMatch[1].trim() : '';
  if (cleanCandidate) {
    cleanCandidate = cleanCandidate
      .replace(/\b(de\s+)?ida\s+y\s+vuelta\b/gi, '')
      .replace(/\by\s+regres(ar|o)\b/gi, '')
      .replace(/\by\s+volver\b/gi, '')
      .replace(/\bredondo\b/gi, '')
      .replace(/^(el|la|los|las|al)\s+/i, '')
      .trim();
  }

  // 1. Buscar en catálogo ECUADOR_ROUTES
  const foundRoute = ECUADOR_ROUTES.find(r => r.aliases.some(alias => {
    const aNorm = normalize(alias);
    if (cleanCandidate && (cleanCandidate === aNorm || cleanCandidate.includes(aNorm))) return true;
    const qWords = normQuery.split(/\s+/);
    return qWords.includes(aNorm) || normQuery.includes(' ' + aNorm + ' ') || normQuery.endsWith(' ' + aNorm) || normQuery.startsWith(aNorm + ' ');
  }));

  if (foundRoute) {
    return {
      name: foundRoute.name,
      lat: foundRoute.coords.lat,
      lng: foundRoute.coords.lng,
      distKm: foundRoute.distKm,
      isRoundTrip,
      chargers: foundRoute.chargers,
      corridor: foundRoute.corridor,
      recommendedStop: foundRoute.recommendedStop,
    };
  }

  // 2. Si hay candidato no en catálogo, geocodificar dinámicamente
  let extractedDest: string | null = null;
  if (cleanCandidate && cleanCandidate.length > 2) {
    const stopWords = ['regresar', 'volver', 'carga', 'cargador', 'bateria', 'ecuador', 'donde', 'como', 'cuanto', 'kilometros', 'autonomia'];
    if (!stopWords.some(w => cleanCandidate.includes(w))) {
      extractedDest = cleanCandidate;
    }
  } else if (
    normQuery.split(/\s+/).length <= 4 &&
    !normQuery.includes('bateria') &&
    !normQuery.includes('autonomia') &&
    !normQuery.includes('carga') &&
    !normQuery.includes('regresar') &&
    !normQuery.includes('volver') &&
    !normQuery.includes('hola') &&
    !normQuery.includes('gracias')
  ) {
    extractedDest = normQuery.trim();
  }

  if (extractedDest && normalize(extractedDest) !== 'ecuador') {
    try {
      const dynamicRoute = await calculateDynamicRoute(extractedDest);
      if (dynamicRoute && dynamicRoute.distKm > 0) {
        return {
          name: dynamicRoute.placeName,
          lat: dynamicRoute.coords.lat,
          lng: dynamicRoute.coords.lng,
          distKm: dynamicRoute.distKm,
          isRoundTrip,
          corridor: dynamicRoute.corridor,
        };
      }
    } catch (err) {
      console.warn('Error en geocodificación dinámica pre-resolve:', err);
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { query, context, history, resolveOnly } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (resolveOnly) {
      const normQuery = normalize(query);
      const dest = await resolveDestinationFromQuery(normQuery);
      return NextResponse.json({ destination: dest });
    }

    const vehicle = context?.vehicleModel || 'tu auto eléctrico';
    const battery = Number(context?.batteryCapacityKwh || 38.8);
    const soc = Number(context?.currentSoC ?? 68);
    const availableKwh = battery * (soc / 100);

    // Usar la autonomía estimada exacta del dashboard si está disponible, o calcularla con WLTP / consumo
    const baseRangeKm = Number(
      context?.estimatedRangeKm ||
      (context?.wltpRangeKm ? Math.round(context.wltpRangeKm * (soc / 100)) : Math.round(availableKwh / 0.16))
    );

    const activeTrip = context?.activeTrip;
    const normQuery = normalize(query);
    const historyList: MessageHistoryItem[] = Array.isArray(history) ? history : [];
    const prevTrip = extractConversationState(historyList, activeTrip, context);

    // =========================================================================
    // INTENTO 1: Preguntas sobre amenidades / Qué hacer mientras carga
    // =========================================================================
    if (
      normQuery.includes('hacer mientras') ||
      normQuery.includes('mientras carga') ||
      normQuery.includes('mientras recarga') ||
      normQuery.includes('que hacer') ||
      normQuery.includes('actividades') ||
      normQuery.includes('comer') ||
      normQuery.includes('almorzar') ||
      normQuery.includes('cafe') ||
      normQuery.includes('cafeteria') ||
      normQuery.includes('restaurante') ||
      normQuery.includes('amenidades')
    ) {
      const reply = `Mientras tu auto se recarga, puedes aprovechar al máximo tu tiempo. En la pestaña Carga y Disfruta de cada estación encontrarás opciones a pocos pasos: cafeterías con internet para trabajar, restaurantes para almorzar y comercios para hacer compras mientras el vehículo completa su carga rápida.`;
      return NextResponse.json({ reply, provider: 'chargeway_expert_nlp' });
    }

    // =========================================================================
    // INTENTO 2.1: ¿Cuál electrolinera y por cuánto tiempo? (Tiempo y Estación Recomendada)
    // Resuelve la secuencia de conversación: "cual electrolinera y por cuanto tiempo",
    // "donde recargo y cuantos minutos", "cuanto tiempo debo cargar", "a que porcentaje cargo"
    // =========================================================================
    const isStationAndTimeQuery =
      (normQuery.includes('tiempo') && (normQuery.includes('electrolinera') || normQuery.includes('cargador') || normQuery.includes('cargar') || normQuery.includes('recargar') || normQuery.includes('estacion') || normQuery.includes('donde') || normQuery.includes('cual'))) ||
      (normQuery.includes('cuanto tiempo')) ||
      (normQuery.includes('cuantos minutos')) ||
      (normQuery.includes('por cuanto tiempo')) ||
      (normQuery.includes('a que porcentaje')) ||
      (normQuery.includes('cual electrolinera')) ||
      (normQuery.includes('en cual me detengo')) ||
      (normQuery.includes('en cual paro')) ||
      (normQuery.includes('donde me detengo'));

    if (isStationAndTimeQuery && prevTrip) {
      const isOutboundSafe = baseRangeKm >= prevTrip.distKm * 0.9;
      // Filtrar cargadores pegados al origen (ej. a menos de 25 km de Quito) si el viaje es interurbano
      let eligibleChargers = (prevTrip.chargers || []).filter(c => {
        if (prevTrip.distKm > 80 && c.lat > -0.42 && c.lng > -78.52) return false;
        return true;
      });

      const primaryCharger = eligibleChargers[0] || prevTrip.chargers?.[0] || {
        name: prevTrip.corridor === 'oriente' ? 'Estación Baeza Panamericana (22 kW)' : 'Estación en la ruta (50 kW)',
        lat: prevTrip.corridor === 'oriente' ? -0.461 : 0.0468,
        lng: prevTrip.corridor === 'oriente' ? -77.889 : -78.2009,
        power: prevTrip.corridor === 'oriente' ? '22 kW' : '50 kW',
        speed: 'Semirrápida'
      };

      const currentKwh = availableKwh;
      const neededKwhForTrip = prevTrip.distKm * 0.16;
      const safetyBufferKwh = battery * 0.20;
      const totalKwhTarget = neededKwhForTrip + safetyBufferKwh;
      const deficitKwh = Math.max(8, Math.min(battery * 0.65, totalKwhTarget - currentKwh));

      const isDc = primaryCharger.power.includes('50') || primaryCharger.power.includes('90') || primaryCharger.power.includes('60') || primaryCharger.speed?.toLowerCase().includes('ráp');
      const effectiveRateKw = isDc ? 35 : 6.6;
      const minutesNeeded = Math.round((deficitKwh / effectiveRateKw) * 60);
      const targetSoc = Math.min(85, Math.round(soc + (deficitKwh / battery) * 100));

      let reply = '';
      if (isOutboundSafe) {
        reply = `Para tu viaje a ${prevTrip.destName}, tu nivel de batería actual del ${soc} por ciento (~${baseRangeKm} km en tu ${vehicle}) te permite llegar directo a la ida con suficiente margen. La recarga no debes hacerla al salir de Quito, sino al llegar a tu destino en la ${primaryCharger.name} (o en Ambato durante el regreso). Te sugiero recargar durante aproximadamente ${minutesNeeded} a ${minutesNeeded + 10} minutos para salir con el ${targetSoc} por ciento y tener reserva garantizada para volver a Quito. ¿Deseas que añada esta estación a tu ruta en el mapa?`;
      } else {
        let corridorAdvice = '';
        if (prevTrip.corridor === 'oriente') {
          corridorAdvice = `Está en el kilómetro 105, justo tras descender del paso de Papallacta. Desde allí hacia ${prevTrip.destName} la vía es en su mayoría de bajada, por lo que el consumo se reduce notablemente gracias a la regeneración.`;
        } else if (prevTrip.corridor === 'costa') {
          corridorAdvice = `Es la parada más estratégica antes de adentrarse en el litoral, con restaurantes y servicios mientras completas la recarga.`;
        } else if (prevTrip.corridor === 'norte') {
          corridorAdvice = `Cuenta con cargador rápido y servicios comerciales para que recargues cómodamente antes de tu destino.`;
        } else {
          corridorAdvice = `Ubicada estratégicamente sobre la vía principal para optimizar tu tiempo de viaje.`;
        }
        reply = `Para tu viaje a ${prevTrip.destName}, te recomiendo detenerte en la ${primaryCharger.name}. ${corridorAdvice} Para tu ${vehicle}, te sugiero recargar durante aproximadamente ${minutesNeeded} a ${minutesNeeded + 10} minutos para subir tu batería al ${targetSoc} por ciento (recuperando unos ${deficitKwh.toFixed(1)} kWh). Con eso llegarás a ${prevTrip.destName} con más del 20 por ciento de reserva garantizada. ¿Deseas que añada esta estación a tu ruta en el mapa?`;
      }

      return NextResponse.json({
        reply,
        provider: 'chargeway_expert_advisor',
        action: 'add_waypoint',
        waypoint: {
          name: primaryCharger.name,
          lat: primaryCharger.lat,
          lng: primaryCharger.lng,
          power: primaryCharger.power,
        },
        chargers: eligibleChargers.length > 0 ? eligibleChargers : prevTrip.chargers,
        destination: prevTrip.coords ? {
          name: prevTrip.destName,
          lat: prevTrip.coords.lat,
          lng: prevTrip.coords.lng,
          distKm: prevTrip.distKm,
          isRoundTrip: prevTrip.isRoundTrip
        } : undefined
      });
    }

    // =========================================================================
    // INTENTO 2.15: Consulta de Costo de Recarga
    // =========================================================================
    const isCostQuery =
      normQuery.includes('cuesta') ||
      normQuery.includes('costar') ||
      normQuery.includes('costo') ||
      normQuery.includes('precio') ||
      normQuery.includes('cuanto vale') ||
      normQuery.includes('tarifa') ||
      normQuery.includes('gratis');

    if (isCostQuery && prevTrip) {
      const neededKwh = Math.min(18, Math.max(6, (prevTrip.distKm - baseRangeKm) * 0.16 + 5));
      const estCostUsd = (neededKwh * 0.18).toFixed(2);
      const reply = `En Ecuador, el costo promedio de recarga en electrolineras públicas oscila entre $0.14 y $0.22 por kilovatio hora (y en varios centros comerciales como Laguna Mall o Plaza de Ponchos es incluso gratuita o bonificada por consumo). Para tu viaje a ${prevTrip.destName}, recuperar los ${neededKwh.toFixed(1)} kWh que necesitas te costará aproximadamente entre $1.50 y $${estCostUsd} dólares, comparado con más de $15 dólares que gastaría un auto de gasolina en ese mismo tramo.`;

      return NextResponse.json({
        reply,
        provider: 'chargeway_expert_advisor',
        chargers: prevTrip.chargers,
        destination: prevTrip.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng, distKm: prevTrip.distKm } : undefined
      });
    }

    // =========================================================================
    // INTENTO 2.16: Velocidad de Conducción y Eficiencia
    // =========================================================================
    const isSpeedEfficiencyQuery =
      normQuery.includes('velocidad') ||
      normQuery.includes('rapido') ||
      normQuery.includes('conducir') ||
      normQuery.includes('manejar') ||
      normQuery.includes('eficiencia') ||
      normQuery.includes('modo eco');

    if (isSpeedEfficiencyQuery && prevTrip) {
      const reply = `Para maximizar la autonomía de tu ${vehicle} en el trayecto a ${prevTrip.destName}: 1) En tramos planos y autopistas mantén una velocidad de crucero constante entre 80 y 90 km/h en Modo ECO (superar los 100 km/h incrementa el consumo aerodinámico hasta un 25%). 2) En las subidas de cordillera mantén un ritmo fluido sin aceleraciones bruscas. 3) En las bajadas aprovecha el nivel de regeneración alto para recuperar entre un 10% y 15% de batería.`;

      return NextResponse.json({
        reply,
        provider: 'chargeway_expert_advisor',
        chargers: prevTrip.chargers,
        destination: prevTrip.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng, distKm: prevTrip.distKm } : undefined
      });
    }

    // =========================================================================
    // INTENTO 2.17: Topografía / Elevación / Desnivel
    // =========================================================================
    const isElevationQuery =
      normQuery.includes('subida') ||
      normQuery.includes('bajada') ||
      normQuery.includes('elevacion') ||
      normQuery.includes('montana') ||
      normQuery.includes('montaña') ||
      normQuery.includes('altura') ||
      normQuery.includes('altitud') ||
      normQuery.includes('curvas') ||
      normQuery.includes('cordillera');

    if (isElevationQuery && prevTrip) {
      let topographyText = '';
      if (prevTrip.corridor === 'oriente') {
        topographyText = `La ruta hacia ${prevTrip.destName} inicia ascendiendo desde Quito hasta el Paso de la Virgen en Papallacta a más de 4,000 metros de altitud (tramo de alta exigencia donde verás bajar la batería más rápido). Sin embargo, a partir de Papallacta y Baeza inicias un descenso continuo de más de 3,000 metros de desnivel hacia la llanura amazónica, donde tu motor eléctrico recargará energía por frenado regenerativo.`;
      } else if (prevTrip.corridor === 'costa') {
        topographyText = `La ruta hacia ${prevTrip.destName} asciende ligeramente hasta Alóag y luego experimenta un prolongado descenso de más de 2,200 metros de desnivel hacia Santo Domingo y la costa ecuatoriana, permitiendo recuperar batería en los descensos.`;
      } else if (prevTrip.corridor === 'norte') {
        topographyText = `El trayecto hacia ${prevTrip.destName} transcurre por los valles andinos intermedios (Guayllabamba, Otavalo e Ibarra) con desniveles moderados entre 2,200m y 2,800m.`;
      } else {
        topographyText = `El trayecto recorre el callejón interandino con oscilaciones de altitud entre 2,500m y 3,200m.`;
      }

      return NextResponse.json({
        reply: topographyText,
        provider: 'chargeway_expert_advisor',
        chargers: prevTrip.chargers,
        destination: prevTrip.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng, distKm: prevTrip.distKm } : undefined
      });
    }

    // =========================================================================
    // INTENTO 2: Consulta de Puntos de Carga / Electrolineras / Dónde recargar
    // =========================================================================
    const isSafetyOrHowTo =
      normQuery.includes('precauci') ||
      normQuery.includes('seguridad') ||
      normQuery.includes('peligr') ||
      normQuery.includes('lluvia') ||
      normQuery.includes('mojad') ||
      normQuery.includes('mojar') ||
      normQuery.includes('rayo') ||
      normQuery.includes('tormenta') ||
      normQuery.includes('como funciona') ||
      normQuery.includes('por que') ||
      normQuery.includes('porque');

    const isChargerQuery =
      !isSafetyOrHowTo &&
      (normQuery.includes('puntos de carga') ||
      normQuery.includes('punto de carga') ||
      normQuery.includes('donde recargar') ||
      normQuery.includes('donde cargar') ||
      normQuery.includes('donde puedo cargar') ||
      normQuery.includes('cargadores en la ruta') ||
      normQuery.includes('que cargadores') ||
      normQuery.includes('cargadores disponibles') ||
      normQuery.includes('electrolineras en la ruta') ||
      normQuery.includes('que electrolineras') ||
      normQuery.includes('estacion de carga') ||
      normQuery.includes('estaciones de carga') ||
      normQuery.includes('acceder a carga') ||
      normQuery.includes('donde hay carga') ||
      ((normQuery.includes('cargador') || normQuery.includes('electrolinera')) &&
       (normQuery.includes('donde') || normQuery.includes('cuales') || normQuery.includes('hay') || normQuery.includes('lista'))));

    if (isChargerQuery) {
      let corridor = prevTrip?.corridor || 'norte';
      let matchedRoute = prevTrip ? ECUADOR_ROUTES.find(r => r.name === prevTrip.destName) : undefined;

      for (const route of ECUADOR_ROUTES) {
        if (route.aliases.some(a => normQuery.includes(a))) {
          corridor = route.corridor;
          matchedRoute = route;
          break;
        }
      }

      const corridorData = CORRIDOR_CHARGERS[corridor] || CORRIDOR_CHARGERS['norte'];
      const destPrefix = prevTrip?.destName ? `Para tu viaje hacia ${prevTrip.destName}: ` : '';
      const reply = `${destPrefix}${corridorData.text} Puedes tocar cualquiera de ellos en el mapa para iniciar la navegación guiada.`;

      const chargers = prevTrip?.chargers && prevTrip.chargers.length > 0
        ? prevTrip.chargers
        : (matchedRoute?.chargers || corridorData.list);
      const destination = prevTrip?.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng, distKm: prevTrip.distKm } : undefined;

      return NextResponse.json({
        reply,
        provider: 'chargeway_expert_nlp',
        destination,
        chargers,
      });
    }

    // =========================================================================
    // INTENTO 2.2: Armar Ruta / Incluir Puntos o Paradas Intermedias en la Ruta
    // Ejemplos: "incluye los puntos en la ruta", "incluye lso puntos en la ruta",
    // "agrega las paradas", "agrega el cargador a la ruta", "arma la ruta con cargadores",
    // "agrega parada en laguna mall", "pon el cargador", "añadir a la ruta"
    // =========================================================================
    const isAddStopQuery =
      normQuery.includes('incluye') ||
      normQuery.includes('incluir') ||
      normQuery.includes('agrega') ||
      normQuery.includes('agregar') ||
      normQuery.includes('arma la ruta') ||
      normQuery.includes('armar la ruta') ||
      normQuery.includes('añade') ||
      normQuery.includes('añadir') ||
      normQuery.includes('pon la parada') ||
      normQuery.includes('poner parada') ||
      normQuery.includes('inserta') ||
      normQuery.includes('adicionar');

    const mentionsPointsOrStops =
      normQuery.includes('punto') ||
      normQuery.includes('puntos') ||
      normQuery.includes('parada') ||
      normQuery.includes('paradas') ||
      normQuery.includes('cargador') ||
      normQuery.includes('cargadores') ||
      normQuery.includes('electrolinera') ||
      normQuery.includes('estacion') ||
      normQuery.includes('estaciones') ||
      normQuery.includes('laguna mall') ||
      normQuery.includes('cayambe') ||
      normQuery.includes('otavalo') ||
      normQuery.includes('en la ruta') ||
      normQuery.includes('a la ruta') ||
      normQuery.includes('lso puntos') ||
      normQuery.includes('los puntos');

    if (
      (isAddStopQuery && mentionsPointsOrStops) ||
      normQuery.includes('incluye los puntos') ||
      normQuery.includes('incluye lso puntos') ||
      normQuery.includes('agrega los puntos') ||
      normQuery.includes('agrega los cargadores') ||
      normQuery.includes('incluye las paradas')
    ) {
      let selectedCharger: CopilotChargerInfo | null = null;

      // 1. Detectar si el usuario mencionó un cargador específico por nombre
      if (normQuery.includes('laguna mall') || normQuery.includes('laguna') || normQuery.includes('ibarra')) {
        selectedCharger = { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' };
      } else if (normQuery.includes('cayambe')) {
        selectedCharger = { name: 'Panamericana Norte Cayambe (50 kW)', lat: 0.0468, lng: -78.2009, power: '50 kW', speed: 'Rápida' };
      } else if (normQuery.includes('otavalo') || normQuery.includes('ponchos')) {
        selectedCharger = { name: 'Plaza de Ponchos Otavalo (22 kW)', lat: 0.2337, lng: -78.2625, power: '22 kW', speed: 'Semirrápida' };
      } else if (normQuery.includes('riobamba') || normQuery.includes('paseo shopping')) {
        selectedCharger = { name: 'Paseo Shopping Riobamba (50 kW)', lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' };
      } else if (normQuery.includes('ambato') || normQuery.includes('mall de los andes')) {
        selectedCharger = { name: 'Mall de los Andes Ambato (50 kW)', lat: -1.2580, lng: -78.6250, power: '50 kW', speed: 'Rápida' };
      }

      // 2. Si no mencionó uno específico, seleccionar el mejor cargador rápido disponible
      if (!selectedCharger) {
        if (context?.routeChargers && context.routeChargers.length > 0) {
          const fast = context.routeChargers.find((c: any) => c.power?.includes('50') || c.speed?.toLowerCase().includes('ráp') || (parseInt(c.power) || 0) >= 22);
          const pick = fast || context.routeChargers[0];
          selectedCharger = {
            name: pick.name,
            lat: pick.lat,
            lng: pick.lng,
            power: pick.power || '50 kW',
            speed: pick.speed || 'Rápida'
          };
        } else if (prevTrip?.chargers && prevTrip.chargers.length > 0) {
          selectedCharger = prevTrip.chargers[0];
        } else {
          selectedCharger = { name: 'Laguna Mall Ibarra (50 kW)', lat: 0.3601, lng: -78.125, power: '50 kW', speed: 'Rápida' };
        }
      }

      const destName = prevTrip?.destName || activeTrip?.destinationName || 'tu destino';
      const reply = `¡Entendido! He añadido la estación ${selectedCharger.name} como parada de recarga intermedia en tu ruta hacia ${destName}. El mapa ha actualizado automáticamente el trayecto trazando el desvío a la electrolinera y recalculando tu batería para que viajes con total seguridad.`;

      const chargersList = prevTrip?.chargers || (selectedCharger ? [selectedCharger] : []);

      return NextResponse.json({
        reply,
        provider: 'chargeway_expert_nlp',
        action: 'add_waypoint',
        waypoint: {
          name: selectedCharger.name,
          lat: selectedCharger.lat,
          lng: selectedCharger.lng,
          power: selectedCharger.power
        },
        chargers: chargersList,
        destination: prevTrip?.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng, distKm: prevTrip.distKm } : undefined
      });
    }

    // =========================================================================
    // INTENTO 2.5: Consulta de Batería o Margen al Llegar ("¿Con cuánto llegaría?", "¿Con qué porcentaje llego?")
    // =========================================================================
    const isArrivalSocQuery =
      normQuery.includes('con cuanto') ||
      normQuery.includes('con que porcentaje') ||
      normQuery.includes('con cuanta bateria') ||
      normQuery.includes('cuanto llegaria') ||
      normQuery.includes('cuanto llego') ||
      normQuery.includes('me queda al llegar') ||
      normQuery.includes('alcanzo a llegar') ||
      normQuery.includes('con que carga') ||
      normQuery.includes('nivel de llegada');

    if (isArrivalSocQuery) {
      // 0. Si hay un viaje activo en el mapa y la consulta se refiere a ese viaje o a su estación recomendada
      if (
        activeTrip &&
        (
          normQuery.includes('paseo shopping') ||
          normQuery.includes('riobamba') ||
          normQuery.includes('destino') ||
          normQuery.includes('cargador') ||
          normQuery.includes(normalize(activeTrip.destinationName || '')) ||
          normQuery.includes(normalize(activeTrip.recommendedChargerName || '')) ||
          normQuery === 'con cuanto llego' ||
          normQuery === 'con cuanto llegaria' ||
          normQuery === 'con que porcentaje llego' ||
          normQuery === 'cuanto llego'
        )
      ) {
        const destName = activeTrip.destinationName || 'Riobamba';
        const chargerName = activeTrip.recommendedChargerName || 'Paseo Shopping Riobamba';
        const arrivalSoc = activeTrip.arrivalSoc;
        const distKm = activeTrip.distanceKm;
        const consumptionKwh = activeTrip.consumptionKwh;
        const remainingKm = activeTrip.arrivalRangeKm ?? Math.round((baseRangeKm * arrivalSoc) / 100);

        let reply = '';
        if (arrivalSoc >= 20) {
          reply = `Para tu viaje a ${destName} (${distKm} kilómetros según el mapa), tu consumo estimado es de ${consumptionKwh} kilovatios hora. Con tu nivel actual del ${soc} por ciento (${baseRangeKm} kilómetros de autonomía en tu ${vehicle}), llegarías con un ${arrivalSoc} por ciento de batería (unos ${remainingKm} kilómetros de reserva), completando el trayecto con buen margen de seguridad.`;
        } else if (arrivalSoc > 0) {
          reply = `Para tu viaje a ${destName} (${distKm} kilómetros según el mapa), consumirás unos ${consumptionKwh} kilovatios hora por el desnivel de la cordillera. Con tu nivel del ${soc} por ciento (${baseRangeKm} kilómetros de autonomía en tu ${vehicle}), sí llegas directo a ${chargerName}, pero con un ${arrivalSoc} por ciento de batería restante (unos ${remainingKm} kilómetros de reserva). Al estar por debajo del margen de seguridad del 20 por ciento, el sistema califica el viaje como crítico y te recomienda conectar la recarga rápida en ${chargerName} al llegar.`;
        } else {
          reply = `Para la ruta a ${destName} (${distKm} kilómetros), tu consumo sería de ${consumptionKwh} kilovatios hora. Con tu ${soc} por ciento (${baseRangeKm} kilómetros de autonomía) no te alcanzaría para llegar directo; te quedarías sin carga antes de la meta. Es obligatorio recargar en una estación intermedia como ${chargerName}.`;
        }

        return NextResponse.json({
          reply,
          provider: 'chargeway_active_trip_synced',
          destination: { name: destName, lat: -1.6636, lng: -78.6546, distKm },
          chargers: [
            { name: chargerName, lat: -1.6550, lng: -78.6650, power: '50 kW', speed: 'Rápida' }
          ]
        });
      }

      // 1. Buscar si mencionó un destino o cargador específico en la consulta
      let targetRoute = ECUADOR_ROUTES.find(r =>
        r.aliases.some(alias => normQuery.includes(alias))
      );

      let targetDistKm = targetRoute ? targetRoute.distKm : prevTrip?.distKm;
      let targetName = targetRoute ? targetRoute.name : prevTrip?.destName;
      let targetCoords = targetRoute ? targetRoute.coords : prevTrip?.coords;
      let targetChargers = targetRoute ? targetRoute.chargers : prevTrip?.chargers;

      // Si no se encontró en catálogo ni en prevTrip, extraer el lugar de la frase
      if (!targetDistKm) {
        const placeMatch = normQuery.match(/(?:a|hacia|en|para)\s+([a-z\s]+?)(?:\s+con|\s+cuanto|\s+llego|\s*$)/i);
        if (placeMatch && placeMatch[1]) {
          const candidate = placeMatch[1].trim();
          if (candidate.length > 2 && candidate !== 'ecuador') {
            const dynamicRoute = await calculateDynamicRoute(candidate);
            if (dynamicRoute) {
              targetDistKm = dynamicRoute.distKm;
              targetName = dynamicRoute.placeName;
              targetCoords = dynamicRoute.coords;
            }
          }
        }
      }

      if (targetDistKm && targetName) {
        const consumedKwh = targetDistKm * 0.16;
        const consumedSocPct = Math.round((consumedKwh / battery) * 100);
        const arrivalSocPct = Math.max(0, soc - consumedSocPct);
        const remainingRangeKm = Math.max(0, baseRangeKm - targetDistKm);

        let reply = '';
        if (arrivalSocPct > 0) {
          reply = `A ${targetName} (${targetDistKm} kilómetros) llegarías con aproximadamente un ${arrivalSocPct} por ciento de batería (unos ${remainingRangeKm} kilómetros de autonomía de reserva en tu ${vehicle}). Estarás en un margen óptimo para conectar el cargador rápido de 50 kW y subir al 80 por ciento en unos 25 minutos.`;
        } else {
          const deficitKm = targetDistKm - baseRangeKm;
          reply = `Para llegar a ${targetName} (${targetDistKm} kilómetros) tu nivel actual del ${soc} por ciento (${baseRangeKm} kilómetros) no te alcanzaría directo. Te faltarían unos ${deficitKm} kilómetros de autonomía, por lo que es indispensable recargar en una estación intermedia en la ruta.`;
        }

        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_nlp',
          destination: targetCoords ? { name: targetName, lat: targetCoords.lat, lng: targetCoords.lng, distKm: targetDistKm } : undefined,
          chargers: targetChargers,
        });
      }
    }

    // =========================================================================
    // INTENTO 3 / 5: Detectar Ciudad o Destino de Viaje (Ida simple o Ida y Vuelta)
    // Se evalúa prioritariamente para que un nuevo destino (ej. Guaranda) no sea
    // ignorado por el contexto previo (ej. Lago Agrio).
    // =========================================================================
    const destRegex = /(?:quiero ir a|voy a viajar a|voy a ir a|voy a|viajar a|llegar a|para ir a|cuanto necesito para ir a|como llego a|llego a|viaje a|hacia|ruta a)\s+([a-záéíóúñ\s]+)/i;
    const destMatch = normQuery.match(destRegex);

    const isRoundTrip =
      normQuery.includes('ida y vuelta') ||
      normQuery.includes('de ida y vuelta') ||
      normQuery.includes('y regresar') ||
      normQuery.includes('y regreso') ||
      normQuery.includes('y volver') ||
      normQuery.includes('redondo');

    let cleanCandidate = destMatch && destMatch[1] ? destMatch[1].trim() : '';
    if (cleanCandidate) {
      cleanCandidate = cleanCandidate
        .replace(/\b(de\s+)?ida\s+y\s+vuelta\b/gi, '')
        .replace(/\by\s+regres(ar|o)\b/gi, '')
        .replace(/\by\s+volver\b/gi, '')
        .replace(/\bredondo\b/gi, '')
        .trim();
    }

    const isExplicitTravelQuery =
      destMatch !== null ||
      normQuery.startsWith('a ') ||
      normQuery.startsWith('hacia ') ||
      normQuery.startsWith('para ir') ||
      normQuery.startsWith('llego a') ||
      normQuery.split(/\s+/).length <= 3;

    // Buscar si coincide con el catálogo de rutas de Ecuador
    let foundRoute = ECUADOR_ROUTES.find(r => r.aliases.some(alias => {
      const aNorm = normalize(alias);
      if (cleanCandidate && (cleanCandidate === aNorm || cleanCandidate.includes(aNorm))) return true;
      const qWords = normQuery.split(/\s+/);
      return qWords.includes(aNorm) || normQuery.includes(' ' + aNorm + ' ') || normQuery.endsWith(' ' + aNorm) || normQuery.startsWith(aNorm + ' ');
    }));

    let extractedDest: string | null = null;
    if (!foundRoute) {
      if (cleanCandidate && cleanCandidate.length > 2) {
        const stopWords = ['regresar', 'volver', 'carga', 'cargador', 'bateria', 'ecuador', 'donde', 'como'];
        if (!stopWords.some(w => cleanCandidate.includes(w))) {
          extractedDest = cleanCandidate;
        }
      } else if (
        normQuery.split(/\s+/).length <= 4 &&
        !normQuery.includes('bateria') &&
        !normQuery.includes('autonomia') &&
        !normQuery.includes('carga') &&
        !normQuery.includes('regresar') &&
        !normQuery.includes('volver') &&
        !normQuery.includes('hola') &&
        !normQuery.includes('gracias')
      ) {
        extractedDest = normQuery.trim();
      }
    }

    // -------------------------------------------------------------------------
    // Caso A: Coincidencia con Catálogo Predefinido (ej. Guaranda, Lago Agrio, Ibarra)
    // -------------------------------------------------------------------------
    if (foundRoute) {
      // Prioridad de distancia: si el usuario ya tiene la ruta activa en el mapa, usar la distancia exacta de Mapbox
      let oneWayKm = foundRoute.distKm;
      if (activeTrip && Number(activeTrip.distanceKm) > 0) {
        oneWayKm = activeTrip.isRoundTrip ? Math.round(Number(activeTrip.distanceKm) / 2) : Math.round(Number(activeTrip.distanceKm));
      } else {
        try {
          const dynamic = await calculateDynamicRoute(foundRoute.name);
          if (dynamic && dynamic.distKm > 0) {
            oneWayKm = dynamic.distKm;
          }
        } catch (e) {
          // fallback a foundRoute.distKm
        }
      }

      const totalKm = activeTrip && Number(activeTrip.distanceKm) > 0 && activeTrip.isRoundTrip
        ? Math.round(Number(activeTrip.distanceKm))
        : oneWayKm * 2;
      const destination = {
        name: foundRoute.name,
        lat: foundRoute.coords.lat,
        lng: foundRoute.coords.lng,
        distKm: oneWayKm,
        isRoundTrip: isRoundTrip,
      };

      const isDeficit = (baseRangeKm - oneWayKm) <= 0 || (activeTrip && activeTrip.arrivalSoc < 20);

      // Clarificar ciudad si el cargador es de paso en Santo Domingo, Cañar o Ambato
      let stopDisplay = activeTrip?.recommendedChargerName || foundRoute.recommendedStop;
      if (foundRoute.corridor === 'costa' && (stopDisplay.includes('Servi Ruiz') || stopDisplay.includes('Bombolí')) && !stopDisplay.toLowerCase().includes('santo domingo')) {
        stopDisplay = `${stopDisplay} en Santo Domingo`;
      }

      // Priorizar cargadores intermedios alcanzables y filtrar cargadores en el destino final si no hay carga suficiente
      const candidateChargers = (context?.routeChargers && context.routeChargers.length > 0)
        ? context.routeChargers
        : foundRoute.chargers;

      const eligibleChargers = isDeficit && destination.lat && destination.lng
        ? candidateChargers.filter((c: any) => {
            const dLat = (c.lat - destination.lat) * 111;
            const dLng = (c.lng - destination.lng) * 111;
            const distToDest = Math.sqrt(dLat * dLat + dLng * dLng);
            return distToDest > 25; // Excluir cargadores ubicados en el propio destino final al que no se llega
          })
        : candidateChargers;

      const finalChargers = eligibleChargers.length > 0 ? eligibleChargers : candidateChargers;

      if (isRoundTrip) {
        const remainingRangeAtDest = baseRangeKm - oneWayKm;

        let reply = '';
        if (remainingRangeAtDest <= 0) {
          const deficitKm = oneWayKm - baseRangeKm;
          reply = `Para ir y regresar de ${foundRoute.name} son aproximadamente ${totalKm} kilómetros en total (${oneWayKm} km por tramo). Con tus ${baseRangeKm} kilómetros actuales (${soc} por ciento en tu ${vehicle}) te faltarían unos ${deficitKm} kilómetros para llegar directo a la ida. Necesitas recargar en ${stopDisplay} antes de llegar a ${foundRoute.name}. ¿Deseas ver las estaciones de carga en la ruta?`;
        } else if (remainingRangeAtDest < oneWayKm || (activeTrip && activeTrip.arrivalSoc < 20)) {
          reply = `Para ir y regresar de ${foundRoute.name} son aproximadamente ${totalKm} kilómetros en total (${oneWayKm} km por tramo). Con tu nivel actual del ${soc} por ciento (${baseRangeKm} kilómetros de autonomía) llegas a ${foundRoute.name} a la ida con unos ${remainingRangeAtDest} kilómetros de reserva, pero no podrás regresar directo sin recargar. Necesitarás hacer una recarga en ${stopDisplay} antes de emprender el retorno. ¿Deseas que te indique los puntos de carga recomendados?`;
        } else {
          const surplusKm = baseRangeKm - totalKm;
          reply = `Con tus ${baseRangeKm} kilómetros de autonomía (${soc} por ciento) dispones de suficiente batería en tu ${vehicle} para la ida y vuelta completa a ${foundRoute.name} (${totalKm} kilómetros en total), quedándote aún ${surplusKm} kilómetros de margen.`;
        }

        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_nlp',
          destination,
          chargers: finalChargers,
        });
      }

      // Viaje de solo ida con catálogo
      if (baseRangeKm < oneWayKm || (activeTrip && activeTrip.arrivalSoc <= 0)) {
        const deficitKm = oneWayKm - baseRangeKm;
        const reply = `Para viajar a ${foundRoute.name} son aproximadamente ${oneWayKm} kilómetros de viaje. Con tu nivel del ${soc} por ciento en tu ${vehicle} dispones de ${availableKwh.toFixed(1)} kilovatios hora (unos ${baseRangeKm} kilómetros de autonomía). Te faltarían unos ${deficitKm} kilómetros para llegar directo, por lo que te recomiendo una parada de recarga rápida en ${stopDisplay}.`;
        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_nlp',
          destination,
          chargers: finalChargers,
        });
      } else {
        const surplusKm = baseRangeKm - oneWayKm;
        const arrivalSocInfo = activeTrip && activeTrip.arrivalSoc !== undefined ? ` (llegarías con aproximadamente un ${activeTrip.arrivalSoc} por ciento de batería)` : '';
        const reply = `Para viajar a ${foundRoute.name} son aproximadamente ${oneWayKm} kilómetros. Con tu nivel actual del ${soc} por ciento tienes unos ${baseRangeKm} kilómetros disponibles en tu ${vehicle}, por lo que llegas directamente con un margen de ${surplusKm} kilómetros de reserva${arrivalSocInfo}.`;
        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_nlp',
          destination,
          chargers: finalChargers,
        });
      }
    }

    // -------------------------------------------------------------------------
    // Caso B: Consulta Dinámica en Mapbox para destinos no catalogados
    // -------------------------------------------------------------------------
    if (extractedDest && extractedDest.length > 2 && normalize(extractedDest) !== 'ecuador') {
      const dynamicRoute = await calculateDynamicRoute(extractedDest);
      if (dynamicRoute && dynamicRoute.distKm > 0) {
        const { placeName, distKm, durationText, corridor, coords } = dynamicRoute;
        const corridorData = CORRIDOR_CHARGERS[corridor] || CORRIDOR_CHARGERS['local'];

        const destination = {
          name: placeName,
          lat: coords.lat,
          lng: coords.lng,
          distKm,
          isRoundTrip: isRoundTrip,
        };

        if (isRoundTrip) {
          const oneWayKm = distKm;
          const totalKm = oneWayKm * 2;
          const remainingRangeAtDest = baseRangeKm - oneWayKm;

          let reply = '';
          if (remainingRangeAtDest <= 0) {
            const deficitKm = oneWayKm - baseRangeKm;
            reply = `Para ir y regresar de ${placeName} son aproximadamente ${totalKm} kilómetros en total (${oneWayKm} km por tramo, unas ${durationText} por sentido). Con tus ${baseRangeKm} kilómetros actuales (${soc} por ciento) no te alcanza para llegar directo a la ida. Te faltarían unos ${deficitKm} kilómetros de autonomía, por lo que es indispensable recargar en una estación intermedia. ¿Deseas ver las estaciones de carga en la ruta?`;
          } else if (remainingRangeAtDest < oneWayKm) {
            reply = `Para ir y regresar de ${placeName} son aproximadamente ${totalKm} kilómetros en total (${oneWayKm} km por tramo). Con tu nivel actual del ${soc} por ciento (${baseRangeKm} kilómetros de autonomía) llegas a ${placeName} a la ida con unos ${remainingRangeAtDest} kilómetros de reserva, pero no podrás regresar directo sin recargar. Necesitarás recargar en una electrolinera antes de emprender el retorno.`;
          } else {
            const surplusKm = baseRangeKm - totalKm;
            reply = `Con tus ${baseRangeKm} kilómetros de autonomía (${soc} por ciento) dispones de suficiente batería para la ida y vuelta completa a ${placeName} (${totalKm} kilómetros), quedándote aún ${surplusKm} kilómetros de margen.`;
          }

          return NextResponse.json({
            reply,
            provider: 'chargeway_dynamic_mapbox',
            destination,
            chargers: corridorData.list,
          });
        }

        if (baseRangeKm < distKm) {
          const deficitKm = distKm - baseRangeKm;
          const reply = `Para viajar a ${placeName} son aproximadamente ${distKm} kilómetros (unas ${durationText}). Con tu ${soc} por ciento de batería en tu ${vehicle} dispones de ${availableKwh.toFixed(1)} kilovatios hora (${baseRangeKm} kilómetros de autonomía). Te faltarían unos ${deficitKm} kilómetros para llegar directo, por lo que te recomiendo hacer una parada de recarga rápida en una electrolinera en la ruta.`;
          return NextResponse.json({
            reply,
            provider: 'chargeway_dynamic_mapbox',
            destination,
            chargers: corridorData.list,
          });
        } else {
          const surplusKm = baseRangeKm - distKm;
          const reply = `Para viajar a ${placeName} son aproximadamente ${distKm} kilómetros (unas ${durationText}). Con tu nivel del ${soc} por ciento tienes ${baseRangeKm} kilómetros disponibles en tu ${vehicle}, por lo que llegas directamente con un margen de ${surplusKm} kilómetros de reserva.`;
          return NextResponse.json({
            reply,
            provider: 'chargeway_dynamic_mapbox',
            destination,
            chargers: corridorData.list,
          });
        }
      }
    }

    // =========================================================================
    // INTENTO 3.5: Consulta de Retorno / Regreso del DESTINO PREVIO
    // Solo se activa si el usuario NO planteó un dilema o pregunta compleja
    // Ejemplos: "y para regresar?", "me alcanza para volver?", "y la vuelta?"
    // =========================================================================
    const isDecisionOrAdviceQuery =
      normQuery.includes(' o ') ||
      normQuery.includes(' a la ') ||
      normQuery.includes('por que') ||
      normQuery.includes('porque') ||
      normQuery.includes('donde') ||
      normQuery.includes('cuando') ||
      normQuery.includes('conviene') ||
      normQuery.includes('puedo') ||
      normQuery.includes('se puede') ||
      normQuery.includes('sola carga') ||
      normQuery.includes('solo una') ||
      normQuery.includes('parada adicional') ||
      normQuery.includes('puntos de parada');

    const isReturnTripQuery =
      !isDecisionOrAdviceQuery &&
      (normQuery.includes('regresar') ||
       normQuery.includes('regreso') ||
       normQuery.includes('volver') ||
       normQuery.includes('retorno') ||
       normQuery.includes('de vuelta') ||
       normQuery.includes('ida y vuelta'));

    if (isReturnTripQuery && prevTrip) {
      const oneWayKm = prevTrip.distKm;
      const totalKm = prevTrip.totalDistKm || oneWayKm * 2;
      const remainingRangeAtDest = baseRangeKm - oneWayKm;
      const destination = prevTrip.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng, distKm: oneWayKm, isRoundTrip: true } : undefined;
      const corridorData = CORRIDOR_CHARGERS[prevTrip.corridor || 'norte'] || CORRIDOR_CHARGERS['norte'];
      const stopStationName = prevTrip.chargers?.[0]?.name || corridorData.list?.[0]?.name || `en ${prevTrip.destName}`;

      if (remainingRangeAtDest <= 0) {
        const reply = `Para ir y regresar de ${prevTrip.destName} son aproximadamente ${totalKm} kilómetros en total (${oneWayKm} km por tramo). Con tus ${baseRangeKm} kilómetros actuales (${soc} por ciento) no te alcanza para llegar directo a la ida. Necesitas recargar en una estación intermedia como ${stopStationName}. ¿Deseas que añada esta parada en tu ruta?`;
        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_nlp',
          destination,
          chargers: prevTrip.chargers || corridorData.list,
        });
      } else if (remainingRangeAtDest < oneWayKm) {
        const reply = `Para ir y regresar de ${prevTrip.destName} son aproximadamente ${totalKm} kilómetros en total (${oneWayKm} km por sentido). Al llegar a ${prevTrip.destName} te quedarán unos ${remainingRangeAtDest} kilómetros de reserva, por lo que no podrás regresar directo sin recargar. Necesitarás hacer una recarga estratégica en ${stopStationName} antes de la subida de retorno a Quito. ¿Deseas que te indique los puntos de carga recomendados?`;
        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_nlp',
          destination,
          chargers: prevTrip.chargers || corridorData.list,
        });
      } else {
        const reply = `Con tus ${baseRangeKm} kilómetros de autonomía (${soc} por ciento) dispones de suficiente batería para la ida y vuelta completa a ${prevTrip.destName} (${totalKm} kilómetros en total), quedándote aún ${baseRangeKm - totalKm} kilómetros de margen.`;
        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_nlp',
          destination,
        });
      }
    }

    // =========================================================================
    // INTENTO 4: Respuestas afirmativas de seguimiento ("si", "claro", "por favor", "dale", "ok", "si agrégala")
    // =========================================================================
    const isAffirmative = /^(si|claro|por favor|dale|porfa|busca|ok|de una|bueno|yes|mostrar|ver|agrega|anade)/i.test(normQuery);
    if (isAffirmative && prevTrip) {
      const primaryCharger = prevTrip.chargers?.[0];
      if (primaryCharger) {
        // Evitar duplicar si en el historial de esta conversación ya se agregó esta misma estación
        const alreadyAddedInHistory = historyList.some(h =>
          h.role === 'assistant' && (h.content || '').includes(`He añadido la estación ${primaryCharger.name}`)
        );

        if (alreadyAddedInHistory) {
          const reply = `La estación ${primaryCharger.name} ya está incluida como parada de recarga en tu ruta a ${prevTrip.destName}. ¿Tienes alguna otra consulta sobre tu recorrido o autonomía?`;
          return NextResponse.json({
            reply,
            provider: 'chargeway_expert_advisor',
            chargers: prevTrip.chargers,
            destination: prevTrip.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng } : undefined
          });
        }

        const reply = `¡Perfecto! He añadido la estación ${primaryCharger.name} como parada de recarga en tu ruta a ${prevTrip.destName}. El mapa se ha actualizado con el trayecto completo.`;
        return NextResponse.json({
          reply,
          provider: 'chargeway_expert_advisor',
          action: 'add_waypoint',
          waypoint: {
            name: primaryCharger.name,
            lat: primaryCharger.lat,
            lng: primaryCharger.lng,
            power: primaryCharger.power,
          },
          chargers: prevTrip.chargers,
          destination: prevTrip.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng } : undefined
        });
      }

      const corridorData = CORRIDOR_CHARGERS[prevTrip.corridor || 'norte'] || CORRIDOR_CHARGERS['norte'];
      const reply = `¡De acuerdo! Para tu trayecto a ${prevTrip.destName}: ${corridorData.text}`;
      return NextResponse.json({
        reply,
        provider: 'chargeway_expert_nlp',
        destination: prevTrip.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng } : undefined,
        chargers: prevTrip.chargers || corridorData.list,
      });
    }

    // =========================================================================
    // INTENTO 6: Preguntas generales de autonomía o estado de batería
    // =========================================================================
    if (normQuery.includes('autonomia') || normQuery.includes('kilometros') || normQuery.includes('bateria') || normQuery.includes('cuanta carga')) {
      const reply = `Con tu nivel de batería al ${soc} por ciento dispones de ${availableKwh.toFixed(1)} kilovatios hora, lo que equivale aproximadamente a ${baseRangeKm} kilómetros de autonomía en tu ${vehicle}.`;
      return NextResponse.json({ reply, provider: 'chargeway_expert_nlp' });
    }

    // =========================================================================
    // INTENTO 7: Agente Generativo Gemini AI (gemini-3.6-flash / gemini-flash-latest)
    // Responde a cualquier pregunta abierta, conversacional o de razonamiento con IA real
    // =========================================================================
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const totalDist = prevTrip?.totalDistKm || (prevTrip?.distKm ? prevTrip.distKm * (prevTrip.isRoundTrip ? 2 : 1) : undefined);
        const distInfo = totalDist ? `${totalDist} km total (${prevTrip?.distKm} km por tramo)` : (prevTrip ? `${prevTrip.distKm} km` : '');
        const destContext = prevTrip ? `Destino de viaje activo: ${prevTrip.destName} (${distInfo}). Corredor: ${prevTrip.corridor}. Tipo de viaje: ${prevTrip.isRoundTrip ? 'Ida y Vuelta (Retorno)' : 'Solo Ida'}. Estaciones sugeridas: ${prevTrip.chargers?.map(c => c.name).join(', ')}.` : '';

        const systemPrompt = `Eres el copiloto inteligente y asesor técnico experto de ChargeWay para vehículos eléctricos en Ecuador.
Vehículo del conductor: ${vehicle}.
Capacidad neta de batería: ${battery.toFixed(1)} kWh (Usa estrictamente este valor, NUNCA inventes otra capacidad como 38 kWh).
Nivel de batería actual: ${soc}% (${availableKwh.toFixed(1)} kWh disponibles, aprox. ${baseRangeKm} km de autonomía).
${destContext}

Reglas Físicas, Topográficas y de Consumo en Ecuador (OBLIGATORIAS):
1. Topografía de Cordillera Andina:
   - De Quito (2.850 msnm) hacia la Amazonía (Tena 510 msnm, Puyo) o hacia la Costa (Pedernales, Santo Domingo) el trayecto de IDA tiene un descenso prolongado donde el auto recupera energía por frenado regenerativo.
   - ¡PERO AL RETORNAR desde la Amazonía o Costa hacia la Sierra (Quito/Ambato/Cuenca), el vehículo debe SUBIR miles de metros de desnivel positivo (+3.500 m pasando por pasos de montaña como Papallacta a 4.064 msnm o Alóag a 3.200 msnm)!
   - En el RETORNO el consumo se duplica drásticamente y NO hay frenado regenerativo en la subida.
2. Cargar a la ida vs. al regreso:
   - Si el conductor pregunta si debe cargar "a la ida o al regreso" o si alcanza con "una sola carga":
     Explica con claridad técnica: A la ida llegas con margen holgado porque vas en descenso hacia el oriente/costa. La recarga estratégica de refuerzo (ej. en Baeza o Santo Domingo) DEBE HACERSE PARA EL RETORNO (antes o durante el ascenso a la cordillera) para asegurar que la batería soporte la exigente trepada hasta la cumbre y Quito.
3. Si pregunta por qué hay paradas o puntos adicionales en el mapa:
   - Explica de forma calmada que son las paradas intermedias de recarga sugeridas para no quedarse sin batería en la cordillera.
4. Consistencia de Distancias:
   - Usa estrictamente las distancias proporcionadas en el contexto (${distInfo || 'según el mapa activo'}). No inventes kilometrajes diferentes.
5. Tono y Formato:
   - Responde de forma natural, humana, amigable y muy concisa (máximo 2 a 3 oraciones), directo al grano sin introducciones vacías, diseñado para lectura por síntesis de voz (TTS) mientras se conduce.`;

        const geminiMessages = [
          ...historyList.slice(-6).map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          })),
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nPregunta del conductor: "${query}"` }] }
        ];

        // Modelos de alto rendimiento y disponibilidad inmediata con fallback
        const targetModels = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
        let rawText = '';
        let usedModel = '';

        for (const modelName of targetModels) {
          try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: geminiMessages }),
              signal: AbortSignal.timeout(5000)
            });

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (candidateText && candidateText.trim().length > 5) {
                rawText = candidateText.trim();
                usedModel = modelName;
                break;
              }
            }
          } catch (modelErr) {
            // Continúa al siguiente modelo de respaldo
          }
        }

        if (rawText && rawText.length > 5) {
          return NextResponse.json({
            reply: rawText,
            provider: usedModel,
            destination: prevTrip?.coords ? { name: prevTrip.destName, lat: prevTrip.coords.lat, lng: prevTrip.coords.lng, distKm: prevTrip.distKm } : undefined,
            chargers: prevTrip?.chargers,
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini runtime fallback:', geminiErr);
      }
    }

    // =========================================================================
    // INTENTO 8: Fallback conversacional instructivo
    // =========================================================================
    const reply = `Tienes un ${soc} por ciento de batería con unos ${baseRangeKm} kilómetros de autonomía disponibles en tu ${vehicle}. Puedes preguntarme sobre tu destino (ej. ¿Llego a San Gabriel o a Pimán?), si te alcanza para regresar, o qué puntos de carga hay en la ruta.`;
    return NextResponse.json({ reply, provider: 'chargeway_expert_nlp' });

  } catch (err: any) {
    console.error('Copilot API error:', err);
    return NextResponse.json({
      reply: 'Disculpa, ocurrió un error al procesar tu consulta. Por favor intenta de nuevo.',
      error: err.message,
    }, { status: 500 });
  }
}
