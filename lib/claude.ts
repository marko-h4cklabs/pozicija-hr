import { ReportData, FirstStepRecommendation } from '@/types';
import { MARKETING_KNOWLEDGE_BASE } from '@/lib/knowledge-base';

const SYSTEM_PROMPT =
  `You are Marko's private marketing intelligence system. ` +
  `You have deep expertise in digital marketing for Croatian and Balkan businesses. ` +
  `You operate from Marko's complete marketing methodology — the knowledge base below. ` +
  `Apply it to every analysis you generate.\n\n` +
  `${MARKETING_KNOWLEDGE_BASE}\n\n` +
  `When generating analysis:\n` +
  `- Apply THREE THRESHOLDS framework (Desire/Value, Certainty, Trust) to identify where the business is weakest\n` +
  `- Apply FUNNEL TRIAGE logic (Ad CTR → Landing Page → Close Rate) to pinpoint where they're losing customers\n` +
  `- Apply PROJECT SELECTION logic to identify the single highest-ROI first move\n` +
  `- Apply PROJECT MATH to frame everything in their actual money (customer value × volume = ROI)\n` +
  `- Reference their SPECIFIC competitors by name, with their real numbers\n` +
  `- Write like a smart peer who knows marketing, not a corporate consultant`;

// Strips markdown formatting and removes any non-Croatian/non-Latin unicode characters
// that can appear as garbled output (e.g. CJK characters from model hallucinations)
function sanitizeClaudeText(text: string): string {
  // Strip markdown
  let out = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  // Remove any character that is not:
  // - Basic Latin (a-z, A-Z, 0-9, standard punctuation, whitespace)
  // - Croatian diacritics: č ć đ š ž Č Ć Đ Š Ž
  // - Common symbols used in text: € % / - ( ) + = . , ; : ! ? " ' « » „ " "
  out = out.replace(/[^\x09\x0A\x0D\x20-\x7Eа-яА-ЯčćđšžČĆĐŠŽ€%]/g, '');

  // Collapse runs of whitespace that may appear after stripping
  out = out.replace(/[ \t]{2,}/g, ' ').trim();

  return out;
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
        reviewCount_note: (subject.reviewCount ?? 0) >= 50
          ? 'DO NOT mention reviews - business has 50+ reviews'
          : `Only ${subject.reviewCount ?? 0} reviews — mention if relevant`,
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
      ...(reportData.ownerName ? { ownerFirstName: reportData.ownerName.split(' ')[0] } : {}),
      ...(reportData.revenueGrowth != null ? { revenueGrowth_pct: reportData.revenueGrowth } : {}),
      ...(reportData.companySize ? { companySize: reportData.companySize } : {}),
      ...(reportData.bonitetGrade ? { bonitetGrade: reportData.bonitetGrade } : {}),
      ...(reportData.financialHistory?.length
        ? {
            financialSummary: reportData.financialHistory.slice(-3).map((y) => ({
              year: y.year,
              prihodi: y.ukupni_prihodi,
              dobit: y.dobitak_gubitak,
              zaposleni: y.broj_zaposlenih,
            })),
          }
        : {}),
    },
    null,
    2
  );

  const prompt =
    `Ti si iskusni konzultant za digitalni marketing koji je upravo završio analizu za klijenta. ` +
    `Pišeš osobno, kao da sjediš nasuprot njima uz kavu i daješ im iskrenu procjenu. ` +
    `Podaci koje si prikupio:\n\n${dataJson}\n\n` +
    `KONTEKST ZA TON: Ako su financijski podaci dostupni, prilagodi ton — tvrtka s rastom prihoda i visokim bonitetom (AA+, AA) ima VIŠE kapaciteta za ulaganje i VIŠE za izgubiti od stagnirajuće. Rastući biznis s dobrim bonitetom = jači poziv na akciju i veća urgentnost.\n\n` +
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
    `- NIKADA ne spominji iznose za oglašavanje ili budžete\n` +
    `- PRAVILO O RECENZIJAMA: Analiziraj i spominji recenzije SAMO ako tvrtka ima MANJE od 50 recenzija. ` +
    `Ako ima 50 ili više recenzija, ne komentariraj recenzije uopće i fokusiraj se na druge slabosti.\n\n` +
    `Napiši analizu s TOČNO ovim naslovima sekcija (naslov na zasebnom retku, iza kojeg slijedi tekst):\n\n` +
    `PROCJENA IZGUBLJENOG PRIHODA\n` +
    `Počni s "Prema našoj analizi, [naziv tvrtke]...". Daj konkretan EUR raspon koji propuštaju mjesečno i godišnje, ` +
    `bazirano na razlici u rezultatima i industriji. 2 rečenice.\n\n` +
    `ŠTO BI ODMAH TREBALI NAPRAVITI\n` +
    `Navedi tri konkretna koraka TOČNO ovim redoslijedom prioriteta, u tekućem tekstu bez nabrajanja:\n` +
    `  PRVO: uvijek web stranica / landing page (brzina, CTA, mobilna verzija)\n` +
    `  DRUGO: recenzije i Google prisutnost — ALI SAMO ako tvrtka ima MANJE od 50 recenzija. ` +
    `Ako ima 50 ili više recenzija, preskočite ovaj korak i idite na sljedeći prioritet\n` +
    `  TREĆE: plaćeno oglašavanje (Google Ads ili Meta Ads)\n` +
    `Nikad ne mijenjaj ovaj redoslijed. Dodaj vremenski pritisak gdje je moguće. Bez iznosa i budžeta. 2-3 rečenice.`;

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
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
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
    const text = raw ? sanitizeClaudeText(raw) : null;
    console.log('[Claude] analysis generated, length:', text?.length ?? 0);
    return text;
  } catch (e) {
    console.warn('[Claude] failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function generateFirstStepRecommendation(
  reportData: ReportData
): Promise<FirstStepRecommendation | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { subject, competitors, businessCity, businessNiche, annualRevenue, companySize, bonitetGrade } = reportData;

  const topCompetitor =
    competitors.length > 0
      ? competitors.reduce((a, b) => (a.totalScore > b.totalScore ? a : b))
      : null;

  const dataJson = JSON.stringify(
    {
      subject: {
        name: subject.name,
        rating: subject.rating,
        reviewCount: subject.reviewCount,
        totalScore: subject.totalScore,
        hasGoogleAds: subject.hasGoogleAds ?? null,
        hasSsl: subject.hasSsl ?? null,
        hasCta: subject.hasCta ?? null,
      },
      topCompetitor: topCompetitor
        ? { name: topCompetitor.name, totalScore: topCompetitor.totalScore, hasGoogleAds: topCompetitor.hasGoogleAds }
        : null,
      city: businessCity,
      niche: businessNiche,
      ...(annualRevenue ? { annualRevenue_EUR: annualRevenue } : {}),
      ...(companySize ? { companySize } : {}),
      ...(bonitetGrade ? { bonitetGrade } : {}),
    },
    null,
    2
  );

  const prompt =
    `Na temelju podataka ispod, primijeni PROJECT SELECTION logiku iz metodologije i odaberi JEDAN najvažniji prvi korak. ` +
    `Vrati odgovor ISKLJUČIVO kao validan JSON objekt (bez ikakvih objašnjenja, bez markdown, samo JSON).\n\n` +
    `Podaci:\n${dataJson}\n\n` +
    `JSON format koji moraš vratiti (točno ova 4 ključa):\n` +
    `{\n` +
    `  "project": "Kratki naziv projekta (npr. Google recenzije, Google Search Ads, Landing stranica)",\n` +
    `  "reasoning": "2 rečenice zašto OVO, s pravim brojevima i imenom konkurenta",\n` +
    `  "outcome": "Konkretan mjerljiv rezultat u EUR ili leadovima (npr. +8 upita/mj = 3.200 EUR/mj)",\n` +
    `  "timeline": "Realan vremenski okvir (npr. Vidljivi rezultati za 30 dana)"\n` +
    `}\n\n` +
    `Pravila:\n` +
    `- Piši na hrvatskom\n` +
    `- Koristi stvarne podatke iz JSON-a (prava imena, pravi brojevi)\n` +
    `- Bez marketinškog žargona\n` +
    `- Bez iznosa budžeta za oglase`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await res.json();
    if (data.error) {
      console.warn('[Claude/firstStep] API error:', data.error);
      return null;
    }

    const raw: string = data.content?.[0]?.text?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Claude/firstStep] no JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as FirstStepRecommendation;
    if (!parsed.project || !parsed.reasoning) return null;
    console.log('[Claude] firstStep generated:', parsed.project);
    return parsed;
  } catch (e) {
    console.warn('[Claude/firstStep] failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
