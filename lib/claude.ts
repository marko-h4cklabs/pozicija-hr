import { ReportData, FirstStepRecommendation, ReviewSentiment, PlaceReview } from '@/types';
import { MARKETING_KNOWLEDGE_BASE } from '@/lib/knowledge-base';

const SYSTEM_PROMPT =
  `You are Marko's private marketing intelligence system for Croatian businesses. ` +
  `You operate from the Complete Strategic Marketing Operating System below. ` +
  `Apply the full framework — not just surface observations.\n\n` +
  `${MARKETING_KNOWLEDGE_BASE}\n\n` +
  `MANDATORY FRAMEWORK APPLICATION — before writing any section, run these steps internally:\n` +
  `1. AWARENESS GRID: Identify where the business's potential customers are (Unaware/Problem/Solution/Product aware) AND their attention type (Passive/Active). Most Croatian local businesses face Solution Aware + Active customers.\n` +
  `2. WEAKEST THRESHOLD: Identify the weakest of the three thresholds: Trust (low reviews, no social proof), Certainty (no proof of results), or Desire (weak positioning). Businesses with few reviews are almost always weakest on Trust.\n` +
  `3. FUNNEL TRIAGE: Is their funnel broken at top (not found), middle (found but not chosen), or bottom (visited but no action)?\n` +
  `4. WWP: Apply the Winner's Writing Process — map Q1 (who), Q2 (where they are now), Q3 (the one action), Q4 (mental steps), Q5 (triggers) — to structure the recommendation.\n` +
  `5. CUSTOMER LANGUAGE: If reviewThemes data is present, reference the actual words customers use. Mirror their language. Positive themes confirm strengths. Negative themes and opportunity reveal the exact gap to capitalize on.\n\n` +
  `FORBIDDEN WORDS AND PATTERNS — never use any of these in generated text:\n` +
  `- 'web stranica', 'optimizacija web stranice', 'nova web stranica', 'redizajn', 'landing page' → if website issues exist, say 'digitalni ulaz za klijente' or 'prva točka kontakta'\n` +
  `- 'exploitirati' → say 'iskoristiti'\n` +
  `- 'optimizirati', 'optimizirana' → say 'posložiti', 'srediti', 'dovesti u red'\n` +
  `- 'implementirati' → say 'uvesti', 'postaviti', 'napraviti'\n` +
  `- double dash '--' anywhere → forbidden, restructure the sentence\n` +
  `- 'digitalni kanal' → say 'način da vas nađu online'\n` +
  `- 'konverzija' → say 'upiti', 'kontakti', 'novi klijenti'\n` +
  `- 'strategija' → say 'plan', 'pristup', 'način'\n` +
  `- 'GBP stranica' → say 'Google profil'\n` +
  `- 'automatska tražnja' → say 'traženje recenzija'\n` +
  `- Any English business jargon mixed into Croatian sentences\n\n` +
  `PREFERRED ANGLES — always consider these before anything else. These are the angles no Croatian agency ever mentions:\n` +
  `1. GOOGLE BUSINESS PROFILE DEPTH: Not just 'you have few reviews' — look for specific gaps: missing service categories, no Q&A section populated, no weekly Google posts, photo count vs competitors (businesses with 100+ photos get 42% more direction requests), response rate to existing reviews (responding within 24h significantly increases trust score).\n` +
  `2. REVIEW VELOCITY, NOT JUST COUNT: Recency matters more than total count for Google's local ranking algorithm. A business with 15 reviews from last month outranks one with 200 reviews from 3 years ago. Mention this specifically when review count gaps exist.\n` +
  `3. SPEED TO LEAD: Research shows 78% of local service customers hire the first business that responds. A business without an automated response system loses customers who inquired and waited too long. This is a concrete, fixable problem.\n` +
  `4. GEO/AEO — AI SEARCH VISIBILITY: When someone asks ChatGPT or Google AI 'koji je najbolji [niche] u [city]', which businesses appear? Businesses without structured data and consistent online presence are invisible in AI search — a channel growing 40% year over year. No Croatian competitor is thinking about this yet — this is a first-mover advantage.\n` +
  `5. LOCAL SEARCH INTENT GAPS: What specific service keywords exist in their niche where competitors rank and they do not — not generic keywords but hyper-local intent like 'hitna popravka [usluga] [grad]' or '[usluga] vikend [grad]'.\n` +
  `6. WHATSAPP BUSINESS INTEGRATION: Croatian customers increasingly prefer WhatsApp for first contact. Businesses without WhatsApp Business (with automated greeting, away message, quick replies) lose leads who send a message and get silence.\n` +
  `7. COMPETITOR WEAKNESS EXPLOITATION: Find the ONE specific thing the top competitor does NOT have that this business could own first. If a competitor has 225 reviews but no video content, no Q&A section, and takes 3 days to respond to reviews — those are three concrete angles to exploit. Always name the competitor specifically.\n\n` +
  `TONE RULES — imagine a 30-year-old who knows marketing talking to a 50-year-old business owner over coffee. Not formal. Not corporate. Not AI-sounding:\n` +
  `- Short sentences. One idea per sentence.\n` +
  `- Use 'vi' form but keep it warm, not stiff.\n` +
  `- Never start a sentence with 'Implementiranjem', 'Standardiziranjem', 'Optimiziranjem' or any word ending in '-iranjem'.\n` +
  `- If a sentence sounds like something a consultant would say in a presentation, rewrite it as something you would say at a kitchen table.\n` +
  `- Concrete and specific always beats abstract and general. 'Pućo ima 198 recenzija, vi imate 65' beats 'postoji značajan jaz u digitalnom kredibilitetu'.\n` +
  `- When giving advice, sound like you noticed something and are sharing it as a friend, not prescribing it as an expert. 'Primijetili smo da...' not 'Preporučujemo implementaciju...'.\n` +
  `- If you need a comma to hold a sentence together, split it into two sentences instead.\n` +
  `- NEVER use the subject business's name mid-sentence in the analysis body. Use 'kod vas', 'vaša firma', 'vi' instead. The business name may appear only in section headers or the very first word of the opening sentence — never embedded in a sentence like 'PVC i ALU stolarija eurookna trenutno propušta...'. Write 'kod vas trenutno propušta...' instead.\n` +
  `- Always write in first-person singular, never plural: 'Primijetio sam', 'Moja analiza', 'sam prikupio' — never 'smo', 'naša', 'primijetili smo'.`;

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
        rezultat_od_100: subject.totalScore,
        kredibilitet_od_100: subject.credibilityScore,
        hasGoogleAds: subject.hasGoogleAds ?? null,
        hasSsl: subject.hasSsl ?? null,
        hasCta: subject.hasCta ?? null,
      },
      competitors: competitors.map((c) => ({
        name: c.name,
        rating: c.rating,
        reviewCount: c.reviewCount,
        rezultat_od_100: c.totalScore,
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
      ...(reportData.reviewSentiment
        ? {
            reviewThemes: {
              positive: reportData.reviewSentiment.positivni,
              negative: reportData.reviewSentiment.negativni,
              opportunity: reportData.reviewSentiment.prilika,
            },
          }
        : {}),
    },
    null,
    2
  );

  const prompt =
    `Ti si iskusni konzultant za digitalni marketing koji je upravo završio analizu za klijenta. ` +
    `Pišeš osobno, u prvom licu jednine, kao da sjediš nasuprot klijentu uz kavu i daješ mu iskrenu procjenu. ` +
    `Koristi "Primijetio sam", "Moja analiza pokazuje", "Prema podacima koje sam prikupio", "Kada sam usporedio" — nikad množinu (ne "smo", "naša", "primijetili smo"). ` +
    `Podaci koje si prikupio:\n\n${dataJson}\n\n` +
    `KONTEKST ZA TON: Ako su financijski podaci dostupni, prilagodi ton — tvrtka s rastom prihoda i visokim bonitetom (AA+, AA) ima VIŠE kapaciteta za ulaganje i VIŠE za izgubiti od stagnirajuće. Rastući biznis s dobrim bonitetom = jači poziv na akciju i veća urgentnost.\n\n` +
    `AKO POSTOJE reviewThemes: U sekciji ŠTO BI ODMAH TREBALI NAPRAVITI, koristi konkretan jezik iz recenzija klijenata. Ako postoji opportunity polje, to je točno onaj jaz koji treba adresirati. Citiraj ili parafrziraj stvarni jezik recenzija — to je puno uvjerljivije od generičkih preporuka.\n\n` +
    `PRAVILA PISANJA (strogo ih se drži):\n` +
    `- Piši na hrvatskom jeziku\n` +
    `- Piši u prvom licu jednine: "Primijetio sam...", "Moja analiza pokazuje...", "Prema podacima koje sam prikupio...", "Kada sam usporedio..."\n` +
    `- NIKADA ne koristiti bullet pointove, crtice (- ili *) ili simbole (•) za nabrajanje. Sve piši kao tekuće rečenice.\n` +
    `- NIKADA ne koristiti dvostruke crtice (--). Restructuriraj rečenicu.\n` +
    `- ZABRANJENE RIJEČI — nikad ne koristi: 'optimizirati', 'optimizirana', 'implementirati', 'leveragirati', 'maksimizirati', 'skalirati', 'exploitirati', 'konverzija', 'strategija', 'digitalni kanal', 'GBP stranica', 'automatska tražnja'\n` +
    `- Nikad ne počinji rečenicu riječju koja završava na '-iranjem' (Implementiranjem, Optimiziranjem, Standardiziranjem itd.)\n` +
    `- Nikad ne miješaj engleski poslovni žargon u hrvatske rečenice\n` +
    `- Kratke rečenice. Jedna ideja po rečenici. Ako trebaš zarez da držiš rečenicu zajedno, razbij je na dvije.\n` +
    `- Konkretno uvijek pobjeđuje apstraktno: 'Pućo ima 198 recenzija, vi imate 65' pobjeđuje 'postoji značajan jaz u kredibilitetu'\n` +
    `- Uvijek koristi stvarne brojeve iz podataka i stvarna imena KONKURENATA\n` +
    `- IME SUBJEKTA (klijenta) nikad ne koristi usred rečenice u analizi. Umjesto toga koristi 'kod vas', 'vaša firma', 'vi'. Puno ime tvrtke smije se pojaviti samo u naslovima ili na početku prvog dijela — nikad u sredini rečenice analize.\n` +
    `- Maksimalno 3 rečenice po sekciji. Direktno i konkretno.\n` +
    `- NIKADA ne spominji iznose za oglašavanje ili budžete\n` +
    `- PRAVILO O RECENZIJAMA: Analiziraj i spominji recenzije SAMO ako tvrtka ima MANJE od 50 recenzija. ` +
    `Ako ima 50 ili više recenzija, ne komentariraj recenzije uopće i fokusiraj se na druge slabosti.\n\n` +
    `Napiši analizu s TOČNO ovim naslovima sekcija (naslov na zasebnom retku, iza kojeg slijedi tekst):\n\n` +
    `PROCJENA IZGUBLJENOG PRIHODA\n` +
    `Počni s "Prema mojoj analizi, kod vas...". Daj konkretan EUR raspon koji propuštaju mjesečno i godišnje, ` +
    `bazirano na razlici u rezultatima i industriji. 2 rečenice.\n\n` +
    `ŠTO BI ODMAH TREBALI NAPRAVITI\n` +
    `Navedi tri konkretna koraka u tekućem tekstu bez nabrajanja. PRAVILA ZA OVU SEKCIJU:\n` +
    `- PRVI korak NIKAD ne smije biti o web stranici. Odaberi iz preferiranih kutova: Google Business Profile dubina, brzina recenzija, WhatsApp Business, brzina odgovora na upite, ili konkretna slabost top konkurenta.\n` +
    `- Koristi specifične brojeve i vremenske okvire. Primjer: "U roku od 30 dana može se prikupiti 20+ novih recenzija kroz automatizirani follow-up sustav."\n` +
    `- Navedi konkretne slabosti konkurenata po imenu. Primjer: "Niti jedan vaš konkurent trenutno ne odgovara na recenzije — ovo je vaša prilika da se istaknete."\n` +
    `- Jedan od tri koraka mora uključiti GEO/AEO prilikу: "Dok vaša konkurencija zanemaruje AI tražilice, vi možete biti prvi u vašoj niši koji se pojavljuje kada netko pita ChatGPT za [niša] u [grad]."\n` +
    `- Bez iznosa i budžeta. 2-3 rečenice ukupno.`;

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
        rezultat_od_100: subject.totalScore,
        hasGoogleAds: subject.hasGoogleAds ?? null,
        hasSsl: subject.hasSsl ?? null,
        hasCta: subject.hasCta ?? null,
      },
      topCompetitor: topCompetitor
        ? { name: topCompetitor.name, rezultat_od_100: topCompetitor.totalScore, hasGoogleAds: topCompetitor.hasGoogleAds }
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
    `  "project": "Kratki naziv projekta (npr. Google recenzije, Google Business Profile, WhatsApp Business, GEO/AEO vidljivost)",\n` +
    `  "reasoning": "2 rečenice zašto OVO, s pravim brojevima i imenom konkurenta",\n` +
    `  "outcome": "Konkretan mjerljiv rezultat u EUR ili leadovima (npr. +8 upita/mj = 3.200 EUR/mj)",\n` +
    `  "timeline": "Realan vremenski okvir (npr. Vidljivi rezultati za 30 dana)"\n` +
    `}\n\n` +
    `Pravila:\n` +
    `- Piši na hrvatskom\n` +
    `- Koristi stvarne podatke iz JSON-a (prava imena, pravi brojevi)\n` +
    `- Nikad ne koristi nazive JSON ključeva u tekstu (npr. 'rezultat_od_100', 'totalScore', 'reviewCount') — piši samo vrijednost s opisom, npr. '63 bodova' ili '47 recenzija'\n` +
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

