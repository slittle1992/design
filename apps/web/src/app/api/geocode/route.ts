import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'address query param required' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'GOOGLE_MAPS_API_KEY not configured on the server' },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({ address, key });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    return NextResponse.json(
      { error: data.error_message ?? data.status ?? 'geocoding failed' },
      { status: 404 },
    );
  }

  const top = data.results[0];
  return NextResponse.json({
    formattedAddress: top.formatted_address,
    location: top.geometry.location, // { lat, lng }
  });
}
