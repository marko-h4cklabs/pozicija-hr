'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Report } from '@/types';
import { metaAdsUrl } from '@/lib/ads';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://pozicija-hr.com';
const DOMAIN = BASE_URL.replace(/^https?:\/\//, '');

// Applied on every keystroke: lowercase, spaces→hyphens, strip invalid chars.
// Deliberately does NOT remove trailing hyphens so the user can type "inmont-project".
function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Applied on blur: collapse runs of hyphens and trim leading/trailing.
function finalizeSlug(value: string): string {
  return value.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

interface Props {
  report: Report;
}

export default function ReviewClient({ report }: Props) {
  const router = useRouter();
  const { subject, competitors } = report.report_data;
  const allBusinesses = [subject, ...competitors];

  const [metaSelections, setMetaSelections] = useState<Record<string, boolean | null>>(
    report.meta_ads_manual ?? {}
  );
  const [customSlug, setCustomSlug] = useState(report.custom_slug ?? report.slug);
  const [slugError, setSlugError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  function setMeta(name: string, value: boolean | null) {
    setMetaSelections((prev) => ({ ...prev, [name]: value }));
  }

  function handleSlugChange(raw: string) {
    setCustomSlug(sanitizeSlug(raw));
    setSlugError('');
  }

  function handleSlugBlur() {
    setCustomSlug((prev) => finalizeSlug(prev));
  }

  async function handlePublish() {
    if (!customSlug) {
      setSlugError('URL izvještaja ne može biti prazan.');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(customSlug)) {
      setSlugError('Neispravan format. Koristite samo mala slova, brojeve i crtice.');
      return;
    }

    setPublishError('');
    setPublishing(true);

    const meta_ads_manual: Record<string, boolean> = {};
    for (const [name, val] of Object.entries(metaSelections)) {
      if (val === true || val === false) meta_ads_manual[name] = val;
    }

    try {
      const res = await fetch('/api/publish-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: report.slug, custom_slug: customSlug, meta_ads_manual }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Greška pri objavljivanju.');
      router.push('/admin?published=1');
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Greška pri objavljivanju.');
      setPublishing(false);
    }
  }

  const isPublished = report.status === 'published';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#0F172A] px-6 py-4 flex items-center gap-4">
        <a href="/admin" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Admin
        </a>
        <span className="text-white font-bold text-xl">
          Pregled izvještaja
        </span>
        {isPublished && (
          <span className="ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-700 text-green-100">
            OBJAVLJENO
          </span>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Report summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sažetak izvještaja</p>
          <h1 className="text-2xl font-black text-slate-900 mb-1">{report.business_name}</h1>
          <p className="text-slate-500 text-sm mb-4">{report.business_city} · {report.business_niche}</p>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-black text-[#F97316]">{subject.totalScore}</p>
              <p className="text-xs text-slate-400 mt-0.5">od 100</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Konkurenti</p>
              <div className="flex flex-wrap gap-2">
                {competitors.map((c) => (
                  <span key={c.name} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">
                    {c.name} · {c.totalScore}/100
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Meta Ads review table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ručna provjera</p>
            <h2 className="font-bold text-slate-800">Meta oglasi</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Otvori Ad Library za svaku tvrtku i postavi DA / NE ručno.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500">Tvrtka</th>
                <th className="px-6 py-2.5 text-xs font-semibold text-slate-500 text-center">Ad Library</th>
                <th className="px-6 py-2.5 text-xs font-semibold text-slate-500 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {allBusinesses.map((b, i) => {
                const sel = metaSelections[b.name];
                return (
                  <tr key={b.name} className={`border-b border-slate-100 ${i === 0 ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {b.name}
                      {i === 0 && (
                        <span className="ml-2 text-xs text-orange-500 font-normal">vaše</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <a
                        href={metaAdsUrl(b.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        Provjeri →
                      </a>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMeta(b.name, sel === true ? null : true)}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border-2 transition-colors ${
                            sel === true
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-200 text-slate-400 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          DA
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeta(b.name, sel === false ? null : false)}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border-2 transition-colors ${
                            sel === false
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-600'
                          }`}
                        >
                          NE
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Slug editor */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">URL izvještaja</p>
          <h2 className="font-bold text-slate-800 mb-4">Prilagodi link</h2>

          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Slug (putanja URL-a)
          </label>
          <input
            type="text"
            value={customSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            onBlur={handleSlugBlur}
            placeholder="npr. dental-jelic-zagreb"
            className={`w-full border rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] ${
              slugError ? 'border-red-400 bg-red-50' : 'border-slate-200'
            }`}
          />
          {slugError && <p className="text-red-500 text-xs mt-1">{slugError}</p>}

          <div className="mt-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-400 mb-0.5">Pregled linka:</p>
            <p className="text-sm font-mono text-slate-700 break-all">
              {DOMAIN}/
              <span className="text-[#F97316] font-bold">{customSlug || '...'}</span>
            </p>
          </div>
        </div>

        {/* Publish button */}
        <div className="space-y-3">
          {publishError && (
            <p className="text-red-500 text-sm font-medium">{publishError}</p>
          )}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-300 transition-colors text-white font-black py-4 px-8 rounded-2xl text-lg shadow-lg shadow-orange-200"
          >
            {publishing ? 'Objavljivanje...' : isPublished ? 'Ažuriraj i objavi ponovo' : 'Objavi izvještaj'}
          </button>
          <p className="text-center text-xs text-slate-400">
            Nakon objave, izvještaj postaje dostupan na javnom linku.
          </p>
        </div>

      </div>
    </div>
  );
}
