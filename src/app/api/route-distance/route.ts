import { NextResponse } from 'next/server';

/**
 * Proxy para Mapbox Directions API.
 * Mantiene el token en el servidor; el cliente nunca lo ve.
 * Uso: GET /api/route-distance?olng=X&olat=Y&dlng=X&dlat=Y
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const olng = searchParams.get('olng');
  const olat = searchParams.get('olat');
  const dlng = searchParams.get('dlng');
  const dlat = searchParams.get('dlat');

  if (!olng || !olat || !dlng || !dlat) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${olng},${olat};${dlng},${dlat}?geometries=geojson&overview=false&access_token=${token}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn('Mapbox non-JSON response:', text.substring(0, 100));
      return NextResponse.json({ error: 'Invalid response from Mapbox' }, { status: 502 });
    }

    if (data?.routes?.[0]?.distance) {
      const distanceKm = Math.round(data.routes[0].distance / 1000);
      return NextResponse.json({ distanceKm });
    }
    return NextResponse.json({ error: 'No route found', detail: data?.message }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch from Mapbox', detail: err?.message }, { status: 500 });
  }
}
