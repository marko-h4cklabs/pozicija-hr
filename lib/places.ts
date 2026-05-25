import { BusinessData, PlaceReview } from '@/types';

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

// Strip trailing Croatian legal entity suffixes
function stripLegalSuffix(name: string): string {
  const cleaned = name
    .replace(
      /[,\s]+(?:o\.?j\.?d\.?o\.?o\.?|j\.?d\.?o\.?o\.?|d\.?o\.?o\.?|d\.?d\.?|k\.?d\.?|g\.?i\.?u\.?|vl\.?\s*obrt|vl\.|obrt)\s*\.?\s*$/gi,
      ''
    )
    .trim();
  return cleaned.length > 1 ? cleaned : name;
}

async function searchOnce(textQuery: string): Promise<string | null> {
  console.log(`[Places] attempt: "${textQuery}"`);
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: searchHeaders(),
    body: JSON.stringify({ textQuery }),
  });
  const data = await res.json();
  const placeId = (data.places as Array<{ id: string }> | undefined)?.[0]?.id ?? null;
  console.log(`[Places] result: "${textQuery}" → ${placeId ?? 'no result'}`);
  return placeId;
}

export async function searchBusiness(
  name: string,
  city: string,
  niche: string,
  mapsName?: string | null
): Promise<{ placeId: string | null; query: string; rawResponse: unknown }> {

  // If caller provided an explicit Google Maps name, trust it and return immediately
  if (mapsName && mapsName.trim()) {
    const q = `${mapsName.trim()} ${city}`.trim();
    const placeId = await searchOnce(q);
    return { placeId, query: q, rawResponse: null };
  }

  // Attempt 1: full name + niche + city (original behaviour)
  const q1 = [name, niche, city].filter(Boolean).join(' ');
  const r1 = await searchOnce(q1);
  if (r1) return { placeId: r1, query: q1, rawResponse: null };

  // Attempt 2: strip legal suffix, clean name + city (no niche — niche adds noise)
  const cleanName = stripLegalSuffix(name);
  const q2 = [cleanName, city].filter(Boolean).join(' ');
  if (q2 !== q1) {
    const r2 = await searchOnce(q2);
    if (r2) return { placeId: r2, query: q2, rawResponse: null };
  }

  // Attempt 3: first word of clean name + city
  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length >= 1) {
    const q3 = `${words[0]} ${city}`.trim();
    if (q3 !== q2) {
      const r3 = await searchOnce(q3);
      if (r3) return { placeId: r3, query: q3, rawResponse: null };
    }
  }

  // Attempt 4: first two words + city
  if (words.length >= 2) {
    const q4 = `${words[0]} ${words[1]} ${city}`.trim();
    if (q4 !== q2) {
      const r4 = await searchOnce(q4);
      if (r4) return { placeId: r4, query: q4, rawResponse: null };
    }
  }

  console.log(`[Places] all attempts failed for: "${name}" in "${city}"`);
  return { placeId: null, query: q1, rawResponse: null };
}

export async function getPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  const url = `${PLACES_BASE}/places/${placeId}`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'reviews',
      },
    });
    const data = await res.json();
    const raw = (data.reviews ?? []) as Array<{
      rating?: number;
      text?: { text?: string } | string;
      relativePublishTimeDescription?: string;
    }>;
    return raw
      .map(r => ({
        rating: r.rating ?? 0,
        text: typeof r.text === 'string' ? r.text : (r.text?.text ?? ''),
        relativePublishTimeDescription: r.relativePublishTimeDescription ?? '',
      }))
      .filter(r => r.text.trim().length > 0);
  } catch (e) {
    console.warn('[Places] getPlaceReviews failed:', e instanceof Error ? e.message : e);
    return [];
  }
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
