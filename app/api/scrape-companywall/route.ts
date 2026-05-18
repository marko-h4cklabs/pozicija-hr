import { NextRequest, NextResponse } from 'next/server';
import { scrapeCompanyWall } from '@/lib/scrape-companywall';

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url: string };

    if (!url || !url.includes('companywall')) {
      return NextResponse.json({ error: 'Nevažeći CompanyWall URL' }, { status: 400 });
    }

    const data = await scrapeCompanyWall(url);

    if (!data.name) {
      return NextResponse.json(
        { error: 'Nije moguće pronaći naziv tvrtke na CompanyWall stranici.' },
        { status: 422 },
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[scrape-companywall]', msg);
    return NextResponse.json({ error: `Greška pri dohvatu: ${msg}` }, { status: 500 });
  }
}
