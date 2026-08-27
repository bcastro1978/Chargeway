/**
 * Database of all 24 Provinces, Cantons and Interprovincial Distances in Ecuador
 */

export interface Canton {
  name: string;
  lat: number;
  lng: number;
}

export interface Provincia {
  name: string;
  cantones: Canton[];
}

export const ECUADOR_PROVINCIAS: Provincia[] = [
  {
    name: 'Azuay',
    cantones: [
      { name: 'Cuenca', lat: -2.9001, lng: -79.0059 },
      { name: 'Gualaceo', lat: -2.8917, lng: -78.7792 },
      { name: 'Paute', lat: -2.7781, lng: -78.7619 },
      { name: 'Santa Isabel', lat: -3.2750, lng: -79.3147 },
      { name: 'Sigsig', lat: -3.0500, lng: -78.7833 },
    ],
  },
  {
    name: 'Bolívar',
    cantones: [
      { name: 'Guaranda', lat: -1.5917, lng: -79.0028 },
      { name: 'Chimbo', lat: -1.6833, lng: -79.0333 },
      { name: 'San Miguel', lat: -1.7167, lng: -79.0333 },
      { name: 'Caluma', lat: -1.6333, lng: -79.2500 },
      { name: 'Echandía', lat: -1.4333, lng: -79.2833 },
    ],
  },
  {
    name: 'Cañar',
    cantones: [
      { name: 'Azogues', lat: -2.7397, lng: -78.8475 },
      { name: 'Cañar', lat: -2.5597, lng: -78.9378 },
      { name: 'La Troncal', lat: -2.4278, lng: -79.3361 },
      { name: 'Biblián', lat: -2.7167, lng: -78.8833 },
    ],
  },
  {
    name: 'Carchi',
    cantones: [
      { name: 'Tulcán', lat: 0.8117, lng: -77.7175 },
      { name: 'San Gabriel (Montúfar)', lat: 0.5983, lng: -77.8306 },
      { name: 'El Ángel (Espejo)', lat: 0.6233, lng: -77.9400 },
      { name: 'Mira', lat: 0.5500, lng: -78.0333 },
      { name: 'Huaca', lat: 0.6333, lng: -77.7167 },
    ],
  },
  {
    name: 'Chimborazo',
    cantones: [
      { name: 'Riobamba', lat: -1.6731, lng: -78.6483 },
      { name: 'Alausí', lat: -2.2000, lng: -78.8500 },
      { name: 'Guano', lat: -1.6056, lng: -78.6431 },
      { name: 'Chambo', lat: -1.7333, lng: -78.5833 },
      { name: 'Colta', lat: -1.7167, lng: -78.7500 },
      { name: 'Cumandá', lat: -2.2000, lng: -79.1333 },
    ],
  },
  {
    name: 'Cotopaxi',
    cantones: [
      { name: 'Latacunga', lat: -0.9333, lng: -78.6167 },
      { name: 'Pujilí', lat: -0.9500, lng: -78.6967 },
      { name: 'Salcedo', lat: -1.0453, lng: -78.5906 },
      { name: 'La Maná', lat: -0.9408, lng: -79.2247 },
      { name: 'Saquisilí', lat: -0.8333, lng: -78.6667 },
    ],
  },
  {
    name: 'El Oro',
    cantones: [
      { name: 'Machala', lat: -3.2581, lng: -79.9553 },
      { name: 'Pasaje', lat: -3.3256, lng: -79.8069 },
      { name: 'Santa Rosa', lat: -3.4500, lng: -79.9667 },
      { name: 'Arenillas', lat: -3.5519, lng: -80.0658 },
      { name: 'Huaquillas', lat: -3.4753, lng: -80.2319 },
      { name: 'Piñas', lat: -3.6806, lng: -79.6808 },
      { name: 'Zaruma', lat: -3.6917, lng: -79.6139 },
    ],
  },
  {
    name: 'Esmeraldas',
    cantones: [
      { name: 'Esmeraldas', lat: 0.9592, lng: -79.6569 },
      { name: 'Atacames', lat: 0.8686, lng: -79.8483 },
      { name: 'Quinindé (Rosa Zárate)', lat: 0.3278, lng: -79.4678 },
      { name: 'Muisne', lat: 0.6100, lng: -80.0194 },
      { name: 'San Lorenzo', lat: 1.2861, lng: -78.8353 },
    ],
  },
  {
    name: 'Galápagos',
    cantones: [
      { name: 'Puerto Baquerizo Moreno (San Cristóbal)', lat: -0.9017, lng: -89.6083 },
      { name: 'Puerto Ayora (Santa Cruz)', lat: -0.7439, lng: -90.3139 },
      { name: 'Puerto Villamil (Isabela)', lat: -0.9553, lng: -90.9661 },
    ],
  },
  {
    name: 'Guayas',
    cantones: [
      { name: 'Guayaquil', lat: -2.1894, lng: -79.8891 },
      { name: 'Samborondón', lat: -2.0911, lng: -79.7231 },
      { name: 'Durán', lat: -2.1706, lng: -79.8272 },
      { name: 'Milagro', lat: -2.1333, lng: -79.5833 },
      { name: 'Daule', lat: -1.8667, lng: -79.9833 },
      { name: 'Playas (General Villamil)', lat: -2.6311, lng: -80.3881 },
      { name: 'El Triunfo', lat: -2.3333, lng: -79.4167 },
      { name: 'Naranjal', lat: -2.6739, lng: -79.6186 },
    ],
  },
  {
    name: 'Imbabura',
    cantones: [
      { name: 'Ibarra', lat: 0.3517, lng: -78.1222 },
      { name: 'Otavalo', lat: 0.2333, lng: -78.2667 },
      { name: 'Cotacachi', lat: 0.3000, lng: -78.3500 },
      { name: 'Atuntaqui (Antonio Ante)', lat: 0.3333, lng: -78.2167 },
      { name: 'Pimampiro', lat: 0.3833, lng: -77.9333 },
      { name: 'Urcuquí', lat: 0.4167, lng: -78.2833 },
    ],
  },
  {
    name: 'Loja',
    cantones: [
      { name: 'Loja', lat: -3.9931, lng: -79.2042 },
      { name: 'Catamayo', lat: -3.9847, lng: -79.3581 },
      { name: 'Vilcabamba', lat: -4.2611, lng: -79.2222 },
      { name: 'Cariamanga (Calvas)', lat: -4.3267, lng: -79.5558 },
      { name: 'Macará', lat: -4.3817, lng: -79.9467 },
      { name: 'Saraguro', lat: -3.6217, lng: -79.2383 },
    ],
  },
  {
    name: 'Los Ríos',
    cantones: [
      { name: 'Babahoyo', lat: -1.8022, lng: -79.5342 },
      { name: 'Quevedo', lat: -1.0286, lng: -79.4636 },
      { name: 'Ventanas', lat: -1.4500, lng: -79.4667 },
      { name: 'Vinces', lat: -1.5556, lng: -79.7525 },
      { name: 'Buena Fe', lat: -0.8936, lng: -79.4892 },
      { name: 'Valencia', lat: -0.9500, lng: -79.3500 },
    ],
  },
  {
    name: 'Manabí',
    cantones: [
      { name: 'Manta', lat: -0.9676, lng: -80.7089 },
      { name: 'Portoviejo', lat: -1.0544, lng: -80.4544 },
      { name: 'Montecristi', lat: -1.0456, lng: -80.6589 },
      { name: 'Pedernales', lat: 0.0717, lng: -80.0528 },
      { name: 'Chone', lat: -0.6981, lng: -80.0936 },
      { name: 'Bahía de Caráquez (Sucre)', lat: -0.6000, lng: -80.4200 },
      { name: 'Jipijapa', lat: -1.3486, lng: -80.5789 },
      { name: 'Puerto López', lat: -1.5667, lng: -80.8167 },
      { name: 'El Carmen', lat: -0.2697, lng: -79.4625 },
    ],
  },
  {
    name: 'Morona Santiago',
    cantones: [
      { name: 'Macas (Morona)', lat: -2.3083, lng: -78.1167 },
      { name: 'Sucúa', lat: -2.4556, lng: -78.1714 },
      { name: 'Gualaquiza', lat: -3.4028, lng: -78.5806 },
      { name: 'Palora', lat: -1.7000, lng: -77.9667 },
    ],
  },
  {
    name: 'Napo',
    cantones: [
      { name: 'Tena', lat: -0.9936, lng: -77.8128 },
      { name: 'Archidona', lat: -0.9083, lng: -77.8081 },
      { name: 'Baeza (Quijos)', lat: -0.4633, lng: -77.8925 },
      { name: 'El Chaaco', lat: -0.3333, lng: -77.8000 },
    ],
  },
  {
    name: 'Orellana',
    cantones: [
      { name: 'Puerto Francisco de Orellana (El Coca)', lat: -0.4667, lng: -76.9833 },
      { name: 'Joyade los Sachas', lat: -0.3000, lng: -76.8500 },
      { name: 'Loreto', lat: -0.6833, lng: -77.3167 },
    ],
  },
  {
    name: 'Pastaza',
    cantones: [
      { name: 'Puyo (Pastaza)', lat: -1.4897, lng: -77.9989 },
      { name: 'Mera', lat: -1.4628, lng: -78.1106 },
      { name: 'Santa Clara', lat: -1.2667, lng: -77.8833 },
    ],
  },
  {
    name: 'Pichincha',
    cantones: [
      { name: 'Quito', lat: -0.1807, lng: -78.4678 },
      { name: 'Rumiñahui (Sangolquí)', lat: -0.3325, lng: -78.4447 },
      { name: 'Mejía (Machachi)', lat: -0.5103, lng: -78.5678 },
      { name: 'Cayambe', lat: 0.0415, lng: -78.1447 },
      { name: 'Pedro Moncayo (Tabacundo)', lat: 0.0031, lng: -78.1633 },
      { name: 'Puerto Quito', lat: 0.1303, lng: -79.2547 },
      { name: 'San Miguel de los Bancos', lat: 0.0219, lng: -78.8953 },
    ],
  },
  {
    name: 'Santa Elena',
    cantones: [
      { name: 'Salinas', lat: -2.2144, lng: -80.9514 },
      { name: 'Santa Elena', lat: -2.2267, lng: -80.8583 },
      { name: 'La Libertad', lat: -2.2333, lng: -80.9100 },
      { name: 'Montañita (Manglaralto)', lat: -1.8267, lng: -80.7533 },
    ],
  },
  {
    name: 'Santo Domingo de los Tsáchilas',
    cantones: [
      { name: 'Santo Domingo', lat: -0.2542, lng: -79.1719 },
      { name: 'La Concordia', lat: 0.0050, lng: -79.3933 },
    ],
  },
  {
    name: 'Sucumbíos',
    cantones: [
      { name: 'Nueva Loja (Lago Agrio)', lat: 0.0847, lng: -76.8828 },
      { name: 'Shushufindi', lat: -0.1833, lng: -76.6500 },
      { name: 'Cascales', lat: 0.0667, lng: -77.2500 },
      { name: 'Gonzanamá / Gonzalo Pizarro', lat: 0.0833, lng: -77.3833 },
    ],
  },
  {
    name: 'Tungurahua',
    cantones: [
      { name: 'Ambato', lat: -1.2491, lng: -78.6167 },
      { name: 'Baños de Agua Santa', lat: -1.3964, lng: -78.4247 },
      { name: 'Pelileo', lat: -1.3308, lng: -78.5447 },
      { name: 'Píllaro', lat: -1.1719, lng: -78.5369 },
      { name: 'Mocha', lat: -1.4167, lng: -78.6667 },
      { name: 'Cevallos', lat: -1.3500, lng: -78.6167 },
    ],
  },
  {
    name: 'Zamora Chinchipe',
    cantones: [
      { name: 'Zamora', lat: -4.0692, lng: -78.9567 },
      { name: 'Yantzaza', lat: -3.8333, lng: -78.7667 },
      { name: 'El Pangui', lat: -3.6167, lng: -78.5833 },
    ],
  },
];

