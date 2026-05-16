'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ScoredBusiness } from '@/types';

interface Props {
  subject: ScoredBusiness;
}

function calcProjections(subject: ScoredBusiness) {
  const speed = 50;
  const reviews = subject.reviewCount ?? 0;
  const hasAds = subject.hasGoogleAds === true;
  const hasCta = subject.hasCta === true;
  const hasSsl = subject.hasSsl !== false;
  const rating = subject.rating ?? 3.5;

  // ── Leads/month ──────────────────────────────────────────────────────────
  const baseLeads = Math.max(1, Math.round(reviews / 10));

  let leads6moGain = 0;
  if (speed < 80) leads6moGain += Math.round(((80 - speed) / 10) * 3);
  if (!hasAds) leads6moGain += 8;
  if (reviews < 100) leads6moGain += Math.round(((100 - reviews) / 50) * 2);
  if (!hasCta) leads6moGain += 4;

  const leads3mo = baseLeads + Math.round(leads6moGain / 2);
  const leads6mo = baseLeads + leads6moGain;

  // ── Google visibility % ──────────────────────────────────────────────────
  const baseVisibility = Math.min(
    70,
    Math.round(speed / 2) +
      (rating >= 4 ? 20 : rating >= 3.5 ? 12 : 6) +
      (reviews >= 100 ? 15 : reviews >= 30 ? 8 : 3) +
      (hasAds ? 12 : 0)
  );

  let vis6moGain = 0;
  if (speed < 80) vis6moGain += 15;
  if (!hasAds) vis6moGain += 10;
  if (reviews < 100) vis6moGain += 5;

  const vis3mo = Math.min(95, baseVisibility + Math.round(vis6moGain / 2));
  const vis6mo = Math.min(95, baseVisibility + vis6moGain);

  // ── Web conversion % ─────────────────────────────────────────────────────
  const baseConv = parseFloat(
    (
      1.0 +
      (hasCta ? 1.5 : 0) +
      (speed >= 80 ? 0.5 : 0) +
      (hasSsl ? 0.3 : 0)
    ).toFixed(1)
  );

  let conv6moGain = 0;
  if (!hasCta) conv6moGain += 1.5;
  if (speed < 80) conv6moGain += 0.5;

  const conv3mo = parseFloat((baseConv + conv6moGain / 2).toFixed(1));
  const conv6mo = parseFloat((baseConv + conv6moGain).toFixed(1));

  // ── Revenue projection ───────────────────────────────────────────────────
  const extraRevenue = Math.round((leads6mo - baseLeads) * 12 * 150);

  return {
    leads: [
      { period: 'Trenutno', value: baseLeads },
      { period: 'Za 3 mj', value: leads3mo },
      { period: 'Za 6 mj', value: leads6mo },
    ],
    visibility: [
      { period: 'Trenutno', value: baseVisibility },
      { period: 'Za 3 mj', value: vis3mo },
      { period: 'Za 6 mj', value: vis6mo },
    ],
    conversion: [
      { period: 'Trenutno', value: baseConv },
      { period: 'Za 3 mj', value: conv3mo },
      { period: 'Za 6 mj', value: conv6mo },
    ],
    extraRevenue,
    leads6mo,
    baseLeads,
  };
}

const COLORS = {
  current: '#94a3b8',
  three: '#7dd3fc',
  six: '#F97316',
};

const BAR_COLORS = [COLORS.current, COLORS.three, COLORS.six];

function MiniChart({
  title,
  data,
  unit,
  domain,
}: {
  title: string;
  data: { period: string; value: number }[];
  unit: string;
  domain?: [number, number];
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            domain={domain}
            tickFormatter={(v) => `${v}${unit}`}
            width={38}
          />
          <Tooltip
            formatter={(v) => [`${v}${unit}`, title]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function GrowthChart({ subject }: Props) {
  const p = calcProjections(subject);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <h3 className="text-slate-800 font-bold text-lg leading-none">Projekcija rasta</h3>
        <p className="text-slate-500 text-sm mt-1">Procjena uz implementaciju preporuka</p>
      </div>

      <div className="px-6 py-6">
        {/* Legend */}
        <div className="flex items-center gap-5 mb-6 text-xs text-slate-600">
          {[
            { color: COLORS.current, label: 'Trenutno' },
            { color: COLORS.three, label: 'Za 3 mj' },
            { color: COLORS.six, label: 'Za 6 mj' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>

        {/* Charts */}
        <div className="flex gap-6 flex-wrap sm:flex-nowrap">
          <MiniChart title="Leads / mj" data={p.leads} unit="" domain={[0, Math.max(p.leads6mo + 2, 10)]} />
          <MiniChart title="Vidljivost Google (%)" data={p.visibility} unit="%" domain={[0, 100]} />
          <MiniChart title="Konverzija web (%)" data={p.conversion} unit="%" domain={[0, 5]} />
        </div>

        {/* Revenue callout */}
        {p.extraRevenue > 0 && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-slate-700 font-medium">
              Procijenjeni dodatni prihod za 6 mjeseci:
            </p>
            <p className="text-2xl font-bold text-[#F97316]">
              {p.extraRevenue.toLocaleString('hr-HR')} EUR
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
