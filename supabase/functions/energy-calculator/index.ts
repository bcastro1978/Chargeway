import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { route, vehicleSpecs, soc } = await req.json();

    if (!route || !vehicleSpecs || soc === undefined) {
      throw new Error('Missing required payload: route, vehicleSpecs, soc');
    }

    // 1. Física Básica
    const vehicleWeight = vehicleSpecs.weight_kg || 1800; // Peso promedio EV
    const cD = vehicleSpecs.drag_coefficient || 0.28;
    const baseConsumption = vehicleSpecs.battery_capacity_kwh / vehicleSpecs.wltp_range_km; // kWh/km

    let totalEnergyKwh = 0;
    
    // Simplificación del cálculo físico para la Edge Function
    for (let i = 1; i < route.length; i++) {
      const p1 = route[i-1];
      const p2 = route[i];
      
      // Distancia (haversine omitida aquí para simplicidad, asumiendo que ya viene calculada o usamos aproximación)
      const distKm = 1.0; // dummy distance for now, should calculate using Haversine
      const elevDiff = (p2.elevation || 0) - (p1.elevation || 0); // en metros
      
      let energyForSegment = baseConsumption * distKm;
      
      // Energía Potencial: E = m * g * h
      if (elevDiff > 0) {
        // Subida: Mayor consumo
        const extraEnergy = (vehicleWeight * 9.8 * elevDiff) / 3600000; // Julios a kWh
        energyForSegment += extraEnergy;
      } else if (elevDiff < 0) {
        // Bajada: Frenado Regenerativo (asumimos 60% de eficiencia)
        const regenEnergy = (vehicleWeight * 9.8 * Math.abs(elevDiff)) / 3600000;
        energyForSegment -= regenEnergy * 0.6;
      }
      
      totalEnergyKwh += energyForSegment;
    }

    // Calcular el SoC final
    const batteryCapacity = vehicleSpecs.battery_capacity_kwh;
    const currentEnergy = batteryCapacity * soc;
    const remainingEnergy = currentEnergy - totalEnergyKwh;
    const arrivalSoc = Math.max(0, remainingEnergy / batteryCapacity);

    return new Response(
      JSON.stringify({
        totalEnergyKwh,
        arrivalSoc,
        remainingRangeKm: remainingEnergy / baseConsumption,
        status: arrivalSoc > 0.1 ? 'optimal' : 'critical'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
