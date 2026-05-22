import { NextRequest, NextResponse } from 'next/server';
import { searchBusiness } from '@/lib/places';

const PLACES_BASE = 'https://places.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

function extractFromMapsUrl(url: string): { name: string | null; placeId: string | null } {
  try {
    const u = new URL(url);

    // ChIJ place_id sometimes appears in the data segment: !1sChIJ...
    const placeIdMatch = /[!?&]1s(ChIJ[A-Za-z0-9_-]+)/.exec(url);
    const placeId = placeIdMatch?.[1] ?? null;

    // Name lives in the path: /maps/place/Business+Name/@...
    const pathMatch = /\/place\/([^/@]+)/.exec(u.pathname);
    const name = pathMatch
      ? decodeURIComponent(pathMatch[1].replace(/\+/g, ' '))
      : null;

    return { name, placeId };
  } catch {
    return { name: null, placeId: null };
  }
}

function parseCityFromAddress(address: string | undefined): string {
  if (!address) return '';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return '';
  // "Ulica 1, 10000 Zagreb, Hrvatska" → second-to-last part, strip postal code
  const candidate = parts[parts.length - 2] ?? '';
  return candidate.replace(/^\d{5}\s+/, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL je obavezan.' }, { status: 400 });
    }

    const { name: rawName, placeId: urlPlaceId } = extractFromMapsUrl(url.trim());
    console.log('[scrape-googlemaps] extracted:', { rawName, urlPlaceId });

    let placeId = urlPlaceId;

    // No place_id in URL — search by extracted name
    if (!placeId && rawName) {
      const result = await searchBusiness(rawName, '', '');
      placeId = result.placeId;
      console.log('[scrape-googlemaps] search result placeId:', placeId);
    }

    if (!placeId) {
      return NextResponse.json(
        { error: 'Nije moguće pronaći tvrtku na Google Mapsu.' },
        { status: 404 }
      );
    }

    const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'id,displayName,rating,userRatingCount,formattedAddress,websiteUri,nationalPhoneNumber',
      },
    });
    const raw = await res.json();
    console.log('[scrape-googlemaps] place details:', JSON.stringify(raw, null, 2));

    if (!raw.id) {
      return NextResponse.json(
        { error: 'Google Places nije vratio podatke za ovu lokaciju.' },
        { status: 404 }
      );
    }

    const city = parseCityFromAddress(raw.formattedAddress);

    return NextResponse.json({
      placeId,
      name: (raw.displayName as { text?: string } | undefined)?.text ?? rawName ?? '',
      city,
      address: raw.formattedAddress ?? '',
      rating: raw.rating ?? null,
      reviewCount: raw.userRatingCount ?? null,
      website: raw.websiteUri ?? null,
      phoneNumber: raw.nationalPhoneNumber ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[scrape-googlemaps] error:', msg);
    return NextResponse.json({ error: `Greška: ${msg}` }, { status: 500 });
  }
}
