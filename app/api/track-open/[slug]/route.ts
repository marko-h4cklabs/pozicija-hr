import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// In-memory dedup gate: slug → timestamp of last Telegram notification sent.
// Survives within a single serverless instance; provides a safety net against
// duplicate requests that slip past the client-side guard (e.g. two browser
// tabs, a CDN retry, or a future refactor of TrackOpen).
const lastNotified = new Map<string, number>();
const NOTIFY_DEBOUNCE_MS = 5_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const { data: report, error: fetchError } = await supabaseAdmin
    .from('reports')
    .select('id, business_name, business_city, open_count, opened_at, slug')
    .eq('slug', slug)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Izvještaj nije pronađen.' }, { status: 404 });
  }

  const newCount = (report.open_count ?? 0) + 1;

  await supabaseAdmin
    .from('reports')
    .update({
      open_count: newCount,
      ...(report.opened_at === null ? { opened_at: new Date().toISOString() } : {}),
    })
    .eq('id', report.id);

  // Fire Telegram notification (non-blocking) — skip if already sent within
  // the debounce window to suppress duplicate notifications from race conditions.
  const now = Date.now();
  const prev = lastNotified.get(slug) ?? 0;
  if (now - prev > NOTIFY_DEBOUNCE_MS) {
    lastNotified.set(slug, now);
    sendTelegramNotification(report.business_name, report.business_city, slug, newCount).catch(
      console.error
    );
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
  if (!token || !chatId) return;

  const timestamp = new Date().toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' });
  const text =
    `🔴 OTVOREN IZVJEŠTAJ\n\n` +
    `Tvrtka: ${businessName}\n` +
    `Grad: ${businessCity}\n` +
    `Vrijeme: ${timestamp}\n\n` +
    `Link: https://pozicija-hr.com/izvjestaj/${slug}\n\n` +
    `Ukupno otvaranja: ${openCount}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