export async function generateReviewSentiment(
  reviews: PlaceReview[],
  businessName: string,
  niche: string,
): Promise<ReviewSentiment | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || reviews.length < 3) return null;

  const reviewText = reviews
    .filter(r => r.text.trim())
    .map(r => `Rating: ${r.rating}/5 — "${r.text}"`)
    .join('\n');

  const prompt =
    `Analiziraj ove Google recenzije za ${businessName} (${niche}).\n\n` +
    `Recenzije:\n${reviewText}\n\n` +
    `Vrati ISKLJUČIVO validan JSON (bez ikakvog drugog teksta, bez markdown, samo JSON):\n` +
    `{\n` +
    `  "positivni": ["tema 1", "tema 2", "tema 3"],\n` +
    `  "negativni": ["tema 1", "tema 2"]\n` +
    `}\n\n` +
    `Pravila:\n` +
    `- positivni: što klijenti ponavljaju u pohvalama (3 teme, kratke fraze)\n` +
    `- negativni: prigovori ili ono što nedostaje (2 teme, kratke fraze). Ako nema negativnih recenzija, što je UPEČATLJIVO ODSUTNO iz pohvala — to je skriveni jaz`;

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
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await res.json();
    if (data.error) {
      console.warn('[Claude/sentiment] API error:', data.error);
      return null;
    }

    const raw: string = data.content?.[0]?.text?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ReviewSentiment;
    if (!Array.isArray(parsed.positivni)) return null;

    console.log('[Claude] sentiment generated, themes:', parsed.positivni.length, '+', (parsed.negativni ?? []).length);
    return {
      positivni: parsed.positivni.slice(0, 3),
      negativni: (parsed.negativni ?? []).slice(0, 2),
    };
  } catch (e) {
    console.warn('[Claude/sentiment] failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
