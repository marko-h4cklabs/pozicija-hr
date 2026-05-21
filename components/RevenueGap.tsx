import { ScoredBusiness } from '@/types';
import { parseRevenueForDisplay } from '@/lib/revenue';

interface Props {
  subject: ScoredBusiness;
  competitors: ScoredBusiness[];
  niche: string;
  aiAnalysis?: string | null;
  annualRevenue?: number | null;
}

export default function RevenueGap({ aiAnalysis }: Props) {
  const revenue = parseRevenueForDisplay(aiAnalysis);
  if (!revenue) return null;

  const fmt = (n: number) => n.toLocaleString('hr-HR');

  const monthlyStr =
    revenue.monthlyLow === revenue.monthlyHigh
      ? `${fmt(revenue.monthlyLow)} EUR`
      : `${fmt(revenue.monthlyLow)} – ${fmt(revenue.monthlyHigh)} EUR`;

  const annualStr = `${fmt(revenue.annualHigh)} EUR`;

  return (
    <section className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4">
        <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Upozorenje</p>
        <h2 className="text-white font-bold text-lg sm:text-2xl leading-snug">
          Potencijalni prihod koji ostavljate na stolu
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-700 mx-4 sm:mx-6 mb-4 sm:mb-6 rounded-xl overflow-hidden">
        <div className="bg-slate-800 px-4 sm:px-5 py-4 sm:py-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Mjesečni gubitak</p>
          <p className="text-[#F97316] font-black leading-none" style={{ fontSize: 'clamp(2rem, 4vw, 2.25rem)' }}>
            {monthlyStr}
          </p>
        </div>
        <div className="bg-slate-800 px-4 sm:px-5 py-4 sm:py-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Godišnji gubitak</p>
          <p className="text-red-400 font-black leading-none" style={{ fontSize: 'clamp(2rem, 4vw, 2.25rem)' }}>
            {annualStr}
          </p>
        </div>
      </div>
    </section>
  );
}
