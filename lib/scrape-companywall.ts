import { FinancialYear } from '@/types';

export interface ScrapedCompanyData {
  name: string | null;
  ownerName: string | null;
  phoneNumber: string | null;
  foundedYear: string | null;
  companySize: string | null;
  bonitetGrade: string | null;
  nkdCode: string | null;
  niche: string;
  fullAddress: string | null;
  postalCode: string | null;
  city: string | null;
  annualRevenue: number | null;
  employees: number | null;
  financialHistory: FinancialYear[];
  revenueGrowth: number | null;
}

// ── NKD prefix → niche ────────────────────────────────────────────────────
const NKD_MAP: Array<[RegExp, string]> = [
  [/^F4[123]/, 'Građevina'],
  [/^G47/, 'Maloprodaja'],
  [/^I56/, 'Restoran'],
  [/^Q86/, 'Dentist'],
  [/^S96/, 'Frizerski salon'],
  [/^G45/, 'Automehaničar'],
  [/^I55/, 'Hotel'],
  [/^M(6[0-9]|7[0-3])/, 'Odvjetnik'],
  [/^N93/, 'Teretana'],
];

const TEXT_MAP: Array<[RegExp, string]> = [
  [/gradilišt|gradnja|konstruk|zidars|fasad|krović|renovac|građevin/i, 'Građevina'],
  [/restoran|ugostit|kafić|kafe|pizz|catering|prehramb/i, 'Restoran'],
  [/stomatolog|dent|zubni|ortodont/i, 'Dentist'],
  [/automehan|autoserv|popravak vozil|vulkaniz|motorna vozila/i, 'Automehaničar'],
  [/frizer|kozmetič|kozmet|salon ljep|njega tijel/i, 'Frizerski salon'],
  [/odvjetnik|pravni|pravo.*uslug|notarij/i, 'Odvjetnik'],
  [/teretana|fitness|gym|sport.*rekreac|tjelovježb/i, 'Teretana'],
  [/hotel|smještaj|apartman|turizam/i, 'Hotel'],
  [/maloprodaja|trgovina na malo|prodavaon/i, 'Maloprodaja'],
];

function nicheFromCode(code: string): string | null {
  for (const [re, niche] of NKD_MAP) if (re.test(code)) return niche;
  return null;
}

function nicheFromText(text: string): string {
  for (const [re, niche] of TEXT_MAP) if (re.test(text)) return niche;
  return 'Drugo';
}

// ── HTML helpers ─────────────────────────────────────────────────────────
function strip(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

// Croatian number: 1.234.567 or 1.234.567,00 — also handles negatives
function parseCrNum(s: string): number | null {
  const t = s.trim().replace(/\s/g, '');
  if (!t || /^[-–—]+$/.test(t)) return null;
  const neg = t.startsWith('-');
  const abs = t.replace(/^-/, '').replace(/\./g, '').split(',')[0];
  const n = parseInt(abs, 10);
  return isNaN(n) ? null : (neg ? -n : n);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase());
}

// ── Field parsers ─────────────────────────────────────────────────────────

function parseName(html: string): string | null {
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1) { const t = strip(h1[1]); if (t.length > 1) return t; }
  const og = /property="og:title"\s+content="([^"]+)"/i.exec(html)
    ?? /content="([^"]+)"\s+property="og:title"/i.exec(html);
  if (og) { const t = og[1].split('|')[0].split('-')[0].trim(); if (t.length > 1) return t; }
  return null;
}

