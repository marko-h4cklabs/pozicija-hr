import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  if (cookieStore.get('admin_authed')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug, custom_slug, meta_ads_manual } = (await req.json()) as {
    slug: string;
    custom_slug: string;
    meta_ads_manual: Record<string, boolean>;
  };

  if (!SLUG_RE.test(custom_slug)) {
    return NextResponse.json(
      { error: 'Neispravan format sluga. Koristite samo mala slova, brojeve i crtice.' },
      { status: 400 }
    );
  }

  // Check if custom_slug is already taken by a different report
  const { data: conflict } = await supabaseAdmin
    .from('reports')
    .select('id')
    .eq('custom_slug', custom_slug)
    .neq('slug', slug)
    .maybeSingle();

  if (conflict) {
    return NextResponse.json(
      { error: 'Taj slug je već zauzet — odaberite drugi.' },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from('reports')
    .update({ custom_slug, meta_ads_manual, status: 'published' })
    .eq('slug', slug);

  if (error) {
    console.error('[publish-report] Supabase update failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[publish-report] Published: slug="${slug}" custom_slug="${custom_slug}"`);
  return NextResponse.json({ ok: true });
}
