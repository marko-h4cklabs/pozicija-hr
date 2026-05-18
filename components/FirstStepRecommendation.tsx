import { FirstStepRecommendation as FirstStepType } from '@/types';

interface Props {
  data: FirstStepType;
}

export default function FirstStepRecommendation({ data }: Props) {
  return (
    <section className="my-10 rounded-2xl border border-blue-200 bg-blue-50 p-6 md:p-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-lg font-bold">
          1
        </span>
        <h2 className="text-xl font-bold text-blue-900">Preporučeni prvi korak</h2>
      </div>

      <div className="mb-3">
        <span className="inline-block rounded-full bg-blue-600 px-4 py-1 text-sm font-semibold text-white">
          {data.project}
        </span>
      </div>

      <p className="mb-4 text-gray-800 leading-relaxed">{data.reasoning}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white border border-blue-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Očekivani rezultat</p>
          <p className="text-gray-800 font-medium">{data.outcome}</p>
        </div>
        <div className="rounded-xl bg-white border border-blue-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Vremenski okvir</p>
          <p className="text-gray-800 font-medium">{data.timeline}</p>
        </div>
      </div>
    </section>
  );
}
