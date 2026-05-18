import { ScoredBusiness } from '@/types';

export function getIndustryMonthlyValue(niche: string): number {
  const n = niche.toLowerCase();
  if (n.includes('dent') || n.includes('stomatolog')) return 15000;
  if (n.includes('restoran') || n.includes('kafić') || n.includes('kafe') || n.includes('ugostit')) return 8000;
  if (n.includes('hotel') || n.includes('apartman') || n.includes('smještaj') || n.includes('turizam')) return 25000;
  if (n.includes('odvjetnik') || n.includes('pravnik') || n.includes('law')) return 20000;
  if (n.includes('teretana') || n.includes('fitness') || n.includes('gym') || n.includes('sport')) return 5000;
  if (n.includes('frizer') || n.includes('kozmetič') || n.includes('kozmet') || n.includes('salon')) return 3000;
  if (n.includes('mehaničar') || n.includes('automehan') || n.includes('autoservis') || n.includes('vulkan')) return 6000;
  if (n.includes('maloprodaja') || n.includes('trgovina') || n.includes('shop') || n.includes('prodavaon')) return 10000;
  if (n.includes('građevin') || n.includes('gradnja') || n.includes('konstruk')) return 12000;
  return 8000;
}

export function calcRevenueLoss(
  subject: ScoredBusiness,
  competitors: ScoredBusiness[],
  niche: string,
  annualRevenue?: number | null,
): { monthlyLoss: number; annualLoss: number; dailyCost: number } {
  const topScore =
    competitors.length > 0
      ? Math.max(...competitors.map((c) => c.totalScore))
      : subject.totalScore;
  const scoreGap = Math.max(10, topScore - subject.totalScore);

  let monthlyLoss: number;
  if (annualRevenue && annualRevenue > 0) {
    monthlyLoss = Math.round((scoreGap / 100) * (annualRevenue / 12) * 0.15);
  } else {
    monthlyLoss = Math.round((scoreGap / 100) * getIndustryMonthlyValue(niche));
  }

  const annualLoss = monthlyLoss * 12;
  const dailyCost = Math.max(1, Math.round(monthlyLoss / 30));
  return { monthlyLoss, annualLoss, dailyCost };
}

// ── AI-text revenue parsing ───────────────────────────────────────────────

export interface RevenueDisplay {
  monthlyLow: number;
  monthlyHigh: number;
  annualHigh: number;
}

function parseCrNum(s: string): number {
  return parseInt(s.replace(/\./g, ''), 10);
}

export function parseRevenueForDisplay(aiAnalysis: string | null | undefined): RevenueDisplay | null {
  if (!aiAnalysis) return null;

  const SECTION = 'PROCJENA IZGUBLJENOG PRIHODA';
  const start = aiAnalysis.indexOf(SECTION);
  if (start === -1) return null;

  let end = aiAnalysis.length;
  for (const next of ['ŠTO BI ODMAH TREBALI NAPRAVITI', 'RIZIK NEAKCIJE']) {
    const idx = aiAnalysis.indexOf(next, start + SECTION.length);
    if (idx !== -1 && idx < end) end = idx;
  }

  const section = aiAnalysis.slice(start + SECTION.length, end);
  const lower = section.toLowerCase();

  // Try "između X i Y EUR" or "X do Y EUR" or "X - Y EUR" patterns first
  const rangeRe = /(\d{1,3}(?:\.\d{3})*)\s*(?:do|-|–|i)\s*(\d{1,3}(?:\.\d{3})*)\s*EUR/gi;
  const ranges = Array.from(section.matchAll(rangeRe));

  if (ranges.length > 0) {
    const first = ranges[0];
    const lo = parseCrNum(first[1]);
    const hi = parseCrNum(first[2]);
    if (!isNaN(lo) && !isNaN(hi) && lo > 0 && hi > 0) {
      // Is this range monthly or annual?
      const after = section.slice((first.index ?? 0) + first[0].length, (first.index ?? 0) + first[0].length + 40).toLowerCase();
      const isAnnual = after.includes('god') || (lower.includes('godišnje') && !lower.includes('mjesečno'));
      if (isAnnual) {
        return { monthlyLow: Math.round(lo / 12), monthlyHigh: Math.round(hi / 12), annualHigh: hi };
      }
      return { monthlyLow: lo, monthlyHigh: hi, annualHigh: hi * 12 };
    }
  }

  // Fall back to individual EUR amounts
  const eurRe = /(\d{1,3}(?:\.\d{3})*)\s*EUR/gi;
  const amounts = Array.from(section.matchAll(eurRe))
    .map(m => ({ value: parseCrNum(m[1]), index: m.index ?? 0 }))
    .filter(a => !isNaN(a.value) && a.value > 0);

  if (amounts.length === 0) return null;

  const mjsIdx = lower.indexOf('mjes');
  const godIdx = lower.indexOf('god');

  const monthly = mjsIdx !== -1 ? amounts.filter(a => Math.abs(a.index - mjsIdx) < 120) : [];
  const annual = godIdx !== -1 ? amounts.filter(a => Math.abs(a.index - godIdx) < 120) : [];

  // If we have context-tagged amounts
  if (monthly.length > 0) {
    const lo = Math.min(...monthly.map(a => a.value));
    const hi = Math.max(...monthly.map(a => a.value));
    const annHi = annual.length > 0 ? Math.max(...annual.map(a => a.value)) : hi * 12;
    return { monthlyLow: lo, monthlyHigh: hi, annualHigh: annHi };
  }

  if (annual.length > 0) {
    const hi = Math.max(...annual.map(a => a.value));
    return { monthlyLow: Math.round(hi / 12), monthlyHigh: Math.round(hi / 12), annualHigh: hi };
  }

  // No context — split first half / second half heuristic
  if (amounts.length >= 2) {
    const mid = Math.ceil(amounts.length / 2);
    const mAmts = amounts.slice(0, mid);
    const aAmts = amounts.slice(mid);
    const mLo = Math.min(...mAmts.map(a => a.value));
    const mHi = Math.max(...mAmts.map(a => a.value));
    const annHi = Math.max(...aAmts.map(a => a.value));
    return { monthlyLow: mLo, monthlyHigh: mHi, annualHigh: annHi };
  }

  // Single amount — treat as monthly
  const n = amounts[0].value;
  if (n > 0) return { monthlyLow: n, monthlyHigh: n, annualHigh: n * 12 };

  return null;
}
