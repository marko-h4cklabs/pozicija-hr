import { ReportData } from '@/types';

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export async function generateAiAnalysis(reportData: ReportData): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[Claude] skipped — no ANTHROPIC_API_KEY');
    return null;
  }

  const { subject, competitors } = reportData;

  const dataJson = JSON.stringify(
    {
      subject: {
        name: subject.name,
        rating: subject.rating,
        reviewCount: subject.reviewCount,
        totalScore: subject.totalScore,
        credibilityScore: subject.credibilityScore,
        hasGoogleAds: subject.hasGoogleAds ?? null,
        hasSsl: subject.hasSsl ?? null,
        hasCta: subject.hasCta ?? null,
      },
      competitors: competitors.map((c) => ({
        name: c.name,
        rating: c.rating,
        reviewCount: c.reviewCount,
        totalScore: c.totalScore,
        hasGoogleAds: c.hasGoogleAds ?? null,
      })),
      city: reportData.businessCity,
      niche: reportData.businessNiche,
      ...(reportData.annualRevenue ? { annualRevenue_EUR: reportData.annualRevenue } : {}),
    },
    null,
    2
  );

  const prompt =
    `Ti si iskusni konzultant za digitalni marketing koji je upravo završio analizu za klijenta. ` +
    `Pišeš osobno, kao da sjediš nasuprot njima uz kavu i daješ im iskrenu procjenu. ` +
    `Podaci koje si prikupio:\n\n${dataJson}\n\n` +
    `PRAVILA PISANJA (strogo ih se drži):\n` +
    `- Piši na hrvatskom jeziku\n` +
    `- Piši u prvom licu množine: "Primijetili smo...", "Naša analiza pokazuje...", "Prema podacima koje smo prikupili...", "Kada smo usporedili..."\n` +
    `- NIKADA ne koristiti bullet pointove, crtice (- ili *) ili simbole (•) za nabrajanje. Sve piši kao tekuće rečenice.\n` +
    `- NIKADA ne koristiti dvostruke crtice (--)\n` +
    `- NIKADA ne koristiti riječi: optimizirati, implementirati, leveragirati, maksimizirati, skalirati\n` +
    `- Bez korporativnog žargona. Konverzacijski, direktan, human ton.\n` +
    `- Uvijek koristi stvarne brojeve iz podataka i stvarna imena konkurenata\n` +
    `- Maksimalno 3 rečenice po sekciji. Direktno i konkretno.\n` +
    `- Ton: pametni prijatelj koji se razumije u marketing, ne prodajni pitch\n` +
    `- NIKADA ne spominji iznose za oglašavanje ili budžete\n\n` +
    `Napiši analizu s TOČNO ovim naslovima sekcija (naslov na zasebnom retku, iza kojeg slijedi tekst):\n\n` +
    `NAJVEĆE PRILIKE\n` +
    `Što konkretno propuštaju, uz statistike i usporedbu s imenovanim konkurentima. ` +
    `Primjer tona: "Primijetili smo da [konkurent] ima X recenzija u usporedbi s vašim Y, a istraživanja pokazuju da 88% korisnika čita recenzije prije prve posjete." ` +
    `Napiši 2-3 rečenice o najvažnijim prilikama, sve u tekućem tekstu.\n\n` +
    `PROCJENA IZGUBLJENOG PRIHODA\n` +
    `Počni s "Prema našoj analizi, [naziv tvrtke]...". Daj konkretan EUR raspon koji propuštaju mjesečno i godišnje, ` +
    `bazirano na razlici u rezultatima i industriji. 2 rečenice.\n\n` +
    `ŠTO BI ODMAH TREBALI NAPRAVITI\n` +
    `Tri konkretna koraka po prioritetu, u tekućem tekstu (bez nabrajanja). ` +
    `Dodaj vremenski pritisak gdje je moguće. Bez iznosa i budžeta. 2-3 rečenice.\n\n` +
    `RIZIK NEAKCIJE\n` +
    `Jedna do dvije rečenice. Počni s "Ako se ništa ne promijeni u sljedećih 90 dana..." i navedni stvarnog konkurenta.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json();

    if (data.error) {
      console.warn('[Claude] API error:', data.error);
      return null;
    }

    const raw: string | null = data.content?.[0]?.text ?? null;
    const text = raw ? stripMarkdown(raw) : null;
    console.log('[Claude] analysis generated, length:', text?.length ?? 0);
    return text;
  } catch (e) {
    console.warn('[Claude] failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
