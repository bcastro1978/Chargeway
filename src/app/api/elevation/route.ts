import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locations = searchParams.get('locations');

  if (!locations) {
    return NextResponse.json({ error: 'Missing locations parameter' }, { status: 400 });
  }

  const url = `https://api.opentopodata.org/v1/mapzen?locations=${locations}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch from OpenTopoData' }, { status: 500 });
  }
}
