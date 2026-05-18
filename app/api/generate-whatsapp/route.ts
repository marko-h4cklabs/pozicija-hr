import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Report } from '@/types';

const WA_SYSTEM =
  `You are Marko's outreach assistant. You write cold WhatsApp messages for local business owners in Croatia. ` +
  `Warm outreach rules: Sound like a peer who noticed something, never salesy. ` +
  `Use one specific number that stings (real competitor name + real number from data). ` +
  `Reference their specific situation. End with ultra-low commitment ask. ` +
  `Never mention agency, services, or price. ` +
  `Write in Croatian using ti not Vi. Max 4 sentences total.`;

export async function POST(req: NextRequest) {
  console.log('[generate-whatsapp] route called');

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('[generate-whatsapp] apiKey present:', !!apiKey, 'length:', apiKey?.length ?? 0);
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY nije konfiguriran na serveru.' }, { status: 500 });
    }

    // Accept only slug — never trust client-serialised report_data
    let slug: string;
    try {
      const body = await req.json();
      slug = body.slug;
      if (!slug || typeof slug !== 'string') throw new Error('missing "slug" in request body');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[generate-whatsapp] bad request body:', msg);
      return NextResponse.json({ error: `Neispravan zahtjev: ${msg}` }, { status: 400 });
    }

    // Fetch fresh from Supabase (try internal slug first, then custom_slug)
    let report: Report | null = null;
    const { data: bySlug } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('slug', slug)
      .maybeSingle<Report>();
    if (bySlug) {
      report = bySlug;
    } else {
      const { data: byCustom } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('custom_slug', slug)
        .maybeSingle<Report>();
      if (byCustom) report = byCustom;
    }

    if (!report) {
      console.error('[generate-whatsapp] report not found for slug:', slug);
      return NextResponse.json({ error: `Izvještaj nije pronađen: ${slug}` }, { status: 404 });
    }

    const rd = report.report_data;
    if (!rd) {
      console.error('[generate-whatsapp] report_data is null for slug:', slug);
      return NextResponse.json({ error: 'report_data je prazan u bazi.' }, { status: 500 });
    }

    const { subject, competitors } = rd;

    const topCompetitor =
      competitors.length > 0
        ? competitors.reduce((a, b) => (a.totalScore > b.totalScore ? a : b))
        : null;

    const ownerFirstName = rd.ownerName
      ? rd.ownerName.trim().split(/\s+/)[0]
      : null;

    // Build a rich data block so Claude has everything it needs
    const reviewGap =
      topCompetitor && subject.reviewCount != null && topCompetitor.reviewCount != null
        ? topCompetitor.reviewCount - subject.reviewCount
        : null;

    const ratingGap =
      topCompetitor && subject.rating != null && topCompetitor.rating != null
        ? Math.round((topCompetitor.rating - subject.rating) * 10) / 10
        : null;

    const dataLines = [
      `Naziv tvrtke: ${report.business_name}`,
      ownerFirstName ? `Ime vlasnika: ${ownerFirstName}` : null,
      `Djelatnost: ${rd.businessNiche}`,
      `Grad: ${rd.businessCity}`,
      `Digitalni rezultat tvrtke: ${subject.totalScore}/100`,
      subject.reviewCount != null ? `Broj Google recenzija: ${subject.reviewCount}` : null,
      subject.rating != null ? `Prosječna ocjena: ${subject.rating}` : null,
      subject.hasGoogleAds ? `Google Ads: DA` : `Google Ads: NE`,
      subject.hasCta != null ? `CTA na web stranici: ${subject.hasCta ? 'DA' : 'NE'}` : null,
      topCompetitor
        ? `Glavni konkurent: ${topCompetitor.name} (rezultat: ${topCompetitor.totalScore}/100, recenzije: ${topCompetitor.reviewCount ?? '?'}, ocjena: ${topCompetitor.rating ?? '?'})`
        : null,
      reviewGap != null && reviewGap > 0
        ? `Razlika u recenzijama vs. konkurent: ${topCompetitor!.name} ima ${reviewGap} recenzija više`
        : null,
      ratingGap != null && ratingGap > 0
        ? `Razlika u ocjeni vs. konkurent: ${topCompetitor!.name} ima ocjenu bolju za ${ratingGap}`
        : null,
      rd.annualRevenue ? `Godišnji prihod: ${rd.annualRevenue.toLocaleString('hr-HR')} EUR` : null,
      rd.revenueGrowth != null
        ? `Rast prihoda: ${rd.revenueGrowth > 0 ? '+' : ''}${rd.revenueGrowth}%`
        : null,
      rd.companySize ? `Veličina tvrtke: ${rd.companySize}` : null,
      rd.bonitetGrade ? `Bonitetna ocjena: ${rd.bonitetGrade}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt =
      `Napiši WhatsApp poruku u 4 rečenice za outreach prema vlasniku tvrtke. Evo svih podataka:\n\n` +
      `${dataLines}\n\n` +
      `PRAVILA:\n` +
      (ownerFirstName
        ? `- Počni s "Bok ${ownerFirstName},"\n`
        : `- Počni s "Bok,"\n`) +
      `- Rečenica 1: Oslovi ga/je po imenu i navedi JEDNU konkretnu činjenicu o njihovoj digitalnoj prisutnosti ` +
      `u usporedbi s imenovanim konkurentom — koristi pravi broj koji boli (recenzije, ocjena, score). ` +
      `Budi toliko specifičan da ne može misliti da je ovo template poruka.\n` +
      `- Rečenica 2: Reci da si za njih pripremio nešto konkretno — misteriozno, ne objašnjavaj što je.\n` +
      `- Rečenica 3: Napiši točno: "Traje 90 sekundi pogledati."\n` +
      `- Rečenica 4: Napiši točno: "Marko"\n` +
      `- NIKADA ne spominji agenciju, marketing, usluge ili cijenu\n` +
      `- Ton: pametan susjed koji je nešto primijetio, ne prodavač\n` +
      `- Bez emojija\n` +
      `- Koristi "ti" oblik, nikad "Vi"\n` +
      `- Vrati SAMO tekst poruke, bez ikakvog uvoda ili objašnjenja`;

    console.log('[generate-whatsapp] slug:', slug, '| dataLines:\n', dataLines);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
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
