import { ScoredBusiness } from '@/types';

interface Props {
  subject: ScoredBusiness;
}

function StatusBadge({ value, label }: { value: boolean | null | undefined; label: string }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">?</span>
        <span className="text-slate-500 text-sm">{label}: <span className="font-medium">N/P</span></span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
          value ? 'bg-green-500' : 'bg-red-500'
        }`}
      >
        {value ? '✓' : '✗'}
      </span>
      <span className={`text-sm font-medium ${value ? 'text-green-700' : 'text-red-600'}`}>
        {label}
      </span>
    </div>
  );
}

function SpeedRow({ mobile, desktop }: { mobile: number | null; desktop: number | null | undefined }) {
  function color(score: number | null | undefined) {
    if (score == null) return 'text-slate-400';
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  }
  return (
    <div className="flex items-center gap-6">
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Mobile</p>
        <p className={`text-2xl font-black ${color(mobile)}`}>
          {mobile !== null ? mobile : '—'}
          <span className="text-sm font-normal text-slate-400">/100</span>
        </p>
      </div>
      <div className="w-px h-10 bg-slate-200" />
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Desktop</p>
        <p className={`text-2xl font-black ${color(desktop)}`}>
          {desktop !== null && desktop !== undefined ? desktop : '—'}
          <span className="text-sm font-normal text-slate-400">/100</span>
        </p>
      </div>
    </div>
  );
}

export default function WebsiteBasics({ subject }: Props) {
  const hasAnyData =
    subject.hasSsl !== undefined ||
    subject.hasCta !== undefined ||
    subject.desktopSpeedScore !== undefined;

  if (!hasAnyData) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-800 mb-5">Osnove web stranice</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* SSL */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Sigurnost</p>
          <StatusBadge value={subject.hasSsl} label="SSL certifikat (HTTPS)" />
        </div>

        {/* CTA */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Poziv na akciju</p>
          <StatusBadge value={subject.hasCta} label="CTA na naslovnoj" />
        </div>

        {/* PageSpeed */}
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">PageSpeed</p>
          <SpeedRow mobile={subject.speedScore} desktop={subject.desktopSpeedScore} />
        </div>
      </div>
    </div>
  );
}
