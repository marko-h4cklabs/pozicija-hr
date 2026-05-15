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
  return 8000;
}

export function calcRevenueLoss(
  subject: ScoredBusiness,
  competitors: ScoredBusiness[],
  niche: string
): { monthlyLoss: number; annualLoss: number; dailyCost: number } {
  const topScore =
    competitors.length > 0
      ? Math.max(...competitors.map((c) => c.totalScore))
      : subject.totalScore;
  const scoreGap = Math.max(10, topScore - subject.totalScore);
  const industryValue = getIndustryMonthlyValue(niche);
  const monthlyLoss = Math.round((scoreGap / 100) * industryValue);
  const annualLoss = monthlyLoss * 12;
  const dailyCost = Math.max(1, Math.round(monthlyLoss / 30));
  return { monthlyLoss, annualLoss, dailyCost };
}
