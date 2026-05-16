import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const TELEGRAM_DEBOUNCE_SECONDS = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  console.log(`[track-open] called with slug="${slug}"`);

  const { data: report, error: fetchError } = await supabaseAdmin
    .from('reports')
    .select('id, business_name, business_city, open_count, opened_at, last_telegram_at, slug, status')
    .eq('slug', slug)
    .single();

  if (fetchError || !report) {
    console.warn(`[track-open] report NOT found for slug="${slug}"`, fetchError?.message ?? '');
    return NextResponse.json({ error: 'Izvještaj nije pronađen.' }, { status: 404 });
  }

  const newCount = (report.open_count ?? 0) + 1;

  const { error: updateError } = await supabaseAdmin
    .from('reports')
    .update({
      open_count: newCount,
      ...(report.opened_at === null ? { opened_at: new Date().toISOString() } : {}),
    })
    .eq('id', report.id);

  if (updateError) {
    console.error(`[track-open] update failed:`, updateError.message);
  } else {
    console.log(`[track-open] open_count updated to ${newCount} for "${report.business_name}"`);
  }

  // Telegram — only send if last_telegram_at is null or older than 60 seconds
  const now = new Date();
  const lastSent = report.last_telegram_at ? new Date(report.last_telegram_at) : null;
  const secondsSinceLast = lastSent ? (now.getTime() - lastSent.getTime()) / 1000 : Infinity;

  if (secondsSinceLast > TELEGRAM_DEBOUNCE_SECONDS) {
    console.log(`[track-open] sending Telegram for "${report.business_name}" (count=${newCount})`);

    await supabaseAdmin
      .from('reports')
      .update({ last_telegram_at: now.toISOString() })
      .eq('id', report.id);

    sendTelegramNotification(report.business_name, report.business_city, slug, newCount).catch(
      (e) => console.error('[track-open] Telegram failed:', e)
    );
  } else {
    console.log(`[track-open] Telegram skipped — sent ${Math.round(secondsSinceLast)}s ago`);
  }

  return NextResponse.json({ success: true });
}

async function sendTelegramNotification(
  businessName: string,
  businessCity: string,
  slug: string,
  openCount: number
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('[track-open] Telegram skipped — no BOT_TOKEN or CHAT_ID');
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://pozicija-hr.com';
  const timestamp = new Date().toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' });
  const text =
    `🔴 OTVOREN IZVJEŠTAJ\n\n` +
    `Tvrtka: ${businessName}\n` +
    `Grad: ${businessCity}\n` +
    `Vrijeme: ${timestamp}\n\n` +
    `Link: ${baseUrl}/${slug}\n\n` +
    `Ukupno otvaranja: ${openCount}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  console.log(`[track-open] Telegram response: ${res.status}`);
}
