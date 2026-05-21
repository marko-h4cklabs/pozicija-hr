import { NextRequest, NextResponse } from 'next/server';
import { trackOpen } from '@/lib/tracking';
import { supabaseAdmin } from '@/lib/supabase';

// This route is kept for backwards compatibility but primary tracking
// now happens server-side in app/[slug]/page.tsx via lib/tracking.ts
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const { data: report } = await supabaseAdmin
    .from('reports')
    .select('id, business_name, business_city, open_count, opened_at, status')
    .eq('slug', slug)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: 'Izvještaj nije pronađen.' }, { status: 404 });
  }

  if (report.status !== 'published') {
    return NextResponse.json({ skipped: 'draft' });
  }

  await trackOpen(
    report.id,
    slug,
    report.business_name,
    report.business_city,
    report.open_count ?? 0,
    report.opened_at,
  );

  return NextResponse.json({ success: true });
}
