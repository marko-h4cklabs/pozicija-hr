import { ScoredBusiness, ProjectionData } from '@/types';

const MONTHLY_REVIEW_GROWTH_BY_NICHE: Record<string, number> = {
  'Dentist': 18,
  'Restoran': 12,
  'Hotel': 8,
  'Odvjetnik': 5,
  'Teretana': 6,
  'Frizerski salon': 8,
  'Automehaničar': 5,
  'Maloprodaja': 7,
  'Građevina': 4,
  'Drugo': 5,
};

function getNicheRate(niche: string): number {
  return MONTHLY_REVIEW_GROWTH_BY_NICHE[niche] ?? 5;
}

function subjectMonthlyGrowth(reviewCount: number, niche: string): number {
  const nicheRate = getNicheRate(niche);
  if (reviewCount < 30) return 1;
  if (reviewCount < 100) return 2.5;
  return Math.round(nicheRate * 0.4 * 10) / 10;
}

function competitorMonthlyGrowth(reviewCount: number, niche: string): number {
  if (reviewCount >= 50) return getNicheRate(niche);
  return 2;
}

function project(current: number, monthlyGrowth: number, months: number): number {
  return Math.round(current + monthlyGrowth * months);
}

export function calcProjectionData(
  subject: ScoredBusiness,
  competitors: ScoredBusiness[],
  niche: string,
): ProjectionData | null {
  if (competitors.length === 0) return null;

  const topComp = competitors.reduce((best, c) =>
    (c.reviewCount ?? 0) > (best.reviewCount ?? 0) ? c : best
  );

  const subCount = subject.reviewCount ?? 0;
  const compCount = topComp.reviewCount ?? 0;

  const subGrowth = subjectMonthlyGrowth(subCount, niche);
  const compGrowth = competitorMonthlyGrowth(compCount, niche);

  const subIn3m = project(subCount, subGrowth, 3);
  const subIn6m = project(subCount, subGrowth, 6);
  const compIn3m = project(compCount, compGrowth, 3);
  const compIn6m = project(compCount, compGrowth, 6);

  const currentGap = Math.max(0, compCount - subCount);
  const projectedGap = Math.max(0, compIn6m - subIn6m);
  const gapGrowth = Math.max(0, projectedGap - currentGap);

  const base = Math.round(((projectedGap - currentGap) / Math.max(1, compIn6m)) * 100);
  const clamped = Math.max(0, Math.min(base, 99));

  return {
    subject: { name: subject.name, current: subCount, in3m: subIn3m, in6m: subIn6m },
    topCompetitor: { name: topComp.name, current: compCount, in3m: compIn3m, in6m: compIn6m },
    gapGrowth,
    marketShareLossMin: Math.max(0, clamped - 6),
    marketShareLossMax: Math.min(99, clamped + 6),
  };
}