function parseOwnerName(html: string): string | null {
  const text = strip(html);
  // "Trenutni direktor tvrtke je BERNARD DOMOVIĆ"
  const p1 = /Trenutni direktor tvrtke je\s+([A-ZŠĐŽČĆ][A-ZŠĐŽČĆ\s]{3,50}?)(?=[.,\n]|$|\s{2})/i.exec(text);
  if (p1) return titleCase(p1[1].trim());
  // "Zastupnik: BERNARD DOMOVIĆ, direktor"
  const p2 = /Zastupnik\s*:\s*([A-ZŠĐŽČĆ][A-ZŠĐŽČĆ\s]{3,50}?),?\s*direktor/i.exec(text);
  if (p2) return titleCase(p2[1].trim());
  // Generic: director label followed by UPPERCASE name
  const p3 = /(?:direktor|vlasnik|predsjednik uprave)[^A-ZÀ-ɏ\n]{0,20}([A-ZŠĐŽČĆ]{2,}\s+[A-ZŠĐŽČĆ]{2,}(?:\s+[A-ZŠĐŽČĆ]{2,})?)/i.exec(html);
  if (p3) return titleCase(p3[1].trim());
  return null;
}

function parsePhone(html: string): string | null {
  const text = strip(html);
  // Near "tel" / "telefon" / "kontakt" label
  const m1 = /(?:tel(?:efon)?|kontakt)\s*:?\s*(\+?385[\s/.-]?\d{2}[\s/.-]?\d{3,4}[\s/.-]?\d{3,4}|\+?\d[\d\s/.-]{7,14}\d)/i.exec(text);
  if (m1) return m1[1].trim();
  // Croatian +385
  const m2 = /(\+385[\s-]?\d{2}[\s-]?\d{3,4}[\s-]?\d{3,4})/.exec(text);
  if (m2) return m2[1];
  // Mobile 09X
  const m3 = /\b(09[12589]\s?\d{3}\s?\d{3,4})\b/.exec(text);
  if (m3) return m3[1];
  return null;
}

function parseFoundedYear(html: string): string | null {
  const text = strip(html);
  for (const re of [
    /Datum osnivanja[^:]*:\s*(\d{1,2}\.\s*\d{1,2}\.\s*\d{4}\.?)/i,
    /Datum osnivanja[^:]*:\s*(\d{4})/i,
    /Osnovana[^:]*:\s*(\d{4})/i,
    /Godina osnivanja[^:]*:\s*(\d{4})/i,
  ]) {
    const m = re.exec(text);
    if (m) return m[1].trim();
  }
  return null;
}

function parseCompanySize(html: string): string | null {
  const text = strip(html);
  const m = /Veličina\s+subjekta[^a-zA-ZÀ-ɏ]{0,10}([A-ZŠĐŽČĆ][a-zšđžčćA-ZŠĐŽČĆ\s]{2,30})/i.exec(text);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  if (raw.includes('mikro')) return 'Mikro';
  if (raw.includes('malo')) return 'Malo';
  if (raw.includes('srednje')) return 'Srednje';
  if (raw.includes('veliko')) return 'Veliko';
  return titleCase(m[1].trim().split(/\s+/)[0]);
}

function parseBonitetGrade(html: string): string | null {
  const text = strip(html);
  const m = /(?:bonitetna?\s*ocjena|bonitet|kreditni\s+rejting)[^A-Za-zÀ-ɏ]{0,20}([A-D]{1,2}[+]?)/i.exec(text);
  if (m) return m[1].toUpperCase();
  const m2 = /(?:ocjena|rating)\s*:\s*([A-D]{1,2}[+]?)/i.exec(text);
  if (m2) return m2[1].toUpperCase();
  return null;
}

function parseNkdCode(html: string): string | null {
  // Look for NKD code like F41.20 or F4120 near NKD label
  for (const re of [
    /(?:NKD|šifra djelatnosti|šifra NKD|pretežita djelatnost)[^A-ZÀ-ɏ]{0,30}([A-Z]\d{2}(?:[.\s]\d+)?)/i,
    /\b([A-Z]\d{2}\.\d{2})\b/,
  ]) {
    const m = re.exec(html);
    if (m) {
      const prefix = /^([A-Z]\d{2})/i.exec(m[1].trim().toUpperCase());
      if (prefix) return prefix[1];
    }
  }
  return null;
}

