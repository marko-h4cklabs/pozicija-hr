import { NextRequest, NextResponse } from 'next/server';
import { Report } from '@/types';

function extractWeakness(aiAnalysis: string | null | undefined): string {
  if (!aiAnalysis) return '';
  const SECTION = 'NAJVEĆE PRILIKE';
  const start = aiAnalysis.indexOf(SECTION);
  if (start === -1) return aiAnalysis.slice(0, 150);
  const contentStart = start + SECTION.length;
  let end = aiAnalysis.length;
  for (const s of ['PROCJENA', 'ŠTO BI', 'RIZIK']) {
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API ključ nije konfiguriran.' }, { status: 500 });
  }

  const { report } = (await req.json()) as { report: Report };
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
    weakness ? `Ključna slabost: ${weakness}` : null,
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
    `- Zvuči kao čovjek koji je primijetio nešto, ne kao prodavač\n` +
    `- Ton: znatiželjan prijatelj, ne cold caller\n` +
    `- Bez emojija\n` +
    `- Bez formalnog jezika, koristi "ti" ne "Vi"\n` +
    `- Vrati SAMO tekst poruke, bez ikakvih dodatnih komentara ili objašnjenja`;

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message ?? 'API greška');
    const message: string = data.content?.[0]?.text?.trim() ?? '';
    return NextResponse.json({ message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-whatsapp]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
