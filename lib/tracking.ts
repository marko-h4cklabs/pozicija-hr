import { supabaseAdmin } from '@/lib/supabase';

async function sendTelegramNotification(
  businessName: string,
  businessCity: string,
  slug: string,
  openCount: number
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('[tracking] Telegram skipped — no BOT_TOKEN or CHAT_ID');
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://pozicija-hr.com';
  const now = new Date();
  const d = now.toLocaleDateString('hr-HR', { timeZone: 'Europe/Zagreb', day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = now.toLocaleTimeString('hr-HR', { timeZone: 'Europe/Zagreb', hour: '2-digit', minute: '2-digit' });

  const text =
    `🔴 OTVOREN IZVJEŠTAJ #${openCount}\n\n` +
    `Tvrtka: ${businessName}\n` +
    `Grad: ${businessCity}\n` +
    `Vrijeme: ${d} u ${t}\n` +
    `Ukupno otvaranja: ${openCount}\n\n` +
    `Link: ${baseUrl}/${slug}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  console.log(`[tracking] Telegram response: ${res.status}`);
}

export async function trackOpen(
  id: string,
  slug: string,
  businessName: string,
  businessCity: string,
  currentOpenCount: number,
  openedAt: string | null
): Promise<void> {
  const newCount = (currentOpenCount ?? 0) + 1;

  const { error } = await supabaseAdmin
    .from('reports')
    .update({
      open_count: newCount,
      ...(openedAt === null ? { opened_at: new Date().toISOString() } : {}),
    })
    .eq('id', id);

  if (error) {
    console.error('[tracking] DB update failed:', error.message);
    return;
  }

  console.log(`[tracking] open_count=${newCount} for "${businessName}"`);

  await sendTelegramNotification(businessName, businessCity, slug, newCount).catch(
    (e) => console.error('[tracking] Telegram failed:', e instanceof Error ? e.message : e)
  );
}