function parseAddress(html: string): { fullAddress: string | null; postalCode: string | null; city: string | null } {
  const text = strip(html);
  const addrM = /(?:Sjedište|Adresa)[^:]*:\s*([^\n]{5,100})/i.exec(text);
  const fullAddress = addrM ? addrM[1].trim() : null;
  const src = fullAddress ?? text;
  const postalM = /\b(\d{5})\s+([A-ZŠĐŽČĆ][a-zA-ZšđžčćŠĐŽČĆ\s-]{2,30}?)(?=[,\n\r]|\s{2}|$)/m.exec(src);
  return {
    fullAddress,
    postalCode: postalM ? postalM[1] : null,
    city: postalM ? postalM[2].trim() : null,
  };
}

// ── Financial table parser ────────────────────────────────────────────────

function parseFinancialHistory(html: string): FinancialYear[] {
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  const tables = Array.from(html.matchAll(tableRe)).map(m => m[0]);

  for (const table of tables) {
    if (!table.toLowerCase().includes('prihod')) continue;

    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    const rows = Array.from(table.matchAll(rowRe)).map(m => m[0]);
    if (rows.length < 2) continue;

    // Find years anywhere in the table text
    const tableText = strip(table).toLowerCase();
    const yearsFound = new Set<number>();
    const yearRe = /\b(20[12]\d)\b/g;
    let ym: RegExpExecArray | null;
    while ((ym = yearRe.exec(tableText)) !== null) yearsFound.add(parseInt(ym[1], 10));
    const years = Array.from(yearsFound).sort((a, b) => a - b);
    if (years.length < 2) continue;

    // Initialise result map
    const result = new Map<number, FinancialYear>();
    for (const y of years) {
      result.set(y, { year: y, ukupni_prihodi: null, ukupni_rashodi: null, dobitak_gubitak: null, broj_zaposlenih: null });
    }

    // Determine orientation: are years in the first row's cells?
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const firstRowCells = Array.from(rows[0].matchAll(cellRe)).map(m => strip(m[0]));
    const yearsInHeader = firstRowCells.filter(c => /\b20[12]\d\b/.test(c)).length;

    if (yearsInHeader >= 2) {
      // Rows = metrics, cols = years (most common on CompanyWall)
      const colToYear: (number | null)[] = firstRowCells.map(c => {
        const m = /\b(20[12]\d)\b/.exec(c);
        return m ? parseInt(m[1], 10) : null;
      });

      for (let ri = 1; ri < rows.length; ri++) {
        const cells = Array.from(rows[ri].matchAll(cellRe)).map(m => strip(m[0]));
        if (cells.length < 2) continue;
        const label = cells[0].toLowerCase();

        const isRev = label.includes('ukupni prihod') || (label.includes('prihod') && !label.includes('rashod'));
        const isExp = label.includes('ukupni rashod') || (label.includes('rashod') && !label.includes('prihod'));
        const isProfit = label.includes('dobitak') || label.includes('gubitak') || label.includes('dobit');
        const isEmp = label.includes('zaposlen') || label.includes('radnik') || label.includes('broj zaposleni');

        for (let ci = 1; ci < cells.length && ci < colToYear.length; ci++) {
          const year = colToYear[ci];
          if (!year) continue;
          const entry = result.get(year);
          if (!entry) continue;
          const val = parseCrNum(cells[ci]);
          if (val === null) continue;
          if (isRev && entry.ukupni_prihodi === null) entry.ukupni_prihodi = val;
          else if (isExp && entry.ukupni_rashodi === null) entry.ukupni_rashodi = val;
          else if (isProfit && entry.dobitak_gubitak === null) entry.dobitak_gubitak = val;
          else if (isEmp && entry.broj_zaposlenih === null) entry.broj_zaposlenih = Math.abs(val);
        }
      }
    } else {
      // Rows = years, cols = metrics
      const headerCells = Array.from(rows[0].matchAll(cellRe)).map(m => strip(m[0]).toLowerCase());
      const colType: string[] = headerCells.map(h => {
        if (h.includes('prihod') && !h.includes('rashod')) return 'rev';
        if (h.includes('rashod')) return 'exp';
        if (h.includes('dobitak') || h.includes('dobit') || h.includes('gubitak')) return 'profit';
        if (h.includes('zaposlen') || h.includes('radnik')) return 'emp';
        return '';
      });

      for (let ri = 1; ri < rows.length; ri++) {
        const cells = Array.from(rows[ri].matchAll(cellRe)).map(m => strip(m[0]));
        if (cells.length < 2) continue;
        const yrM = /\b(20[12]\d)\b/.exec(cells[0]);
        if (!yrM) continue;
        const year = parseInt(yrM[1], 10);
        const entry = result.get(year);
        if (!entry) continue;
        for (let ci = 1; ci < cells.length && ci < colType.length; ci++) {
          const val = parseCrNum(cells[ci]);
          if (val === null) continue;
          if (colType[ci] === 'rev' && entry.ukupni_prihodi === null) entry.ukupni_prihodi = val;
          else if (colType[ci] === 'exp' && entry.ukupni_rashodi === null) entry.ukupni_rashodi = val;
          else if (colType[ci] === 'profit' && entry.dobitak_gubitak === null) entry.dobitak_gubitak = val;
          else if (colType[ci] === 'emp' && entry.broj_zaposlenih === null) entry.broj_zaposlenih = Math.abs(val);
        }
      }
    }

    const history = Array.from(result.values())
      .filter(r => r.ukupni_prihodi !== null)
      .sort((a, b) => a.year - b.year);

    if (history.length > 0) return history;
  }
  return [];
}

