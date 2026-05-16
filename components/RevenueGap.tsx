import { ScoredBusiness } from '@/types';
import { calcRevenueLoss } from '@/lib/revenue';

interface Props {
  subject: ScoredBusiness;
  competitors: ScoredBusiness[];
  niche: string;
  aiAnalysis?: string | null;
}

function parseRevenueFromAi(text: string | null | undefined): { monthly: string; annual: string } | null {
  if (!text) return null;

  const SECTION = 'PROCJENA IZGUBLJENOG PRIHODA';
  const start = text.indexOf(SECTION);
  if (start === -1) return null;

  let end = text.length;
  for (const next of ['ŠTO BI ODMAH TREBALI NAPRAVITI', 'RIZIK NEAKCIJE']) {
    const idx = text.indexOf(next, start + SECTION.length);
    if (idx !== -1 && idx < end) end = idx;
  }

  const section = text.slice(start + SECTION.length, end);

  // Match numbers before EUR (Croatian thousands separator is a dot: 5.000)
  const eurRe = /(\d[\d.]*)\s*EUR/gi;
  const amounts = Array.from(section.matchAll(eurRe))
    .map(m => ({ value: parseInt(m[1].replace(/\./g, ''), 10), index: m.index! }))
    .filter(a => !isNaN(a.value) && a.value > 0);

  if (amounts.length === 0) return null;

  const fmt = (n: number) => n.toLocaleString('hr-HR');

  // Amounts before/at the word "mjes" (for "mjesečno") are monthly; the rest annual
  const mjsIdx = section.toLowerCase().indexOf('mjes');

  let monthly: typeof amounts;
  let annual: typeof amounts;

  if (mjsIdx !== -1) {
    monthly = amounts.filter(a => a.index <= mjsIdx + 20);
    annual = amounts.filter(a => a.index > mjsIdx + 20);
  } else {
    const mid = Math.ceil(amounts.length / 2);
    monthly = amounts.slice(0, mid);
    annual = amounts.slice(mid);
  }

  if (monthly.length === 0) return null;

  function toRange(arr: typeof amounts): string {
    if (arr.length === 1) return `${fmt(arr[0].value)} EUR`;
    const lo = Math.min(...arr.map(a => a.value));
    const hi = Math.max(...arr.map(a => a.value));
    return lo === hi ? `${fmt(lo)} EUR` : `${fmt(lo)} – ${fmt(hi)} EUR`;
  }

  const monthlyStr = toRange(monthly);
  const annualStr = annual.length > 0
    ? toRange(annual)
    : `${fmt(Math.round(monthly.reduce((s, a) => s + a.value, 0) / monthly.length * 12))} EUR`;

  return { monthly: monthlyStr, annual: annualStr };
}

export default function RevenueGap({ subject, competitors, niche, aiAnalysis }: Props) {
  const parsed = parseRevenueFromAi(aiAnalysis);

  let monthlyStr: string;
  let annualStr: string;

  if (parsed) {
    monthlyStr = parsed.monthly;
    annualStr = parsed.annual;
  } else {
    const { monthlyLoss, annualLoss } = calcRevenueLoss(subject, competitors, niche);
    monthlyStr = `${monthlyLoss.toLocaleString('hr-HR')} EUR`;
    annualStr = `${annualLoss.toLocaleString('hr-HR')} EUR`;
  }

  return (
    <section className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Upozorenje</p>
        <h2 className="text-white font-bold text-xl sm:text-2xl leading-snug">
          Potencijalni prihod koji ostavljate na stolu
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-700 mx-6 mb-6 rounded-xl overflow-hidden">
        <div className="bg-slate-800 px-5 py-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Mjesečni gubitak</p>
          <p className="text-[#F97316] font-black leading-none" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
            {monthlyStr}
          </p>
        </div>
        <div className="bg-slate-800 px-5 py-5">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Godišnji gubitak</p>
          <p className="text-red-400 font-black leading-none" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
            {annualStr}
          </p>
        </div>
      </div>
    </section>
  );
}
