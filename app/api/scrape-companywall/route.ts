import { NextRequest, NextResponse } from 'next/server';

const NICHE_MAP: Array<[RegExp, string]> = [
  [/restoran|ugostit|kafić|kafe|pizz|catering|prehramb/i, 'Restoran'],
  [/stomatolog|dent|zubni|ortodont/i, 'Dentist'],
  [/automehan|autoserv|popravak vozil|vulkaniz|motorna vozila/i, 'Automehaničar'],
  [/frizer|kozmetič|kozmet|salon ljep|njega tijel/i, 'Frizerski salon'],
  [/odvjetnik|pravni|pravo.*uslug|notarij/i, 'Odvjetnik'],
  [/teretana|fitness|gym|sport.*rekreac|tjelovježb/i, 'Teretana'],
  [/hotel|smještaj|apartman|turizam/i, 'Hotel'],
  [/maloprodaja|trgovina na malo|prodavaon/i, 'Maloprodaja'],
];

function mapNiche(raw: string): string {
  for (const [re, niche] of NICHE_MAP) {
    if (re.test(raw)) return niche;
  }
  return 'Drugo';
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseName(html: string): string | null {
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1) {
    const text = stripHtml(h1[1]).trim();
    if (text.length > 1) return text;
  }
  const og =
    /property="og:title"\s+content="([^"]+)"/i.exec(html) ??
    /content="([^"]+)"\s+property="og:title"/i.exec(html);
  if (og) {
    const text = og[1].split('|')[0].split('-')[0].trim();
    if (text.length > 1) return text;
  }
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (title) {
    const text = stripHtml(title[1]).split('|')[0].split('–')[0].trim();
    if (text.length > 1) return text;
  }
  return null;
}

function parseCity(html: string): string | null {
  const text = stripHtml(html);
  // Croatian postal codes are 5 digits: 10000 Zagreb, 21000 Split, 51000 Rijeka
  const postal = /\b\d{5}\s+([A-ZŠĐŽČĆ][a-zA-ZšđžčćŠĐŽČĆ\s-]{2,30}?)(?=[,\n<]|\s{2}|$)/m.exec(text);
  if (postal) return postal[1].trim();
  return null;
}

function parseNiche(html: string): string {
  const text = stripHtml(html);
  // Match NKD / activity description label followed by text
  const nkdMatch =
    /(?:NKD|Šifra djelatnosti|Pretežita djelatnost|Aktivnost)[^a-zA-ZšđžčćŠĐŽČĆ\n]*([A-ZŠĐŽČĆ][a-zA-ZšđžčćŠĐŽČĆ0-9 ,./()-]{5,120})/i.exec(text);
  if (nkdMatch) return mapNiche(nkdMatch[1]);
  return 'Drugo';
}

function parseCroatianNumber(s: string): number {
  // 1.234.567 → 1234567
  return parseInt(s.replace(/\./g, ''), 10);
}

function parseRevenue(html: string): number | null {
  const lower = html.toLowerCase();

  for (const keyword of ['ukupni prihodi', 'prihodi od prodaje', 'poslovni prihodi', 'prihod']) {
    const idx = lower.indexOf(keyword);
    if (idx === -1) continue;

    const slice = html.slice(idx, idx + 1500);
    const text = stripHtml(slice);

    // Croatian thousands-separated numbers: 1.234.567
    const dotSep = Array.from(text.matchAll(/\b(\d{1,3}(?:\.\d{3})+)\b/g))
      .map(m => parseCroatianNumber(m[1]))
      .filter(n => n >= 10_000);

    if (dotSep.length > 0) return Math.max(...dotSep);

    // Plain 6+ digit numbers
    const plain = Array.from(text.matchAll(/\b(\d{6,})\b/g))
      .map(m => parseInt(m[1], 10))
      .filter(n => n >= 10_000);

    if (plain.length > 0) return Math.max(...plain);
  }

  return null;
}

function parseEmployees(html: string): number | null {
  const text = stripHtml(html).toLowerCase();
  const idx = text.search(/zaposlen|radnik|djelatnik/);
  if (idx === -1) return null;
  const nearby = text.slice(Math.max(0, idx - 100), idx + 300);
  const m = /\b(\d+)\b/.exec(nearby);
  return m ? parseInt(m[1], 10) : null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url: string };

    if (!url || !url.includes('companywall')) {
      return NextResponse.json({ error: 'Nevažeći CompanyWall URL' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CompanyWall vratio status ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();

    const name = parseName(html);
    if (!name) {
      return NextResponse.json(
        { error: 'Nije moguće pronaći naziv tvrtke na CompanyWall stranici.' },
        { status: 422 },
      );
    }

    return NextResponse.json({
      name,
      city: parseCity(html),
      niche: parseNiche(html),
      annualRevenue: parseRevenue(html),
      employees: parseEmployees(html),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[scrape-companywall]', msg);
    return NextResponse.json({ error: `Greška pri dohvatu: ${msg}` }, { status: 500 });
  }
}
