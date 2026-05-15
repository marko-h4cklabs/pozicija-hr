'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Report, ManualCompetitor } from '@/types';

const NICHES = [
  'Restoran',
  'Dentist',
  'Automehaničar',
  'Frizerski salon',
  'Odvjetnik',
  'Teretana',
  'Hotel',
  'Maloprodaja',
  'Drugo',
];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://pozicija-hr.com';

interface Props {
  reports: Report[];
}

export default function AdminClient({ reports }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    business_name: '',
    business_url: '',
    business_city: '',
    business_niche: '',
  });
  const [manualCompetitors, setManualCompetitors] = useState<ManualCompetitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successSlug, setSuccessSlug] = useState('');
  const [copiedSlug, setCopiedSlug] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addCompetitor() {
    if (manualCompetitors.length < 4) {
      setManualCompetitors((prev) => [...prev, { name: '', url: '' }]);
    }
  }

  function removeCompetitor(index: number) {
    setManualCompetitors((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCompetitor(index: number, field: keyof ManualCompetitor, value: string) {
    setManualCompetitors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessSlug('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          manual_competitors: manualCompetitors.filter((c) => c.name.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.slug) throw new Error(data.error ?? 'Greška');

      setSuccessSlug(data.slug);
      setForm({ business_name: '', business_url: '', business_city: '', business_niche: '' });
      setManualCompetitors([]);
      router.refresh();
    } catch {
      setError('Došlo je do greške. Molimo pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${BASE_URL}/izvjestaj/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(''), 2000);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-xl">
          Pozicija<span className="text-[#F97316]">HR</span>{' '}
          <span className="text-slate-400 font-normal text-sm">Admin</span>
        </span>
        <form action="/api/admin-logout" method="POST">
          <button className="text-slate-400 hover:text-white text-sm transition-colors">
            Odjava
          </button>
        </form>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {/* Section A: Generate report */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Generiraj izvještaj za prospects</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Core business fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Naziv tvrtke *
                  </label>
                  <input
                    type="text"
                    name="business_name"
                    value={form.business_name}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Web stranica
                  </label>
                  <input
                    type="url"
                    name="business_url"
                    value={form.business_url}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Grad *
                  </label>
                  <input
                    type="text"
                    name="business_city"
                    value={form.business_city}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Djelatnost *
                  </label>
                  <select
                    name="business_niche"
                    value={form.business_niche}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    required
                  >
                    <option value="" disabled>Odaberite</option>
                    {NICHES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manual competitors section */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Dodajte konkurente ručno{' '}
                      <span className="font-normal text-slate-400">(opcionalno)</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ako dodate konkurente, automatsko otkrivanje se preskače.
                      Ocjene i recenzije i dalje se dohvaćaju s Google Mapsa.
                    </p>
                  </div>
                  {manualCompetitors.length < 4 && (
                    <button
                      type="button"
                      onClick={addCompetitor}
                      className="ml-4 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      + Dodaj konkurenta
                    </button>
                  )}
                </div>

                {manualCompetitors.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {manualCompetitors.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => updateCompetitor(i, 'name', e.target.value)}
                          placeholder={`Naziv konkurenta ${i + 1}`}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                        />
                        <input
                          type="url"
                          value={c.url}
                          onChange={(e) => updateCompetitor(i, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                        />
                        <button
                          type="button"
                          onClick={() => removeCompetitor(i)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors text-lg font-bold"
                          title="Ukloni"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              {successSlug && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-green-700 text-sm font-medium">Izvještaj generiran!</span>
                  <button
                    type="button"
                    onClick={() => copyLink(successSlug)}
                    className="text-[#F97316] text-sm font-semibold hover:underline"
                  >
                    Kopiraj link
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-300 transition-colors text-white font-bold py-3 px-8 rounded-xl"
              >
                {loading ? 'Generiranje...' : 'Generiraj izvještaj'}
              </button>
            </form>
          </div>
        </section>

        {/* Section B: Reports table */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Svi izvještaji ({reports.length})
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tvrtka</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Grad</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Djelatnost</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Generirano</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Otvaranja</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Zadnje otvoreno</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.business_name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.business_city}</td>
                      <td className="px-4 py-3 text-slate-600">{r.business_niche}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          r.open_count > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.open_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.opened_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyLink(r.slug)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                              copiedSlug === r.slug
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-50 text-[#F97316] hover:bg-orange-100'
                            }`}
                          >
                            {copiedSlug === r.slug ? 'Kopirano!' : 'Kopiraj link'}
                          </button>
                          <a
                            href={`/api/generate-pdf/${r.slug}`}
                            download={`${r.business_name}-izvjestaj.pdf`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
                          >
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Nema izvještaja još.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
