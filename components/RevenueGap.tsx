import { ScoredBusiness } from '@/types';
import { calcRevenueLoss } from '@/lib/revenue';

interface Props {
  subject: ScoredBusiness;
  competitors: ScoredBusiness[];
  niche: string;
}

export default function RevenueGap({ subject, competitors, niche }: Props) {
  const { monthlyLoss, annualLoss, dailyCost } = calcRevenueLoss(subject, competitors, niche);

  return (
    <section className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Upozorenje</p>
        <h2 className="text-white font-bold text-xl sm:text-2xl leading-snug">
          Potencijalni prihod koji ostavljate na stolu
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-700 mx-6 rounded-xl overflow-hidden">
        <div className="bg-slate-800 px-5 py-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Mjesečni gubitak</p>
          <p className="text-[#F97316] font-black leading-none" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
            {monthlyLoss.toLocaleString('hr-HR')} EUR
          </p>
        </div>
        <div className="bg-slate-800 px-5 py-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Godišnji gubitak</p>
          <p className="text-red-400 font-black leading-none" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
            {annualLoss.toLocaleString('hr-HR')} EUR
          </p>
        </div>
      </div>

      <div className="bg-red-950/60 border-t border-red-800/40 mx-0 px-6 py-4 mt-0">
        <p className="text-red-300 text-sm font-semibold text-center">
          Svaki dan bez akcije košta vas{' '}
          <span className="text-white font-black text-base">{dailyCost} EUR</span>
        </p>
      </div>
    </section>
  );
}
