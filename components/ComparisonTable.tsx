import { ScoredBusiness } from '@/types';
import { metaAdsUrl } from '@/lib/ads';

interface Props {
  subject: ScoredBusiness;
  competitors: ScoredBusiness[];
  metaAdsManual?: Record<string, boolean>;
}

function highlight(values: (number | null)[], index: number): string {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return '';
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const val = values[index];
  if (val === null) return '';
  if (val === max && max !== min) return 'text-green-600 font-bold';
  if (val === min && max !== min) return 'text-red-500 font-bold';
  return '';
}

function GoogleAdsCell({ value }: { value: boolean | null | undefined }) {
  if (value === true)
    return <span className="font-semibold text-green-600">✓ DA</span>;
  if (value === false)
    return <span className="font-semibold text-red-500">✗ NE</span>;
  return <span className="text-slate-400">—</span>;
}

function MetaLinkCell({ name }: { name: string }) {
  return (
    <a
      href={metaAdsUrl(name)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap"
    >
      Provjeri →
    </a>
  );
}

function MetaCell({ name, manual }: { name: string; manual: boolean | undefined }) {
  if (manual === true) return <span className="font-semibold text-green-600">✓ DA</span>;
  if (manual === false) return <span className="font-semibold text-red-500">✗ NE</span>;
  return <MetaLinkCell name={name} />;
}

function MetricRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <span className="text-sm text-slate-600 font-medium">{label}</span>
        {sub && <span className="block text-xs text-slate-400">{sub}</span>}
      </div>
      <div className="text-right">{children}</div>
    </div>
  );
}

export default function ComparisonTable({ subject, competitors, metaAdsManual }: Props) {
  const all = [subject, ...competitors];
  const credibilities = all.map((b) => b.credibilityScore ?? (b.reviewsScore + b.ratingScore));
  const scores = all.map((b) => b.totalScore);

  const hasGoogleAdsData = all.some((b) => b.hasGoogleAds !== undefined);

  return (
    <>
      {/* ── Mobile: stacked cards (hidden on sm+) ──────────────────────── */}
      <div className="sm:hidden space-y-3 p-4">
        {/* Subject card */}
        <div className="rounded-xl border-2 border-[#F97316] overflow-hidden">
          <div className="bg-orange-50 px-4 py-3">
            <p className="font-bold text-[#F97316] text-sm leading-tight">{subject.name}</p>
            <p className="text-xs text-orange-400 mt-0.5">Vaše poduzeće</p>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            <MetricRow label="Kredibilitet" sub="ocjena × recenzije">
              <span className={`font-semibold text-sm ${highlight(credibilities, 0)}`}>{credibilities[0]}/100</span>
              <span className="block text-xs text-slate-400">{subject.rating?.toFixed(1) ?? 'N/A'} ★ · {subject.reviewCount ?? 0} rec.</span>
            </MetricRow>
            <MetricRow label="Meta oglasi">
              <MetaCell name={subject.name} manual={metaAdsManual?.[subject.name]} />
            </MetricRow>
            {hasGoogleAdsData && (
              <MetricRow label="Google oglasi">
                <GoogleAdsCell value={subject.hasGoogleAds} />
              </MetricRow>
            )}
            <MetricRow label="Ukupni rezultat">
              <span className={`font-bold text-base ${highlight(scores, 0)}`}>{subject.totalScore}/100</span>
            </MetricRow>
          </div>
        </div>

        {/* Competitor cards */}
        {competitors.map((c, i) => (
          <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3">
              <p className="font-bold text-slate-700 text-sm leading-tight">{c.name}</p>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              <MetricRow label="Kredibilitet" sub="ocjena × recenzije">
                <span className={`font-semibold text-sm ${highlight(credibilities, i + 1)}`}>{credibilities[i + 1]}/100</span>
                <span className="block text-xs text-slate-400">{c.rating?.toFixed(1) ?? 'N/A'} ★ · {c.reviewCount ?? 0} rec.</span>
              </MetricRow>
              <MetricRow label="Meta oglasi">
                <MetaCell name={c.name} manual={metaAdsManual?.[c.name]} />
              </MetricRow>
              {hasGoogleAdsData && (
                <MetricRow label="Google oglasi">
                  <GoogleAdsCell value={c.hasGoogleAds} />
                </MetricRow>
              )}
              <MetricRow label="Ukupni rezultat">
                <span className={`font-bold text-base ${highlight(scores, i + 1)}`}>{c.totalScore}/100</span>
              </MetricRow>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: table (hidden below sm) ───────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-slate-600 font-semibold w-40">Metrika</th>
              <th className="px-4 py-3 text-center font-semibold border-2 border-[#F97316] bg-orange-50 text-[#F97316]">
                {subject.name}
                <span className="block text-xs font-normal text-orange-400">Vaše poduzeće</span>
              </th>
              {competitors.map((c, i) => (
                <th key={i} className="px-4 py-3 text-center text-slate-700 font-semibold">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-4 py-3 text-slate-600 font-medium">
                Kredibilitet
                <span className="block text-xs text-slate-400 font-normal">ocjena × recenzije</span>
              </td>
              <td className={`px-4 py-3 text-center border-x-2 border-[#F97316] bg-orange-50 ${highlight(credibilities, 0)}`}>
                <span className="font-semibold">{credibilities[0]}/100</span>
                <span className="block text-xs text-slate-400">
                  {subject.rating?.toFixed(1) ?? 'N/A'} ★ · {subject.reviewCount ?? 0} rec.
                </span>
              </td>
              {competitors.map((c, i) => (
                <td key={i} className={`px-4 py-3 text-center ${highlight(credibilities, i + 1)}`}>
                  <span className="font-semibold">{credibilities[i + 1]}/100</span>
                  <span className="block text-xs text-slate-400">
                    {c.rating?.toFixed(1) ?? 'N/A'} ★ · {c.reviewCount ?? 0} rec.
                  </span>
                </td>
              ))}
            </tr>

            <tr className="border-b border-slate-100 bg-slate-50/40">
              <td className="px-4 py-3 text-slate-600 font-medium">Meta oglasi</td>
              <td className="px-4 py-3 text-center border-x-2 border-[#F97316] bg-orange-50">
                <MetaCell name={subject.name} manual={metaAdsManual?.[subject.name]} />
              </td>
              {competitors.map((c, i) => (
                <td key={i} className="px-4 py-3 text-center">
                  <MetaCell name={c.name} manual={metaAdsManual?.[c.name]} />
                </td>
              ))}
            </tr>

            {hasGoogleAdsData && (
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600 font-medium">Google oglasi</td>
                <td className="px-4 py-3 text-center border-x-2 border-[#F97316] bg-orange-50">
                  <GoogleAdsCell value={subject.hasGoogleAds} />
                </td>
                {competitors.map((c, i) => (
                  <td key={i} className="px-4 py-3 text-center">
                    <GoogleAdsCell value={c.hasGoogleAds} />
                  </td>
                ))}
              </tr>
            )}

            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-3 text-slate-700 font-bold">Ukupni rezultat</td>
              <td className={`px-4 py-3 text-center border-x-2 border-b-2 border-[#F97316] bg-orange-50 font-bold text-base ${highlight(scores, 0)}`}>
                {subject.totalScore}/100
              </td>
              {competitors.map((c, i) => (
                <td key={i} className={`px-4 py-3 text-center font-bold text-base ${highlight(scores, i + 1)}`}>
                  {c.totalScore}/100
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
