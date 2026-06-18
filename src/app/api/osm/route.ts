import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json([]);
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=ec&format=json&limit=4&email=contacto@chargeway.ec`;

  try {
    // Desde el servidor sí podemos enviar el User-Agent sin que el navegador nos bloquee
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ChargeWay-Ecuador-App'
      }
    });
    
    if (!res.ok) {
      throw new Error(`OSM responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('OSM Proxy error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
