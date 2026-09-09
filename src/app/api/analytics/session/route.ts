import { NextResponse } from 'next/server';
import { logChargingSessionEvent, ChargingAnalyticsEvent } from '@/lib/services/analytics';

export async function POST(request: Request) {
  try {
    const body: ChargingAnalyticsEvent = await request.json();

    if (!body.vehicleModel || body.energyDeliveredKwh === undefined) {
      return NextResponse.json(
        { error: 'vehicleModel and energyDeliveredKwh are required' },
        { status: 400 }
      );
    }

    const result = await logChargingSessionEvent(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Analytics session API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
