// Coordenadas aproximadas para capitales de provincia y cantones principales
export const CANTON_COORDS: Record<string, [number, number]> = {
  // Pichincha
  PI01: [-0.2295, -78.5243], PI02: [0.0440, -78.1358], PI03: [-0.5025, -78.5549],
  PI04: [0.0766, -78.2665], PI05: [-0.3352, -78.4475], PI06: [0.0397, -78.9492],
  PI07: [0.0614, -79.2142], PI08: [-0.1098, -79.5756],
  // Guayas
  GU01: [-2.1894, -79.8890], GU06: [-1.8608, -79.9844], GU07: [-2.2000, -79.8300],
  GU08: [-0.9733, -79.6251], GU10: [-2.1344, -79.5900], GU13: [-1.9756, -79.8289],
  GU15: [-2.6333, -80.3833], GU16: [-2.1167, -79.7167], GU19: [-1.8458, -79.7279],
  GU20: [-2.0992, -79.6831], GU24: [-1.9372, -80.1519],
  // Azuay
  AZ01: [-2.9004, -79.0045], AZ02: [-3.1586, -79.1419], AZ03: [-2.8921, -78.7750],
  AZ05: [-2.7765, -78.7648], AZ08: [-3.2681, -79.4069], AZ09: [-3.0620, -78.8351],
  // Tungurahua
  TU01: [-1.2543, -78.6269], TU02: [-1.3961, -78.4248], TU03: [-1.3569, -78.5997],
  TU07: [-1.3303, -78.5373], TU08: [-1.1839, -78.5394], TU09: [-1.3645, -78.6567],
  // Chimborazo
  CH01: [-1.6635, -78.6543], CH02: [-2.1966, -78.8461], CH03: [-1.7406, -78.7894],
  CH05: [-2.2922, -78.9133], CH06: [-2.0593, -78.7195], CH10: [-2.1949, -79.1219],
  // Cotopaxi
  CO01: [-0.9340, -78.6152], CO02: [-0.9329, -79.2274], CO04: [-0.9596, -78.6961],
  CO05: [-1.0499, -78.5972], CO06: [-0.8403, -78.6671],
  // Imbabura
  IM01: [0.3517, -78.1222], IM02: [0.3374, -78.2207], IM03: [0.3024, -78.2676],
  IM04: [0.2346, -78.2615], IM05: [0.3999, -77.9378],
  // Carchi
  CR01: [0.8118, -77.7172], CR03: [0.7990, -77.9358], CR04: [0.5879, -78.0277],
  CR05: [0.5842, -77.8248],
  // Manabí
  MA01: [-1.0547, -80.4545], MA03: [-0.7006, -80.0997], MA04: [-0.3021, -79.8987],
  MA07: [-0.9319, -80.2013], MA08: [-0.9677, -80.7089], MA09: [-1.0455, -80.6613],
  MA11: [-0.0742, -80.0583], MA13: [-0.9219, -80.4519], MA16: [-0.5932, -80.2387],
  MA22: [-0.5649, -80.3979],
  // El Oro
  EO01: [-3.2581, -79.9554], EO04: [-3.8208, -79.8100], EO07: [-3.4765, -80.2298],
  EO09: [-3.3214, -79.8018], EO10: [-3.6766, -79.6960], EO12: [-3.4583, -79.9614],
  EO13: [-3.6888, -79.6165],
  // Loja
  LO01: [-3.9931, -79.2042], LO02: [-4.6300, -79.2900], LO03: [-3.9954, -79.4672],
  LO07: [-4.2249, -79.4517], LO08: [-4.3665, -79.9468], LO09: [-4.3814, -79.6595],
  LO12: [-3.5972, -79.0833], LO14: [-4.2765, -80.1168],
  // Los Ríos
  LR01: [-1.8014, -79.5342], LR02: [-1.8058, -79.8800], LR05: [-1.0225, -79.4683],
  LR06: [-1.6887, -79.7297], LR07: [-1.4461, -79.4613], LR08: [-1.5604, -79.7585],
  LR10: [-0.8874, -79.4567], LR11: [-0.9961, -79.3756],
  // Esmeraldas
  ES01: [0.9592, -79.6538], ES02: [0.8725, -79.8465], ES05: [0.3213, -79.4726],
  ES07: [1.2842, -78.8330],
  // Santo Domingo
  SD01: [-0.2521, -79.1716], SD02: [0.0017, -79.3895],
  // Santa Elena
  SE01: [-2.2257, -80.8604], SE02: [-2.2295, -80.9059], SE03: [-2.2170, -80.9537],
  // Morona Santiago
  MO01: [-2.3101, -78.1175], MO02: [-3.4208, -78.5625], MO11: [-2.4567, -78.1650],
  // Napo
  NA01: [-0.9892, -77.8153], NA02: [-0.9060, -77.8033], NA03: [-0.2961, -77.8060],
  NA05: [-1.0589, -77.6111],
  // Pastaza
  PA01: [-1.4924, -77.9950], PA02: [-1.2379, -77.8888], PA03: [-1.4581, -78.1131],
  // Orellana
  OR01: [-0.4619, -76.9868], OR03: [-0.2942, -76.8643], OR04: [-0.6671, -77.2914],
  // Sucumbíos
  SU01: [0.0867, -76.8827], SU02: [0.0606, -76.9946], SU06: [-0.1878, -76.6439],
  // Zamora Chinchipe
  ZC01: [-4.0668, -78.9545], ZC02: [-4.7981, -78.8474], ZC04: [-3.7060, -78.6710],
  ZC08: [-3.8192, -78.7552],
  // Bolívar
  BO01: [-1.5939, -78.9965], BO03: [-1.6785, -79.0675], BO05: [-1.7053, -79.0311],
  // Cañar
  CA01: [-2.7393, -78.8465], CA02: [-2.7143, -78.8795], CA03: [-2.5633, -78.9394],
  CA04: [-2.4275, -79.3675], CA05: [-2.5193, -78.8977],
  // Galápagos
  GA01: [-0.9063, -89.6117], GA02: [-0.7538, -90.3325], GA03: [-0.9739, -90.9670],
};