function calcRevenueGrowth(history: FinancialYear[]): number | null {
  const valid = history.filter(h => h.ukupni_prihodi !== null && h.ukupni_prihodi > 0);
  if (valid.length < 2) return null;
  const oldest = valid[0].ukupni_prihodi!;
  const newest = valid[valid.length - 1].ukupni_prihodi!;
  return Math.round(((newest - oldest) / oldest) * 100);
}

function parseEmployeesFallback(html: string): number | null {
  const text = strip(html);
  const idx = text.search(/zaposlen|radnik|djelatnik/);
  if (idx === -1) return null;
  const m = /\b(\d+)\b/.exec(text.slice(Math.max(0, idx - 100), idx + 300));
  return m ? parseInt(m[1], 10) : null;
}

// ── Main export ───────────────────────────────────────────────────────────

export async function scrapeCompanyWall(url: string): Promise<ScrapedCompanyData> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const financialHistory = parseFinancialHistory(html);
  const revenueGrowth = calcRevenueGrowth(financialHistory);
  const latestRevenue = financialHistory.length > 0
    ? financialHistory[financialHistory.length - 1].ukupni_prihodi
    : null;
  const latestEmployees = financialHistory.length > 0
    ? financialHistory[financialHistory.length - 1].broj_zaposlenih
    : parseEmployeesFallback(html);

  const nkdCode = parseNkdCode(html);
  const niche = (nkdCode ? nicheFromCode(nkdCode) : null) ?? nicheFromText(strip(html));

  const addr = parseAddress(html);

  return {
    name: parseName(html),
    ownerName: parseOwnerName(html),
    phoneNumber: parsePhone(html),
    foundedYear: parseFoundedYear(html),
    companySize: parseCompanySize(html),
    bonitetGrade: parseBonitetGrade(html),
    nkdCode: nkdCode ?? null,
    niche,
    fullAddress: addr.fullAddress,
    postalCode: addr.postalCode,
    city: addr.city,
    annualRevenue: latestRevenue,
    employees: latestEmployees,
    financialHistory,
    revenueGrowth,
  };
}
