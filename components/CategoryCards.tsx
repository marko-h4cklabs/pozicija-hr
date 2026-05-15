import { ScoredBusiness } from '@/types';

interface Props {
  subject: ScoredBusiness;
  allBusinesses: ScoredBusiness[];
}

export default function CategoryCards({ subject, allBusinesses }: Props) {
  const rank =
    [...allBusinesses]
      .sort((a, b) => b.totalScore - a.totalScore)
      .findIndex((b) => b.name === subject.name) + 1;

  const total = allBusinesses.length;
  const reviewsAndRating = subject.reviewsScore + subject.ratingScore;

  function scoreBar(value: number, max: number) {
    const pct = Math.round((value / max) * 100);
    return (
      <div className="mt-3 bg-slate-100 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-[#F97316]"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Card 1 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
          Recenzije i ocjena
        </p>
        <p className="text-3xl font-black text-slate-800">
          {reviewsAndRating}
          <span className="text-base font-normal text-slate-400">/70</span>
        </p>
        {scoreBar(reviewsAndRating, 70)}
        <p className="text-slate-500 text-sm mt-3">
          {subject.reviewCount ?? 0} recenzija · ocjena{' '}
          {subject.rating !== null ? subject.rating.toFixed(1) : 'N/A'}
        </p>
      </div>

      {/* Card 2 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
          Brzina web stranice
        </p>
        <p className="text-3xl font-black text-slate-800">
          {subject.speedPoints}
          <span className="text-base font-normal text-slate-400">/30</span>
        </p>
        {scoreBar(subject.speedPoints, 30)}
        <p className="text-slate-500 text-sm mt-3">
          PageSpeed ocjena:{' '}
          {subject.speedScore !== null ? `${subject.speedScore}/100` : 'N/A'}
        </p>
      </div>

      {/* Card 3 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
          Ukupna pozicija
        </p>
        <p className="text-3xl font-black text-slate-800">
          #{rank}
          <span className="text-base font-normal text-slate-400"> od {total} tvrtki</span>
        </p>
        <div className="mt-3 bg-slate-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-[#F97316]"
            style={{ width: `${Math.round(((total - rank) / (total - 1 || 1)) * 100)}%` }}
          />
        </div>
        <p className="text-slate-500 text-sm mt-3">
          Ukupni rezultat: {subject.totalScore}/100
        </p>
      </div>
    </div>
  );
}