// Fallback por provincia (capital)
export const PROV_CAPITAL_COORDS: Record<string, [number, number]> = {
  AZ: [-2.9004, -79.0045], BO: [-1.5939, -78.9965], CA: [-2.7393, -78.8465],
  CR: [0.8118, -77.7172],  CH: [-1.6635, -78.6543], CO: [-0.9340, -78.6152],
  ES: [0.9592, -79.6538],  GA: [-0.7538, -90.3325], GU: [-2.1894, -79.8890],
  IM: [0.3517, -78.1222],  LO: [-3.9931, -79.2042], LR: [-1.8014, -79.5342],
  MA: [-1.0547, -80.4545], MO: [-2.3101, -78.1175], NA: [-0.9892, -77.8153],
  OR: [-0.4619, -76.9868], PA: [-1.4924, -77.9950], PI: [-0.2295, -78.5243],
  SD: [-0.2521, -79.1716], SE: [-2.2257, -80.8604], SU: [0.0867, -76.8827],
  TU: [-1.2543, -78.6269], ZC: [-4.0668, -78.9545], EO: [-3.2581, -79.9554],
};

/** Distancia haversine en km (línea recta) */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Clasificación de provincias por región
const HIGHLANDS = new Set(['AZ', 'BO', 'CA', 'CR', 'CH', 'CO', 'IM', 'PI', 'TU']);
const COSTA     = new Set(['EO', 'ES', 'GU', 'LR', 'MA', 'SE', 'SD']);
const AMAZONIA  = new Set(['MO', 'NA', 'OR', 'PA', 'SU', 'ZC']);

/**
 * Factor de carretera por tipo de ruta en Ecuador.
 * 
 * Basado en distancias reales vs línea recta:
 *  - Sierra ↔ Costa (cruce de Andes oeste):   1.65  ej. Quito→Guayaquil real=435km, recta=265km
 *  - Sierra ↔ Sierra (valles interandinos):    1.55  ej. Quito→Cuenca real=450km, recta=300km
 *  - Costa  ↔ Costa (vía costera/panamericana): 1.25 ej. Guayaquil→Manta real=190km, recta=150km
 *  - Sierra ↔ Amazonía (cruce de Andes este):  1.70  ej. Quito→Tena real=185km, recta=105km
 *  - Costa  ↔ Amazonía (travesía completa):    1.90
 *  - Amazonia ↔ Amazonia:                      1.60
 *  - Galápagos:                                 1.10
 */