/**
 * Pre-calculated road distances (km) between popular canton pairs in Ecuador
 */
const KNOWN_ROAD_DISTANCES: Record<string, number> = {
  'Quito|Guayaquil': 420,
  'Quito|Cuenca': 440,
  'Quito|Ambato': 135,
  'Quito|Baños de Agua Santa': 175,
  'Quito|Latacunga': 89,
  'Quito|Riobamba': 210,
  'Quito|Ibarra': 115,
  'Quito|Otavalo': 90,
  'Quito|Manta': 390,
  'Quito|Portoviejo': 375,
  'Quito|Santo Domingo': 155,
  'Quito|Tena': 190,
  'Quito|Puyo (Pastaza)': 240,
  'Quito|Loja': 650,
  'Quito|Salinas': 540,
  'Quito|Esmeraldas': 318,
  'Quito|Tulcán': 245,
  'Quito|Guaranda': 225,
  'Guayaquil|Cuenca': 195,
  'Guayaquil|Manta': 190,
  'Guayaquil|Portoviejo': 170,
  'Guayaquil|Salinas': 130,
  'Guayaquil|Santo Domingo': 285,
  'Guayaquil|Machala': 185,
  'Guayaquil|Ambato': 280,
  'Guayaquil|Babahoyo': 65,
  'Guayaquil|Quevedo': 175,
  'Ambato|Baños de Agua Santa': 40,
  'Ambato|Puyo (Pastaza)': 85,
  'Cuenca|Loja': 210,
  'Cuenca|Machala': 170,
  'Ibarra|Otavalo': 25,
};

/**
 * Haversine formula for calculating distance in km between two lat/lng points
 */
export function calculateHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  // Road factor in Ecuador mountain geography is ~1.35x straight line
  return Math.round(straightKm * 1.35);
}

/**
 * Gets real road distance between two cantons in Ecuador
 */
export function getEcuadorDistanceKm(c1: string, c2: string, lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (c1 === c2) return 15; // Intra-canton trip estimate

  const key1 = `${c1}|${c2}`;
  const key2 = `${c2}|${c1}`;

  if (KNOWN_ROAD_DISTANCES[key1]) return KNOWN_ROAD_DISTANCES[key1];
  if (KNOWN_ROAD_DISTANCES[key2]) return KNOWN_ROAD_DISTANCES[key2];

  return calculateHaversineKm(lat1, lng1, lat2, lng2);
}
