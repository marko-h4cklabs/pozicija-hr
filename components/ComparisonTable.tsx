import { ScoredBusiness } from '@/types';
import { metaAdsUrl } from '@/lib/ads';

interface Props {
  subject: ScoredBusiness;
  competitors: ScoredBusiness[];
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

export default function ComparisonTable({ subject, competitors }: Props) {
  const all = [subject, ...competitors];
  const credibilities = all.map((b) => b.credibilityScore ?? (b.reviewsScore + b.ratingScore));
  const speeds = all.map((b) => b.speedScore);
  const scores = all.map((b) => b.totalScore);

  const hasGoogleAdsData = all.some((b) => b.hasGoogleAds !== undefined);

  return (
    <div className="overflow-x-auto">
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
          {/* Credibility (combined rating × reviews) */}
          <tr className="border-b border-slate-100">
            <td className="px-4 py-3 text-slate-600 font-medium">
              Kredibilitet
              <span className="block text-xs text-slate-400 font-normal">ocjena × recenzije</span>
            </td>
            <td className={`px-4 py-3 text-center border-x-2 border-[#F97316] bg-orange-50 ${highlight(credibilities, 0)}`}>
              <span className="font-semibold">{credibilities[0]}/70</span>
              <span className="block text-xs text-slate-400">
                {subject.rating?.toFixed(1) ?? 'N/A'} ★ · {subject.reviewCount ?? 0} rec.
              </span>
            </td>
            {competitors.map((c, i) => (
              <td key={i} className={`px-4 py-3 text-center ${highlight(credibilities, i + 1)}`}>
                <span className="font-semibold">{credibilities[i + 1]}/70</span>
                <span className="block text-xs text-slate-400">
                  {c.rating?.toFixed(1) ?? 'N/A'} ★ · {c.reviewCount ?? 0} rec.
                </span>
              </td>
            ))}
          </tr>

          {/* Speed */}
          <tr className="border-b border-slate-100">
            <td className="px-4 py-3 text-slate-600 font-medium">Brzina web stranice</td>
            <td className={`px-4 py-3 text-center border-x-2 border-[#F97316] bg-orange-50 ${highlight(speeds, 0)}`}>
              {subject.speedScore !== null ? `${subject.speedScore}/100` : 'N/A'}
            </td>
            {competitors.map((c, i) => (
              <td key={i} className={`px-4 py-3 text-center ${highlight(speeds, i + 1)}`}>
                {c.speedScore !== null ? `${c.speedScore}/100` : 'N/A'}
              </td>
            ))}
          </tr>

          {/* Meta Ads — always show, link to Ad Library for each business */}
          <tr className="border-b border-slate-100 bg-slate-50/40">
            <td className="px-4 py-3 text-slate-600 font-medium">Meta oglasi</td>
            <td className="px-4 py-3 text-center border-x-2 border-[#F97316] bg-orange-50">
              <MetaLinkCell name={subject.name} />
            </td>
            {competitors.map((c, i) => (
              <td key={i} className="px-4 py-3 text-center">
                <MetaLinkCell name={c.name} />
              </td>
            ))}
          </tr>

          {/* Google Ads — only shown when SerpApi data is available */}
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

          {/* Total */}
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
  );
}
