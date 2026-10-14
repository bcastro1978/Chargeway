import { NextResponse } from 'next/server';

interface AutocompleteRequestBody {
  input: string;
  sessionToken?: string;
  proximity?: [number, number]; // [lng, lat]
}

export async function POST(request: Request) {
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleApiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_MAPS_API_KEY no está configurada en el servidor' },
      { status: 500 }
    );
  }

  try {
    const body: AutocompleteRequestBody = await request.json();
    const { input, sessionToken, proximity } = body;

    if (!input || input.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const payload: any = {
      input: input.trim(),
      includedRegionCodes: ['EC'],
      languageCode: 'es'
    };

    if (sessionToken) {
      payload.sessionToken = sessionToken;
    }

    // Proximity bias toward user coordinates or Quito if provided
    if (proximity && proximity.length === 2 && !isNaN(proximity[0]) && !isNaN(proximity[1])) {
      payload.locationBias = {
        circle: {
          center: {
            latitude: proximity[1],
            longitude: proximity[0]
          },
          radius: 50000.0 // 50 km bias
        }
      };
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.text();
      console.warn('Google Places Autocomplete error:', response.status, errData);
      return NextResponse.json({ suggestions: [], error: 'Google Places error' }, { status: response.status });
    }

    const data = await response.json();
    const suggestions = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => {
        const pred = s.placePrediction;
        const mainText = pred.structuredFormat?.mainText?.text || pred.text?.text || '';
        const secondaryText = pred.structuredFormat?.secondaryText?.text || '';
        const fullText = pred.text?.text || `${mainText}${secondaryText ? `, ${secondaryText}` : ''}`;

        return {
          id: pred.placeId,
          placeId: pred.placeId,
          name: fullText.replace(/, Ecuador$/i, ''),
          mainText,
          secondaryText,
          types: pred.types || [],
          provider: 'google'
        };
      });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('API places autocomplete exception:', error);
    return NextResponse.json({ suggestions: [], error: error.message }, { status: 500 });
  }
}

// GET endpoint to resolve Place Details (coordinates)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  const sessionToken = searchParams.get('sessionToken');
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleApiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_MAPS_API_KEY no configurada' },
      { status: 500 }
    );
  }

  if (!placeId) {
    return NextResponse.json({ error: 'placeId requerido' }, { status: 400 });
  }

  try {
    let url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=id,displayName,location,formattedAddress`;
    if (sessionToken) {
      url += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'id,displayName,location,formattedAddress'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Place Details fetch error:', res.status, errText);
      return NextResponse.json({ error: 'Error obteniendo coordenadas' }, { status: res.status });
    }

    const data = await res.json();
    const lat = data.location?.latitude;
    const lng = data.location?.longitude;
    const name = data.displayName?.text || data.formattedAddress || 'Lugar seleccionado';

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Coordenadas no encontradas' }, { status: 404 });
    }

    return NextResponse.json({
      placeId: data.id,
      name: name.replace(/, Ecuador$/i, ''),
      address: data.formattedAddress,
      lat,
      lng
    });
  } catch (err: any) {
    console.error('Place Details resolution exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
