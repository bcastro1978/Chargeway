import { NextResponse } from 'next/server';
import ECUADOR_CHARGERS_DB from '@/lib/data/ecuador-chargers.json';

export async function GET() {
  return NextResponse.json({ chargers: ECUADOR_CHARGERS_DB, source: 'local' });
}
