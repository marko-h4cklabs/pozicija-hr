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
        speedScore: subject.speedScore,
        desktopSpeedScore: subject.desktopSpeedScore ?? null,
        totalScore: subject.totalScore,
        credibilityScore: subject.credibilityScore ?? null,
        hasGoogleAds: subject.hasGoogleAds ?? null,
        hasSsl: subject.hasSsl ?? null,
        hasCta: subject.hasCta ?? null,
      },
      competitors: competitors.map((c) => ({
        name: c.name,
        rating: c.rating,
        reviewCount: c.reviewCount,
        speedScore: c.speedScore,
        totalScore: c.totalScore,
        hasGoogleAds: c.hasGoogleAds ?? null,
      })),
      city: reportData.businessCity,
      niche: reportData.businessNiche,
    },
    null,
    2
  );

  const prompt =
    `You are an aggressive digital marketing analyst. Your job is to create FOMO and urgency. ` +
    `Data:\n\n${dataJson}\n\n` +
    `Write in Croatian. NEVER mention specific budget amounts or ad spend. ` +
    `Use statistics, competitor comparisons, and loss framing.\n\n` +
    `Use EXACTLY these section headings on their own lines:\n\n` +
    `NAJVEĆE PRILIKE\n` +
    `3 specific opportunities with statistics. Use patterns like: ` +
    `'Dentalne klinike koje aktivno prikupljaju recenzije rastu 3x brže od konkurencije — vaši konkurenti to rade, vi ne.' ` +
    `or 'X% pacijenata/klijenata čita recenzije prije prve posjete — vi im ne dajete razlog da odaberu vas.' ` +
    `Use their actual competitor names and real numbers from the data.\n\n` +
    `PROCJENA IZGUBLJENOG PRIHODA\n` +
    `Give a specific monthly EUR range they are losing based on their niche and performance gap. ` +
    `Be specific and alarming. Say: 'Procjenjujemo da [name] mjesečno propušta između X.000 i Y.000 EUR novih prihoda zbog slabe digitalne prisutnosti.' ` +
    `Then: 'U godinu dana, to je između X EUR i Y EUR koje odlaze direktno konkurenciji.'\n\n` +
    `ŠTO BI ODMAH TREBALI NAPRAVITI\n` +
    `3 specific actions ranked by impact. Never mention budgets or specific spend amounts. ` +
    `Focus on what to do, not how much to spend. ` +
    `Use urgency: 'Svaki tjedan čekanja znači X novih recenzija koje vaši konkurenti skupljaju bez vas.'\n\n` +
    `RIZIK NEAKCIJE\n` +
    `1-2 sentences. Make it alarming with a specific timeframe: 'Ako se ništa ne promijeni u sljedećih 90 dana...' ` +
    `Use their actual competitor names.`;

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
