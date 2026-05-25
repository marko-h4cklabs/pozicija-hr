import { ProjectionData } from '@/types';

interface Props {
  data: ProjectionData;
}

function TimelineColumn({
  label,
  subjectCount,
  competitorCount,
  highlight,
}: {
  label: string;
  subjectCount: number;
  competitorCount: number;
  highlight?: boolean;
}) {
  const gap = Math.max(0, competitorCount - subjectCount);
  return (
    <div className={`flex flex-col items-center px-3 py-4 rounded-xl ${highlight ? 'bg-[#5a1a1a]' : 'bg-[#3d1010]'}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${highlight ? 'text-red-300' : 'text-red-400/70'}`}>
        {label}
      </p>
      <div className="w-full space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-red-200/60">Vi</span>
          <span className="text-sm font-bold text-white">{subjectCount.toLocaleString('hr-HR')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-red-200/60">Konk.</span>
          <span className="text-sm font-bold text-red-300">{competitorCount.toLocaleString('hr-HR')}</span>
        </div>
      </div>
      <div className={`w-full rounded-lg px-2 py-1.5 text-center ${highlight ? 'bg-red-900/60' : 'bg-red-900/30'}`}>
        <p className="text-[10px] text-red-300/70 uppercase tracking-wide">Zaostatak</p>
        <p className={`font-black text-base ${highlight ? 'text-red-300' : 'text-red-400/80'}`}>
          {gap > 0 ? `+${gap.toLocaleString('hr-HR')}` : '0'}
        </p>
      </div>
    </div>
  );
}

export default function NothingChanges({ data }: Props) {
  const { subject, topCompetitor, gapGrowth, marketShareLossMin, marketShareLossMax } = data;

  return (
    <section className="rounded-2xl overflow-hidden shadow-xl" style={{ background: '#2a0a0a' }}>
      <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3">
        <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Projekcija</p>
        <h2 className="text-white font-bold text-lg sm:text-2xl leading-snug">
          Ako se ništa ne promijeni
        </h2>
        <p className="text-red-200/60 text-sm mt-1">
          Rast broja recenzija sljedećih 6 mjeseci — bez ikakve akcije s vaše strane
        </p>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <TimelineColumn
            label="Danas"
            subjectCount={subject.current}
            competitorCount={topCompetitor.current}
          />
          <TimelineColumn
            label="Za 3 mj."
            subjectCount={subject.in3m}
            competitorCount={topCompetitor.in3m}
          />
          <TimelineColumn
            label="Za 6 mj."
            subjectCount={subject.in6m}
            competitorCount={topCompetitor.in6m}
            highlight
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#3d1010] px-4 py-3 flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">
              Zaostatak će narasti za
            </p>
            <p className="text-red-300 font-black text-2xl">
              {gapGrowth > 0 ? `+${gapGrowth.toLocaleString('hr-HR')}` : '0'}{' '}
              <span className="text-sm font-semibold text-red-400/70">recenzija</span>
            </p>
          </div>

          <div className="rounded-xl bg-[#3d1010] px-4 py-3 flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">
              Procijenjeni gubitak tržišnog udjela
            </p>
            <p className="text-red-300 font-black text-2xl">
              {marketShareLossMin}–{marketShareLossMax}
              <span className="text-sm font-semibold text-red-400/70"> %</span>
            </p>
          </div>
        </div>

        <p className="text-[11px] text-red-400/40 mt-3 text-center">
          Procjena temeljena na industrijskim benchmarkovima rasta recenzija · nije garantirani ishod
        </p>
      </div>
    </section>
  );
}
