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

export default function WebsiteBasics({ subject }: Props) {
  const hasAnyData = subject.hasSsl !== undefined || subject.hasCta !== undefined;

  if (!hasAnyData) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-800 mb-5">Osnove web stranice</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Sigurnost</p>
          <StatusBadge value={subject.hasSsl} label="SSL certifikat (HTTPS)" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Poziv na akciju</p>
          <StatusBadge value={subject.hasCta} label="CTA na naslovnoj" />
        </div>
      </div>
    </div>
  );
}
