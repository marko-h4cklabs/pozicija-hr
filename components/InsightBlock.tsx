import { ScoredBusiness } from '@/types';

interface Props {
  subject: ScoredBusiness;
  competitors: ScoredBusiness[];
}

export default function InsightBlock({ subject, competitors }: Props) {
  if (competitors.length === 0) return null;

  const bestCompetitor = [...competitors].sort((a, b) => b.totalScore - a.totalScore)[0];

  // Determine worst metric gap
  const reviewGap = (bestCompetitor.reviewCount ?? 0) - (subject.reviewCount ?? 0);
  const ratingGap = (bestCompetitor.rating ?? 0) - (subject.rating ?? 0);
  const speedGap = (bestCompetitor.speedScore ?? 0) - (subject.speedScore ?? 0);

  let insight = '';

  const worstMetric = (() => {
    const gaps = [
      { key: 'reviews', gap: reviewGap },
      { key: 'rating', gap: ratingGap * 20 }, // scale to be comparable
      { key: 'speed', gap: speedGap },
    ].sort((a, b) => b.gap - a.gap);
    return gaps[0].key;
  })();

  if (worstMetric === 'reviews') {
    insight = `Vaš vodeći konkurent ima ${reviewGap} recenzija više od vas — svaka recenzija je povjerenje koje gubite.`;
  } else if (worstMetric === 'speed') {
    insight = `Vaša web stranica učitava se sporije od konkurencije — posjetitelji odlaze prije nego vide vašu ponudu.`;
  } else {
    insight = `Vaša prosječna ocjena je niža od tvrtke ${bestCompetitor.name} — prvi dojam na Google-u je ključan.`;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-[#F97316] rounded-r-xl p-6">
      <p className="text-xs font-semibold text-[#F97316] uppercase tracking-wider mb-2">
        Ključni uvid
      </p>
      <p className="text-slate-800 font-semibold text-lg leading-snug">{insight}</p>
    </div>
  );
}
