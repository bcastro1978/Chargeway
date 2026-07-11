export interface UserProfile {
  weeklyKm: number;
  passengers: number;
  fuelType: 'Extra' | 'Super';
}

export interface EVModel {
  name: string;
  brand: string;
  rangeKm: number;
  batteryKwh: number;
  seats: number;
  price: number;
  description: string;
  fastCharging: boolean;
  image: string;
}

export interface AdvisorResponse {
  recommendationText: string;
  recommendedModel: EVModel | null;
  annualSavings: number;
}

const EV_DATABASE: EVModel[] = [
  {
    name: 'Dolphin',
    brand: 'BYD',
    rangeKm: 405,
    batteryKwh: 44.9,
    seats: 5,
    price: 29990,
    description: 'Excelente para ciudad, diseño compacto pero muy espacioso por dentro. Ideal para familias pequeñas o trayectos urbanos.',
    fastCharging: true,
    image: 'directions_car' // We can use Material Icon for now
  },
  {
    name: 'Model Y',
    brand: 'Tesla',
    rangeKm: 533,
    batteryKwh: 75,
    seats: 5,
    price: 44990,
    description: 'El rey de la eficiencia y tecnología. Si viajas mucho en autopista y buscas espacio para carga y 5 pasajeros cómodos.',
    fastCharging: true,
    image: 'electric_car'
  },
  {
    name: 'IONIQ 5',
    brand: 'Hyundai',
    rangeKm: 481,
    batteryKwh: 77.4,
    seats: 5,
    price: 41990,
    description: 'Diseño retro-futurista, carga ultrarrápida de 800V. Perfecto para quienes valoran el estilo y confort en viajes largos.',
    fastCharging: true,
    image: 'airport_shuttle'
  },
  {
    name: 'Kwid E-Tech',
    brand: 'Renault',
    rangeKm: 298,
    batteryKwh: 26.8,
    seats: 4,
    price: 19990,
    description: 'La opción más accesible. Ideal si viajas solo o en pareja y tus trayectos son 100% dentro de la ciudad.',
    fastCharging: false,
    image: 'local_taxi'
  }
];

export async function EVSalesAdvisorAgent(profile: UserProfile): Promise<AdvisorResponse> {
  // Simulando latencia de una API de IA
  await new Promise(resolve => setTimeout(resolve, 800));

  let recommendedModel = EV_DATABASE[0];

  // Reglas simples de recomendación basadas en pasajeros y distancia
  if (profile.passengers >= 5) {
    if (profile.weeklyKm > 300) {
      recommendedModel = EV_DATABASE.find(m => m.name === 'Model Y') || EV_DATABASE[1];
    } else {
      recommendedModel = EV_DATABASE.find(m => m.name === 'IONIQ 5') || EV_DATABASE[2];
    }
  } else if (profile.passengers <= 4) {
    if (profile.weeklyKm > 200) {
      recommendedModel = EV_DATABASE.find(m => m.name === 'Dolphin') || EV_DATABASE[0];
    } else {
      recommendedModel = EV_DATABASE.find(m => m.name === 'Kwid E-Tech') || EV_DATABASE[3];
    }
  }

  const FUEL_COST_EXTRA = 0.07; // $/km
  const FUEL_COST_SUPER = 0.11; // $/km
  const EV_COST = 0.015; // $/km
  
  const currentCostPerKm = profile.fuelType === 'Extra' ? FUEL_COST_EXTRA : FUEL_COST_SUPER;
  const annualSavings = profile.weeklyKm * 52 * (currentCostPerKm - EV_COST);

  const recommendationText = `Basado en tu recorrido semanal de **${profile.weeklyKm} km** y tu grupo familiar de **${profile.passengers} personas**, te recomiendo el **${recommendedModel.brand} ${recommendedModel.name}**.\n\nAnalizando comentarios recientes en foros de EVs, los usuarios destacan este modelo por ${recommendedModel.description.toLowerCase()} Además, al dejar de usar gasolina ${profile.fuelType}, te ahorrarías aproximadamente **$${Math.round(annualSavings).toLocaleString()} al año**, lo que ayuda a amortizar la inversión rápidamente.`;

  return {
    recommendationText,
    recommendedModel,
    annualSavings
  };
}