export function roadFactor(provA: string, provB: string): number {
  if (provA === provB) return 1.20; // mismo provincia

  const aH = HIGHLANDS.has(provA), aC = COSTA.has(provA), aAm = AMAZONIA.has(provA);
  const bH = HIGHLANDS.has(provB), bC = COSTA.has(provB), bAm = AMAZONIA.has(provB);

  if (provA === 'GA' || provB === 'GA') return 1.10;
  if (aH && bH) return 1.55;
  if (aC && bC) return 1.25;
  if (aAm && bAm) return 1.60;
  if ((aH && bC) || (aC && bH)) return 1.65;
  if ((aH && bAm) || (aAm && bH)) return 1.70;
  if ((aC && bAm) || (aAm && bC)) return 1.90;
  return 1.50; // default
}

/** Distancia de ruta estimada en km */
export function routeDistanceKm(
  origenProv: string, origenCanton: string,
  destinoProv: string, destinoCanton: string
): number {
  const [lat1, lon1] = CANTON_COORDS[origenCanton] ?? PROV_CAPITAL_COORDS[origenProv] ?? [0, 0];
  const [lat2, lon2] = CANTON_COORDS[destinoCanton] ?? PROV_CAPITAL_COORDS[destinoProv] ?? [0, 0];
  if (lat1 === 0 && lon1 === 0) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const straight = haversineKm(lat1, lon1, lat2, lon2);
  return Math.round(straight * roadFactor(origenProv, destinoProv));
}

/**
 * Specs EV por tipo de vehículo.
 * 
 * Consumo: medido en kWh/100km (condiciones reales Ecuador, incluye altitud).
 * Autonomía: rango real estimado en condiciones de conducción mixta Ecuador.
 * Factor altitud: Ecuador sierra consume ~10% más por resistencia al aire enrarecido
 *   y uso de calefacción/defroster compensado por frenado regenerativo.
 * 
 * Fuentes de referencia: BYD (la marca más vendida en Ecuador), Tesla, Chevrolet Equinox EV.
 */
export interface EvSpec {
  consumoKwhPor100km: number;
  rangeKm: number;
  label: string;
}

export const EV_SPECS: Record<string, EvSpec> = {
  // BYD Seal, Tesla Model 3, MG4, Chevrolet Equinox EV
  'Sedán Mediano':  { consumoKwhPor100km: 16, rangeKm: 450, label: 'Sedán' },
  // BYD Atto 3, Tesla Model Y, Haval Jolion EV
  'SUV (Grande)':   { consumoKwhPor100km: 21, rangeKm: 380, label: 'SUV Grande' },
  // Rivian R1T, Ford F-150 Lightning — segmento emergente en Ecuador
  'Pickup EV':      { consumoKwhPor100km: 26, rangeKm: 320, label: 'Pickup' },
  // BYD Dolphin, Nissan Leaf, Renault Zoe
  'Hatchback EV':   { consumoKwhPor100km: 14, rangeKm: 300, label: 'Hatchback' },
};

/** 
 * Consumo típico de gasolina en Ecuador por tipo de vehículo (gal/100km).
 * Fuente: INEN, datos de consumo real en carretera Ecuador.
 * 1 galón US = 3.785 litros.
 *   Sedán: ~10 L/100km = 2.64 gal/100km
 *   SUV:   ~13 L/100km = 3.43 gal/100km
 *   Pickup: ~15 L/100km = 3.96 gal/100km
 *   Hatchback: ~9 L/100km = 2.38 gal/100km
 */
export const CONSUMO_GAS_DEFAULT: Record<string, number> = {
  'Sedán Mediano': 2.6,
  'SUV (Grande)':  3.5,
  'Pickup EV':     4.0,
  'Hatchback EV':  2.4,
};

/** 
 * Factor de emisión CO2 gasolina: 8.887 kg CO2 por galón US (EPA estándar).
 * Factor de emisión CO2 electricidad Ecuador: ~0.085 kg CO2/kWh 
 *   (matriz eléctrica Ecuador 2024: ~76% renovable, principalmente hidro).
 */
export const CO2_PER_GALON_KG = 8.887;     // EPA
export const CO2_PER_KWH_KG   = 0.085;     // Ecuador ARCONEL 2024

/** Tarifa eléctrica residencial/comercial Ecuador */
export const TARIFA_KWH = 0.10; // USD/kWh
