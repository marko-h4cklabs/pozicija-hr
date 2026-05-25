import { ReviewSentiment as ReviewSentimentType } from '@/types';

interface Props {
  data: ReviewSentimentType;
  businessName: string;
}

export default function ReviewSentiment({ data, businessName }: Props) {
  const { positivni, negativni } = data;

  return (
    <section className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Analiza recenzija</p>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800">Glas vaših klijenata</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Što klijenti stvarno govore o {businessName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-200">
        <div className="bg-white px-4 sm:px-5 py-4 sm:py-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm">
              ✓
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Što hvale</p>
          </div>
          {positivni.length > 0 ? (
            <ul className="space-y-2">
              {positivni.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">Nema dovoljno podataka</p>
          )}
        </div>

        <div className="bg-white px-4 sm:px-5 py-4 sm:py-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-sm">
              !
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">Na što se žale</p>
          </div>
          {negativni.length > 0 ? (
            <ul className="space-y-2">
              {negativni.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">Nema pritužbi u recenzijama</p>
          )}
        </div>
      </div>


    </section>
  );
}
