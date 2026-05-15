const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Generate a Meta Ad Library search URL for a business name.
// Used to give users a one-click link to manually check ads.
export function metaAdsUrl(businessName: string): string {
  return (
    `https://www.facebook.com/ads/library/?active_status=all&ad_type=all` +
    `&country=HR&q=${encodeURIComponent(businessName)}`
  );
}

// SerpApi Google search — checks if paid ads appear when searching for the business name.
export async function checkGoogleAds(businessName: string): Promise<boolean | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.log(`[GoogleAds] [${businessName}] skipped — no SERPAPI_KEY`);
    return null;
  }

  const url =
    `https://serpapi.com/search.json?q=${encodeURIComponent(businessName)}` +
    `&location=Croatia&gl=hr&hl=hr&num=10&api_key=${apiKey}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const data = await res.json();

    if (data.error) {
      console.warn(`[GoogleAds] [${businessName}] SerpApi error:`, data.error);
      return null;
    }

    const hasAds = Array.isArray(data.ads) && data.ads.length > 0;
    console.log(`[GoogleAds] [${businessName}] → ${hasAds ? 'HAS' : 'NO'} ads`);
    return hasAds;
  } catch (e) {
    console.warn(`[GoogleAds] [${businessName}] failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// Fetch homepage and scan for common CTA indicators (phone, form, booking links, etc.)
export async function checkHasCta(url: string | null): Promise<boolean | null> {
  if (!url) return null;

  const CTA_PATTERNS = [
    // Universal contact signals
    'tel:', 'mailto:', 'whatsapp', 'viber',
    '<button', '<form',
    // Croatian CTAs (with and without diacritics)
    'upit', 'upita', 'upite',
    'kontaktiraj', 'kontakt',
    'zatražite', 'zatrazite', 'zatraži', 'zatrazi',
    'pošaljite', 'posaljite', 'pošalji', 'posalji',
    'rezerviraj', 'rezervacija',
    'naruči', 'narucite', 'narudžba', 'narudzba',
    'kupite', 'zakažite', 'pozovite', 'nazovite',
    'pišite', 'pisite', 'ponuda', 'ponudu', 'konzultacija',
    'besplatna', 'besplatno', 'akcija', 'popust',
    // English CTAs
    'contact', 'call us', 'book now', 'get in touch', 'schedule',
    'write to us', 'inquiry', 'get a quote', 'free quote', 'request',
  ];

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const html = (await res.text()).toLowerCase();
    const hasCta = CTA_PATTERNS.some((p) => html.includes(p.toLowerCase()));
    console.log(`[CTA] [${url}] → ${hasCta ? 'YES' : 'NO'}`);
    return hasCta;
  } catch (e) {
    console.warn(`[CTA] [${url}] failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}
