import { BusinessData } from '@/types';

const PLACES_BASE = 'https://places.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

const SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.websiteUri';
const DETAILS_FIELD_MASK =
  'id,displayName,rating,userRatingCount,formattedAddress,websiteUri';

function searchHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': SEARCH_FIELD_MASK,
  };
}

function detailsHeaders() {
  return {
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': DETAILS_FIELD_MASK,
  };
}

export async function searchBusiness(
  name: string,
  city: string,
  niche: string
): Promise<{ placeId: string | null; query: string; rawResponse: unknown }> {
  const textQuery = `${name} ${niche} ${city}`;
  const url = `${PLACES_BASE}/places:searchText`;

  console.log(`[Places] searchBusiness POST "${textQuery}"`);

  const res = await fetch(url, {
    method: 'POST',
    headers: searchHeaders(),
    body: JSON.stringify({ textQuery }),
  });
  const data = await res.json();

  console.log(`[Places] searchBusiness response:`, JSON.stringify(data, null, 2));

  const placeId = (data.places as Array<{ id: string }> | undefined)?.[0]?.id ?? null;
  return { placeId, query: textQuery, rawResponse: data };
}

export async function searchCompetitors(
  niche: string,
  city: string,
  excludePlaceId: string | null
): Promise<{ placeIds: string[]; query: string; rawResponse: unknown }> {
  const textQuery = `${niche} ${city}`;
  const url = `${PLACES_BASE}/places:searchText`;

  console.log(`[Places] searchCompetitors POST "${textQuery}" (excluding: ${excludePlaceId ?? 'none'})`);

  const res = await fetch(url, {
    method: 'POST',
    headers: searchHeaders(),
    body: JSON.stringify({ textQuery }),
  });
  const data = await res.json();

  console.log(`[Places] searchCompetitors response:`, JSON.stringify(data, null, 2));

  const placeIds = ((data.places ?? []) as Array<{ id: string }>)
    .filter((p) => p.id !== excludePlaceId)
    .slice(0, 3)
    .map((p) => p.id);

  return { placeIds, query: textQuery, rawResponse: data };
}

export async function getPlaceDetails(
  placeId: string,
  label: string
): Promise<{ data: Partial<BusinessData>; rawResponse: unknown }> {
  const url = `${PLACES_BASE}/places/${placeId}`;

  console.log(`[Places] getPlaceDetails [${label}] id: ${placeId}`);

  const res = await fetch(url, { headers: detailsHeaders() });
  const raw = await res.json();

  console.log(`[Places] getPlaceDetails [${label}] response:`, JSON.stringify(raw, null, 2));

  if (!raw.id) {
    console.warn(`[Places] getPlaceDetails [${label}] — no id in response`);
    return { data: {}, rawResponse: raw };
  }

  const parsed: Partial<BusinessData> = {
    name: (raw.displayName as { text?: string } | undefined)?.text,
    address: raw.formattedAddress,
    website: raw.websiteUri ?? null,
    rating: raw.rating ?? null,
    reviewCount: raw.userRatingCount ?? null,
    placeId,
  };

  console.log(`[Places] getPlaceDetails [${label}] parsed:`, parsed);

  return { data: parsed, rawResponse: raw };
}

export async function getPageSpeedScore(
  url: string | null,
  label: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<{ score: number | null; rawResponse: unknown; error?: string }> {
  if (!url) {
    console.log(`[PageSpeed] [${label}] skipped — no URL`);
    return { score: null, rawResponse: null };
  }

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${API_KEY}`;
  console.log(`[PageSpeed] [${label}] fetching score for: ${url}`);

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    const trimmed = {
      id: data.id,
      lighthouseVersion: data.lighthouseResult?.lighthouseVersion,
      fetchTime: data.lighthouseResult?.fetchTime,
      performanceScore: data.lighthouseResult?.categories?.performance?.score,
      audits: {
        'first-contentful-paint': data.lighthouseResult?.audits?.['first-contentful-paint']?.displayValue,
        'speed-index': data.lighthouseResult?.audits?.['speed-index']?.displayValue,
        'total-blocking-time': data.lighthouseResult?.audits?.['total-blocking-time']?.displayValue,
        'largest-contentful-paint': data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue,
        'cumulative-layout-shift': data.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue,
      },
      error: data.error ?? null,
    };
    console.log(`[PageSpeed] [${label}] response (trimmed):`, JSON.stringify(trimmed, null, 2));

    if (data.error) {
      console.warn(`[PageSpeed] [${label}] API returned error:`, data.error);
      return { score: null, rawResponse: trimmed, error: data.error.message ?? 'API error' };
    }

    const rawScore = data?.lighthouseResult?.categories?.performance?.score;
    if (rawScore === undefined || rawScore === null) {
      console.warn(`[PageSpeed] [${label}] performance score missing`);
      return { score: null, rawResponse: trimmed, error: 'Performance score missing' };
    }

    const score = Math.round(rawScore * 100);
    console.log(`[PageSpeed] [${label}] final score: ${score}/100`);
    return { score, rawResponse: trimmed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PageSpeed] [${label}] fetch threw:`, msg);
    return { score: null, rawResponse: null, error: msg };
  }
}
