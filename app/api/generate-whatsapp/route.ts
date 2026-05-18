import { NextRequest, NextResponse } from 'next/server';
import { Report } from '@/types';

const WA_SYSTEM =
  `You are Marko's outreach assistant. You write cold WhatsApp messages for local business owners in Croatia. ` +
  `Warm outreach rules: Sound like a peer who noticed something, never salesy. ` +
  `Use one specific number that stings (real competitor name + real number from data). ` +
  `Reference their specific situation. End with ultra-low commitment ask. ` +
  `Never mention agency, services, or price. ` +
  `Write in Croatian using ti not Vi. Max 4 sentences total.`;

function extractWeakness(aiAnalysis: string | null | undefined): string {
  if (!aiAnalysis) return '';
  const SECTION = 'PROCJENA IZGUBLJENOG PRIHODA';
  const start = aiAnalysis.indexOf(SECTION);
  if (start === -1) return aiAnalysis.slice(0, 150);
  const contentStart = start + SECTION.length;
  let end = aiAnalysis.length;
  for (const s of ['ŠTO BI', 'RIZIK']) {
    const idx = aiAnalysis.indexOf(s, contentStart);
    if (idx !== -1 && idx < end) end = idx;
  }
  const section = aiAnalysis.slice(contentStart, end).trim();
  return section.split(/[.!?]/)[0].trim().slice(0, 200);
}

function extractMonthlyLoss(aiAnalysis: string | null | undefined): string {
  if (!aiAnalysis) return '';
  const SECTION = 'PROCJENA IZGUBLJENOG PRIHODA';
  const start = aiAnalysis.indexOf(SECTION);
  if (start === -1) return '';
  const slice = aiAnalysis.slice(start, start + 600);
  const match = /(\d[\d.]*)\s*EUR/i.exec(slice);
  if (!match) return '';
  const num = parseInt(match[1].replace(/\./g, ''), 10);
  return isNaN(num) || num <= 0 ? '' : `${num.toLocaleString('hr-HR')} EUR`;
}

export async function POST(req: NextRequest) {
  console.log('[generate-whatsapp] route called');

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('[generate-whatsapp] apiKey present:', !!apiKey, 'length:', apiKey?.length ?? 0);
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY nije konfiguriran na serveru.' }, { status: 500 });
    }

    let report: Report;
    try {
      const body = await req.json();
      report = body.report;
      if (!report) throw new Error('missing "report" key in request body');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[generate-whatsapp] bad request body:', msg);
      return NextResponse.json({ error: `Neispravan zahtjev: ${msg}` }, { status: 400 });
    }

    const { subject, competitors, aiAnalysis } = report.report_data;

    const topCompetitor =
      competitors.length > 0
        ? competitors.reduce((a, b) => (a.totalScore > b.totalScore ? a : b))
        : null;

    const weakness = extractWeakness(aiAnalysis);
    const monthlyLoss = extractMonthlyLoss(aiAnalysis);

    const ownerFullName = report.report_data.ownerName ?? null;
    const ownerFirstName = ownerFullName ? ownerFullName.trim().split(/\s+/)[0] : null;

    const dataLines = [
      `Naziv tvrtke: ${report.business_name}`,
      ownerFirstName ? `Ime vlasnika/direktora: ${ownerFirstName}` : null,
      `Rezultat: ${subject.totalScore}/100`,
      topCompetitor
        ? `Glavni konkurent: ${topCompetitor.name} (rezultat: ${topCompetitor.totalScore}/100)`
        : null,
      weakness ? `Ključna informacija: ${weakness}` : null,
      monthlyLoss ? `Procijenjeni mjesečni gubitak: ${monthlyLoss}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt =
      `Napiši WhatsApp poruku za outreach prema vlasniku tvrtke.\n\n` +
      `Podaci:\n${dataLines}\n\n` +
      `PRAVILA (strogo ih se drži):\n` +
      `- Maksimalno 4 rečenice ukupno\n` +
      (ownerFirstName
        ? `- Počni s "Bok ${ownerFirstName},"\n`
        : `- Počni s "Bok,"\n`) +
      `- Rečenica 1: Jedna konkretna činjenica koja zaboli — koristi pravo ime konkurenta i jedan pravi broj\n` +
      `- Rečenica 2: Napomeni da si napravio nešto konkretno za njih (ne kaži što je)\n` +
      `- Rečenica 3: Minimalan commitment — napiši točno: "Traje 90 sekundi pogledati."\n` +
      `- Rečenica 4: Potpis — napiši točno: "Marko"\n` +
      `- Nikad ne spominji agenciju, usluge, cijenu ili marketing\n` +
      `- Bez emojija, bez formalnog jezika, koristi "ti" ne "Vi"\n` +
      `- Vrati SAMO tekst poruke, bez ikakvih dodatnih komentara`;

    console.log('[generate-whatsapp] calling Anthropic, dataLines:', dataLines);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: WA_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const rawText = await res.text();
    console.log('[generate-whatsapp] Anthropic status:', res.status);
    console.log('[generate-whatsapp] Anthropic body (first 500):', rawText.slice(0, 500));

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Anthropic vratio non-JSON (status ${res.status}): ${rawText.slice(0, 200)}`);
    }

    if (!res.ok || data.error) {
      const apiErr = data.error as { message?: string } | undefined;
      throw new Error(apiErr?.message ?? `Anthropic HTTP ${res.status}`);
    }

    const content = data.content as Array<{ type: string; text: string }> | undefined;
    const message: string = content?.[0]?.text?.trim() ?? '';
    if (!message) throw new Error('Anthropic vratio prazan odgovor');

    return NextResponse.json({ message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-whatsapp] unhandled error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
