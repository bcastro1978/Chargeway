import { NextResponse } from 'next/server';

const OCM_API_KEY = process.env.OPEN_CHARGE_MAP_KEY;
const OCM_BASE_URL = 'https://api.openchargemap.io/v3/poi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const uuid = searchParams.get('uuid');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!OCM_API_KEY) {
    return NextResponse.json({ detail: null, error: 'No OCM API key' }, { status: 200 });
  }

  try {
    const url = new URL(OCM_BASE_URL);
    url.searchParams.append('key', OCM_API_KEY);
    url.searchParams.append('compact', 'false');
    url.searchParams.append('verbose', 'true');
    url.searchParams.append('maxresults', '1');

    // Try to fetch by ID first, then by proximity
    if (id && !id.startsWith('ec-') && !id.startsWith('10')) {
      url.searchParams.append('chargepointid', id);
    } else if (lat && lng) {
      url.searchParams.append('latitude', lat);
      url.searchParams.append('longitude', lng);
      url.searchParams.append('distance', '0.5');
      url.searchParams.append('distancemetric', 'km');
    } else {
      return NextResponse.json({ detail: null });
    }

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'ChargeWay/1.0' },
      next: { revalidate: 300 } // 5 min cache
    });

    if (!res.ok) return NextResponse.json({ detail: null });

    const data = await res.json();
    const poi = data?.[0];
    if (!poi) return NextResponse.json({ detail: null });

    const detail = {
      id: poi.ID,
      uuid: poi.UUID,
      status: poi.StatusType?.Title || 'Desconocido',
      statusIsOperational: poi.StatusType?.IsOperational ?? null,
      address: {
        line1: poi.AddressInfo?.AddressLine1 || '',
        line2: poi.AddressInfo?.AddressLine2 || '',
        town: poi.AddressInfo?.Town || '',
        state: poi.AddressInfo?.StateOrProvince || '',
        country: poi.AddressInfo?.Country?.Title || 'Ecuador',
        postcode: poi.AddressInfo?.Postcode || '',
        lat: poi.AddressInfo?.Latitude,
        lng: poi.AddressInfo?.Longitude,
        contactTel: poi.AddressInfo?.ContactTelephone1 || '',
        contactEmail: poi.AddressInfo?.ContactEmail || '',
        website: poi.AddressInfo?.RelatedURL || ''
      },
      operator: {
        name: poi.OperatorInfo?.Title || 'Desconocido',
        website: poi.OperatorInfo?.WebsiteURL || '',
        phone: poi.OperatorInfo?.PhonePrimaryContact || '',
        email: poi.OperatorInfo?.ContactEmail || ''
      },
      usageType: poi.UsageType?.Title || 'Público',
      usageCost: poi.UsageCost || null,
      generalComments: poi.GeneralComments || '',
      connections: (poi.Connections || []).map((c: any) => ({
        id: c.ID,
        type: c.ConnectionType?.Title || 'Desconocido',
        level: c.Level?.Title || '',
        current: c.CurrentType?.Title || '',
        powerKW: c.PowerKW || 0,
        voltage: c.Voltage || null,
        amps: c.Amps || null,
        quantity: c.Quantity || 1,
        statusTitle: c.StatusType?.Title || 'Operativo',
        isOperational: c.StatusType?.IsOperational ?? true
      })),
      mediaItems: (poi.MediaItems || []).slice(0, 1).map((m: any) => ({
        url: m.ItemURL,
        thumbnail: m.ItemThumbnailURL,
        title: m.Comment || ''
      })),
      numberOfPoints: poi.NumberOfPoints || 1,
      dateLastVerified: poi.DateLastVerified || null,
      dateLastStatusUpdate: poi.DateLastStatusUpdate || null
    };

    return NextResponse.json({ detail });
  } catch (err) {
    console.error('OCM detail fetch error:', err);
    return NextResponse.json({ detail: null });
  }
}
