'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Report, ManualCompetitor, FinancialYear, NicheTemplate } from '@/types';

const NICHES = [
  'Restoran',
  'Dentist',
  'Automehaničar',
  'Frizerski salon',
  'Odvjetnik',
  'Teretana',
  'Hotel',
  'Maloprodaja',
  'Građevina',
  'Drugo',
];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://pozicija-hr.com';

interface Props {
  reports: Report[];
  templates: NicheTemplate[];
  justPublished?: boolean;
}

interface ScrapedPreview {
  name: string;
  googleMapsName: string;
  googleMapsPlaceId: string | null;
  ownerName: string;
  phoneNumber: string;
  city: string;
  niche: string;
  annualRevenue: string;
  revenueGrowth: number | null;
  companySize: string;
  bonitetGrade: string;
  employees: number | null;
  foundedYear: string;
  financialHistory: FinancialYear[];
  dataSources: { hasCompanyWall: boolean; hasGoogleMaps: boolean };
}

type FormStep = 'input' | 'preview' | 'manual';

export default function AdminClient({ reports, templates: initialTemplates, justPublished }: Props) {
  const router = useRouter();

  // ── Shared state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<FormStep>('input');
  const [manualCompetitors, setManualCompetitors] = useState<ManualCompetitor[]>([{ name: '', url: '' }]);
  const [generating, setGenerating] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState('');
  const [copiedSlug, setCopiedSlug] = useState('');
  const [reportList, setReportList] = useState<Report[]>(reports);
  const [deletingSlug, setDeletingSlug] = useState('');

  // ── Templates state ───────────────────────────────────────────────────────
  const [templateList, setTemplateList] = useState<NicheTemplate[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loadedTemplateNiche, setLoadedTemplateNiche] = useState('');
  const [deletingTemplateId, setDeletingTemplateId] = useState('');
  const [templateModal, setTemplateModal] = useState<{
    open: boolean;
    name: string;
    niche: string;
    competitors: ManualCompetitor[];
    saving: boolean;
    error: string;
  }>({
    open: false, name: '', niche: NICHES[0], competitors: [{ name: '', url: '' }],
    saving: false, error: '',
  });

  // ── WhatsApp modal ───────────────────────────────────────────────────────
  const [waModal, setWaModal] = useState<{
    open: boolean;
    reportName: string;
    loading: boolean;
    message: string;
    copied: boolean;
  }>({ open: false, reportName: '', loading: false, message: '', copied: false });

  // ── Input step ───────────────────────────────────────────────────────────
  const [companyWallUrl, setCompanyWallUrl] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // ── Preview step (scraped + editable) ───────────────────────────────────
  const [preview, setPreview] = useState<ScrapedPreview | null>(null);

  // ── Manual fallback ──────────────────────────────────────────────────────
  const [manualForm, setManualForm] = useState({
    business_name: '',
    business_url: '',
    business_city: '',
    business_niche: '',
    annual_revenue: '',
  });

  // ── Fallback helper — extract a rough company name from the CompanyWall URL slug ──
  function nameHintFromUrl(cwUrl: string): string {
    try {
      const parts = new URL(cwUrl).pathname.split('/').filter(Boolean);
      // CompanyWall URLs: /tvrtka/<slug>/<id> or /company/<slug>/<id>
      const slugIdx = parts.findIndex((p) => /^tvrtka|^company/.test(p));
      const slug = slugIdx !== -1 ? parts[slugIdx + 1] : parts[parts.length - 2];
      if (!slug || /^\d+$/.test(slug)) return '';
      // Convert slug to title-case name, drop trailing legal suffixes like -d-o-o
      return slug
        .replace(/-d-o-o$/i, '')
        .replace(/-j-d-o-o$/i, '')
        .replace(/-d-d$/i, '')
        .split('-')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
        .join(' ')
        .trim();
    } catch {
      return '';
    }
  }

  // ── Competitor helpers ───────────────────────────────────────────────────
  function addCompetitor() {
    if (manualCompetitors.length < 4) {
      setManualCompetitors((prev) => [...prev, { name: '', url: '' }]);
    }
  }

  function removeCompetitor(index: number) {
    if (manualCompetitors.length <= 1) return;
    setManualCompetitors((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCompetitor(index: number, field: keyof ManualCompetitor, value: string) {
    setManualCompetitors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  // ── Step 1: Scrape data sources ─────────────────────────────────────────
  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const filled = manualCompetitors.filter((c) => c.name.trim());
    if (filled.length === 0) {
      setError('Dodajte najmanje jednog konkurenta za usporedbu.');
      return;
    }

    // No scraping sources → go directly to manual
    if (!companyWallUrl.trim() && !googleMapsUrl.trim()) {
      setManualForm((prev) => ({
        ...prev,
        business_url: websiteUrl,
        business_niche: prev.business_niche || loadedTemplateNiche || '',
      }));
      setStep('manual');
      return;
    }

    setScraping(true);
    try {
      const [cwResult, mapsResult] = await Promise.allSettled([
        companyWallUrl.trim()
          ? fetch('/api/scrape-companywall', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: companyWallUrl }),
            })
              .then((r) => r.json())
              .catch(() => null)
          : Promise.resolve(null),
        googleMapsUrl.trim()
          ? fetch('/api/scrape-googlemaps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: googleMapsUrl }),
            })
              .then((r) => r.json())
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      const cw =
        cwResult.status === 'fulfilled' && cwResult.value && !cwResult.value.error
          ? cwResult.value
          : null;
      const maps =
        mapsResult.status === 'fulfilled' && mapsResult.value && !mapsResult.value.error
          ? mapsResult.value
          : null;

      // Both failed → silent fallback to manual
      if (!cw && !maps) {
        const hint = nameHintFromUrl(companyWallUrl);
        setManualForm((prev) => ({
          ...prev,
          business_url: websiteUrl,
          business_name: prev.business_name || hint,
          business_niche: prev.business_niche || loadedTemplateNiche || '',
        }));
        setStep('manual');
        return;
      }

      // Merge: Google Maps for identity/location, CompanyWall for financials
      setPreview({
        name: maps?.name ?? cw?.name ?? '',
        googleMapsName: '',
        googleMapsPlaceId: maps?.placeId ?? null,
        ownerName: cw?.ownerName ?? '',
        phoneNumber: cw?.phoneNumber ?? maps?.phoneNumber ?? '',
        city: maps?.city ?? cw?.city ?? '',
        niche: cw?.niche ?? 'Drugo',
        annualRevenue: cw?.annualRevenue ? String(cw.annualRevenue) : '',
        revenueGrowth: cw?.revenueGrowth ?? null,
        companySize: cw?.companySize ?? '',
        bonitetGrade: cw?.bonitetGrade ?? '',
        employees: cw?.employees ?? null,
        foundedYear: cw?.foundedYear ?? '',
        financialHistory: cw?.financialHistory ?? [],
        dataSources: { hasCompanyWall: !!cw, hasGoogleMaps: !!maps },
      });
      setStep('preview');
    } catch {
      const hint = nameHintFromUrl(companyWallUrl);
      setManualForm((prev) => ({
        ...prev,
        business_url: websiteUrl,
        business_name: prev.business_name || hint,
        business_niche: prev.business_niche || loadedTemplateNiche || '',
      }));
      setStep('manual');
    } finally {
      setScraping(false);
    }
  }

  // ── Step 2/3: Generate report ────────────────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const filled = manualCompetitors.filter((c) => c.name.trim());
    if (filled.length === 0) {
      setError('Dodajte najmanje jednog konkurenta za usporedbu.');
      return;
    }

    let payload: Record<string, unknown>;

    if (step === 'preview' && preview) {
      const annualRev = preview.annualRevenue ? parseInt(preview.annualRevenue, 10) || null : null;
      payload = {
        business_name: preview.name,
        business_url: websiteUrl,
        business_city: preview.city,
        business_niche: preview.niche,
        annual_revenue: annualRev,
        owner_name: preview.ownerName || null,
        phone_number: preview.phoneNumber || null,
        company_size: preview.companySize || null,
        bonitet_grade: preview.bonitetGrade || null,
        revenue_growth: preview.revenueGrowth ?? null,
        financial_history: preview.financialHistory.length > 0 ? preview.financialHistory : null,
        founded_year: preview.foundedYear || null,
        business_maps_name: preview.googleMapsName.trim() || null,
        subject_place_id: preview.googleMapsPlaceId || null,
        manual_competitors: filled,
      };
    } else {
      const annualRev = manualForm.annual_revenue
        ? parseInt(manualForm.annual_revenue, 10) || null
        : null;
      payload = {
        business_name: manualForm.business_name,
        business_url: manualForm.business_url,
        business_city: manualForm.business_city,
        business_niche: manualForm.business_niche,
        annual_revenue: annualRev,
        manual_competitors: filled,
      };
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.slug) throw new Error(data.error ?? 'Greška');
      router.push(`/admin/review/${data.slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Došlo je do greške. Molimo pokušajte ponovo.');
      setGenerating(false);
    }
  }

  async function openWaModal(report: Report) {
    setWaModal({ open: true, reportName: report.business_name, loading: true, message: '', copied: false });
    try {
      const res = await fetch('/api/generate-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: report.slug }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(String(data.error ?? `HTTP ${res.status}`));
      setWaModal((p) => ({ ...p, loading: false, message: data.message }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[openWaModal]', msg);
      setWaModal((p) => ({ ...p, loading: false, message: `Greška: ${msg}` }));
    }
  }

  function closeWaModal() {
    setWaModal({ open: false, reportName: '', loading: false, message: '', copied: false });
  }

  function copyWaMessage() {
    navigator.clipboard.writeText(waModal.message);
    setWaModal((p) => ({ ...p, copied: true }));
    setTimeout(() => setWaModal((p) => ({ ...p, copied: false })), 2000);
  }

  async function handleDelete(slug: string, name: string) {
    const ok = window.confirm(
      `Jeste li sigurni da želite obrisati ovaj izvještaj?\n\n"${name}"\n\nOva radnja se ne može poništiti.`
    );
    if (!ok) return;
    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/delete-report/${slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Greška pri brisanju. Pokušaj ponovo.');
        return;
      }
      setReportList((prev) => prev.filter((r) => r.slug !== slug));
    } catch {
      alert('Greška pri brisanju. Pokušaj ponovo.');
    } finally {
      setDeletingSlug('');
    }
  }

  function copyLink(slug: string, customSlug?: string | null) {
    const path = customSlug ?? slug;
    navigator.clipboard.writeText(`${BASE_URL}/${path}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(''), 2000);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' });
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  function loadTemplate(t: NicheTemplate) {
    setManualCompetitors(
      t.competitors.length > 0
        ? t.competitors.map(c => ({ name: c.name, url: c.url || '' }))
        : [{ name: '', url: '' }]
    );
    setSelectedTemplateId(t.id);
    setLoadedTemplateNiche(t.niche);
    if (step === 'preview') setPreview(p => p ? { ...p, niche: t.niche } : p);
    if (step === 'manual') setManualForm(p => ({ ...p, business_niche: t.niche }));
  }

  function clearTemplate() {
    setSelectedTemplateId('');
    setLoadedTemplateNiche('');
    setManualCompetitors([{ name: '', url: '' }]);
  }

  function openTemplateModal() {
    setTemplateModal({
      open: true, name: '', niche: NICHES[0],
      competitors: [{ name: '', url: '' }],
      saving: false, error: '',
    });
  }

  function closeTemplateModal() {
    setTemplateModal(p => ({ ...p, open: false }));
  }

  async function saveTemplate() {
    const filled = templateModal.competitors.filter(c => c.name.trim());
    if (!templateModal.name.trim()) {
      setTemplateModal(p => ({ ...p, error: 'Naziv predloška je obavezan.' }));
      return;
    }
    setTemplateModal(p => ({ ...p, saving: true, error: '' }));
    try {
      const res = await fetch('/api/niche-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateModal.name.trim(),
          niche: templateModal.niche,
          competitors: filled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Greška');
      setTemplateList(prev => [data, ...prev]);
      closeTemplateModal();
    } catch (e) {
      setTemplateModal(p => ({
        ...p, saving: false,
        error: e instanceof Error ? e.message : 'Greška pri spremanju.',
      }));
    }
  }

  async function deleteTemplate(id: string) {
    setDeletingTemplateId(id);
    try {
      const res = await fetch(`/api/niche-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Greška'); return; }
      setTemplateList(prev => prev.filter(t => t.id !== id));
      if (selectedTemplateId === id) clearTemplate();
    } catch { alert('Greška pri brisanju.'); }
    finally { setDeletingTemplateId(''); }
  }

  function addTemplateCompetitor() {
    if (templateModal.competitors.length < 4) {
      setTemplateModal(p => ({ ...p, competitors: [...p.competitors, { name: '', url: '' }] }));
    }
  }

  function removeTemplateCompetitor(i: number) {
    if (templateModal.competitors.length <= 1) return;
    setTemplateModal(p => ({ ...p, competitors: p.competitors.filter((_, idx) => idx !== i) }));
  }

  function updateTemplateCompetitor(i: number, field: keyof ManualCompetitor, value: string) {
    setTemplateModal(p => ({
      ...p,
      competitors: p.competitors.map((c, idx) => idx === i ? { ...c, [field]: value } : c),
    }));
  }

  // ── Competitors section (shared) ─────────────────────────────────────────
  const competitorsSection = (
    <div className="border-t border-slate-100 pt-5">
      {/* Template loader */}
      {templateList.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <select
            value={selectedTemplateId}
            onChange={e => {
              const t = templateList.find(tpl => tpl.id === e.target.value);
              if (t) loadTemplate(t);
              else if (!e.target.value) clearTemplate();
            }}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          >
            <option value="">Učitaj predložak...</option>
            {templateList.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.niche})
              </option>
            ))}
          </select>
          {selectedTemplateId && (
            <button
              type="button"
              onClick={clearTemplate}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors text-lg font-bold"
              title="Ukloni predložak"
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            Konkurenti za usporedbu{' '}
            <span className="text-[#F97316]">(obavezno)</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Ocjene i recenzije dohvaćaju se s Google Mapsa. Dodajte URL ako ga znate.
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
      <div className="space-y-2">
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
              placeholder="https://... (opcionalno)"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
            <button
              type="button"
              onClick={() => removeCompetitor(i)}
              disabled={manualCompetitors.length <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              title="Ukloni"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-xl">
          Analiziraj.com{' '}
          <span className="text-slate-400 font-normal text-sm">Admin</span>
        </span>
        <form action="/api/admin-logout" method="POST">
          <button className="text-slate-400 hover:text-white text-sm transition-colors">
            Odjava
          </button>
        </form>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">

        {/* Published success banner */}
        {justPublished && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <span className="text-green-600 text-xl">✓</span>
            <p className="text-green-800 font-semibold">Izvještaj je uspješno objavljen!</p>
          </div>
        )}

        {/* Section A: Niche templates */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Predlošci niša</h2>
            <button
              onClick={openTemplateModal}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white transition-colors"
            >
              + Izradi predložak
            </button>
          </div>
          {templateList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 px-6 py-8 text-center">
              <p className="text-slate-400 text-sm">Nema predložaka još. Izradi predložak da ubrzaš unos konkurenata.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templateList.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.niche} · {t.competitors.length} konkurent{t.competitors.length === 1 ? '' : 'a'}
                    </p>
                    {t.competitors.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {t.competitors.map(c => c.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    disabled={deletingTemplateId === t.id}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Obriši predložak"
                  >
                    {deletingTemplateId === t.id ? '…' : '🗑'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section B: Generate report */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Generiraj izvještaj za prospects</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

            {/* ── STEP: INPUT ─────────────────────────────────────────────── */}
            {step === 'input' && (
              <form onSubmit={handleScrape} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      CompanyWall URL{' '}
                      <span className="font-normal text-slate-400">(opcionalno)</span>
                    </label>
                    <input
                      type="url"
                      value={companyWallUrl}
                      onChange={(e) => setCompanyWallUrl(e.target.value)}
                      placeholder="https://www.companywall.hr/tvrtka/naziv/..."
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Idi na companywall.hr, pronađi tvrtku i zalijepi cijeli URL.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Google Maps URL{' '}
                      <span className="font-normal text-slate-400">(opcionalno)</span>
                    </label>
                    <input
                      type="url"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://www.google.com/maps/place/..."
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Pronađi tvrtku na Google Mapsu i zalijepi URL.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Web stranica tvrtke{' '}
                      <span className="font-normal text-slate-400">(opcionalno)</span>
                    </label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>

                {competitorsSection}

                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={scraping}
                  className="bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-300 transition-colors text-white font-bold py-3 px-8 rounded-xl"
                >
                  {scraping
                    ? 'Dohvaćanje podataka...'
                    : (companyWallUrl.trim() || googleMapsUrl.trim())
                      ? 'Dohvati podatke'
                      : 'Nastavi'}
                </button>
              </form>
            )}

            {/* ── STEP: PREVIEW ───────────────────────────────────────────── */}
            {step === 'preview' && preview && (
              <form onSubmit={handleGenerate} className="space-y-5">
                {/* Scraped data card */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-green-600 text-lg font-bold">✓</span>
                      <span className="text-green-800 font-semibold text-sm">
                        Podaci dohvaćeni — provjeri i ispravi po potrebi
                      </span>
                      {preview.dataSources.hasCompanyWall && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          CompanyWall
                        </span>
                      )}
                      {preview.dataSources.hasGoogleMaps && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Google Maps
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {preview.companySize && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {preview.companySize}
                        </span>
                      )}
                      {preview.bonitetGrade && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          {preview.bonitetGrade}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Company name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Naziv tvrtke *
                      </label>
                      <input
                        type="text"
                        value={preview.name}
                        onChange={(e) => setPreview((p) => p ? { ...p, name: e.target.value } : p)}
                        className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                        required
                      />
                    </div>

                    {/* Google Maps name override */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Google Maps naziv{' '}
                        <span className="normal-case font-normal text-slate-400">(opcionalno)</span>
                      </label>
                      <input
                        type="text"
                        value={preview.googleMapsName}
                        onChange={(e) => setPreview((p) => p ? { ...p, googleMapsName: e.target.value } : p)}
                        placeholder="npr. Lovrec Hortikultura"
                        className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Popuni ako se naziv na Google Mapsu razlikuje od pravnog naziva.
                      </p>
                    </div>

                    {/* Owner name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Ime direktora/vlasnika
                      </label>
                      <input
                        type="text"
                        value={preview.ownerName}
                        onChange={(e) => setPreview((p) => p ? { ...p, ownerName: e.target.value } : p)}
                        placeholder="npr. Ivan Horvat"
                        className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      />
                    </div>

                    {/* Phone — display only */}
                    {preview.phoneNumber && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                          Telefon
                        </label>
                        <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700">
                          <span>📞</span>
                          <span className="font-mono">{preview.phoneNumber}</span>
                        </div>
                      </div>
                    )}

                    {/* City */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Grad *
                      </label>
                      <input
                        type="text"
                        value={preview.city}
                        onChange={(e) => setPreview((p) => p ? { ...p, city: e.target.value } : p)}
                        className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                        required
                      />
                    </div>

                    {/* Niche */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Djelatnost *
                      </label>
                      <select
                        value={preview.niche}
                        onChange={(e) => setPreview((p) => p ? { ...p, niche: e.target.value } : p)}
                        className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                        required
                      >
                        {NICHES.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Annual revenue */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                        Godišnji prihodi 2024 (EUR)
                      </label>
                      <input
                        type="number"
                        value={preview.annualRevenue}
                        onChange={(e) => setPreview((p) => p ? { ...p, annualRevenue: e.target.value } : p)}
                        placeholder="npr. 2450000"
                        className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      />
                      {preview.annualRevenue && (
                        <p className="text-xs text-slate-400 mt-1">
                          ≈ {(parseInt(preview.annualRevenue, 10) / 12).toLocaleString('hr-HR', { maximumFractionDigits: 0 })} EUR/mj.
                        </p>
                      )}
                    </div>

                    {/* Revenue trend */}
                    {preview.revenueGrowth !== null && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${preview.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {preview.revenueGrowth >= 0 ? '↑' : '↓'}{' '}
                          {preview.revenueGrowth >= 0 ? '+' : ''}{preview.revenueGrowth}% {preview.revenueGrowth >= 0 ? 'rast' : 'pad'}
                        </span>
                        {preview.financialHistory.length >= 2 && (
                          <span className="text-xs text-slate-400">
                            ({preview.financialHistory[0].year}→{preview.financialHistory[preview.financialHistory.length - 1].year})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Info row: founded year + employees */}
                    {(preview.foundedYear || preview.employees !== null) && (
                      <div className="flex items-center gap-4 sm:col-span-2 text-xs text-slate-500">
                        {preview.foundedYear && <span>Osnovana: <strong className="text-slate-700">{preview.foundedYear}</strong></span>}
                        {preview.employees !== null && <span>Zaposlenici: <strong className="text-slate-700">{preview.employees}</strong></span>}
                      </div>
                    )}
                  </div>
                </div>

                {competitorsSection}

                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={generating}
                    className="bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-300 transition-colors text-white font-bold py-3 px-8 rounded-xl"
                  >
                    {generating ? 'Generiranje...' : 'Generiraj izvještaj'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('input'); setError(''); }}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    ← Nazad
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP: MANUAL FALLBACK ────────────────────────────────────── */}
            {step === 'manual' && (
              <form onSubmit={handleGenerate} className="space-y-5">
                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Naziv tvrtke *</label>
                    <input
                      type="text"
                      name="business_name"
                      value={manualForm.business_name}
                      onChange={(e) => setManualForm((p) => ({ ...p, business_name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Web stranica</label>
                    <input
                      type="url"
                      name="business_url"
                      value={manualForm.business_url}
                      onChange={(e) => setManualForm((p) => ({ ...p, business_url: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Grad *</label>
                    <input
                      type="text"
                      name="business_city"
                      value={manualForm.business_city}
                      onChange={(e) => setManualForm((p) => ({ ...p, business_city: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Djelatnost *</label>
                    <select
                      name="business_niche"
                      value={manualForm.business_niche}
                      onChange={(e) => setManualForm((p) => ({ ...p, business_niche: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      required
                    >
                      <option value="" disabled>Odaberite</option>
                      {NICHES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Godišnji prihodi (EUR)
                      <span className="ml-1 font-normal text-slate-400">— opcionalno, za točniju procjenu gubitka</span>
                    </label>
                    <input
                      type="number"
                      name="annual_revenue"
                      value={manualForm.annual_revenue}
                      onChange={(e) => setManualForm((p) => ({ ...p, annual_revenue: e.target.value }))}
                      placeholder="npr. 2450000"
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>

                {competitorsSection}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={generating}
                    className="bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-300 transition-colors text-white font-bold py-3 px-8 rounded-xl"
                  >
                    {generating ? 'Generiranje...' : 'Generiraj izvještaj'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('input'); setError(''); }}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    ← Nazad
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Section C: Reports table */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Svi izvještaji ({reportList.length})
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tvrtka</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Grad</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Djelatnost</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Generirano</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Otvaranja</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {reportList.map((r) => {
                    const isDraft = !r.status || r.status === 'draft';
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{r.business_name}</span>
                            {r.report_data?.phoneNumber && (
                              <span
                                title={r.report_data.phoneNumber}
                                className="text-slate-300 hover:text-slate-600 cursor-default transition-colors text-xs"
                              >
                                📞
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.business_city}</td>
                        <td className="px-4 py-3 text-slate-600">{r.business_niche}</td>
                        <td className="px-4 py-3">
                          {isDraft ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                              DRAFT
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              OBJAVLJENO
                            </span>
                          )}
                        </td>
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isDraft ? (
                              <a
                                href={`/admin/review/${r.slug}`}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-50 text-[#F97316] hover:bg-orange-100 transition-colors whitespace-nowrap"
                              >
                                Pregledaj →
                              </a>
                            ) : (
                              <>
                                <a
                                  href={`/${r.custom_slug ?? r.slug}?preview=1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
                                >
                                  Pregledaj →
                                </a>
                                <button
                                  onClick={() => copyLink(r.slug, r.custom_slug)}
                                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                    copiedSlug === r.slug
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-orange-50 text-[#F97316] hover:bg-orange-100'
                                  }`}
                                >
                                  {copiedSlug === r.slug ? 'Kopirano!' : 'Kopiraj link'}
                                </button>
                              </>
                            )}
                            <a
                              href={`/api/generate-pdf/${r.slug}`}
                              download={`${r.business_name}-izvjestaj.pdf`}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
                            >
                              PDF
                            </a>
                            {!isDraft && (
                              <button
                                onClick={() => openWaModal(r)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#16a34a] hover:bg-[#25D366]/20 transition-colors whitespace-nowrap"
                              >
                                WA poruka
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(r.slug, r.business_name)}
                              disabled={deletingSlug === r.slug}
                              title="Obriši izvještaj"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base"
                            >
                              {deletingSlug === r.slug ? '…' : '🗑'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {reportList.length === 0 && (
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

      {/* ── Template Creation Modal ───────────────────────────────────── */}
      {templateModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={e => { if (e.target === e.currentTarget) closeTemplateModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Novi predložak niše</h3>
              <button
                onClick={closeTemplateModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Naziv predloška *</label>
                <input
                  type="text"
                  value={templateModal.name}
                  onChange={e => setTemplateModal(p => ({ ...p, name: e.target.value }))}
                  placeholder="npr. Stomatolozi Zagreb"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Djelatnost *</label>
                <select
                  value={templateModal.niche}
                  onChange={e => setTemplateModal(p => ({ ...p, niche: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                >
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Konkurenti</label>
                  {templateModal.competitors.length < 4 && (
                    <button
                      type="button"
                      onClick={addTemplateCompetitor}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      + Dodaj
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {templateModal.competitors.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={c.name}
                        onChange={e => updateTemplateCompetitor(i, 'name', e.target.value)}
                        placeholder={`Naziv ${i + 1}`}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      />
                      <input
                        type="url"
                        value={c.url}
                        onChange={e => updateTemplateCompetitor(i, 'url', e.target.value)}
                        placeholder="URL (opcionalno)"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                      />
                      <button
                        type="button"
                        onClick={() => removeTemplateCompetitor(i)}
                        disabled={templateModal.competitors.length <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {templateModal.error && (
                <p className="text-red-500 text-sm font-medium">{templateModal.error}</p>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 pb-5">
              <button
                onClick={saveTemplate}
                disabled={templateModal.saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-300 text-white transition-colors"
              >
                {templateModal.saving ? 'Spremanje...' : 'Spremi predložak'}
              </button>
              <button
                onClick={closeTemplateModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Message Modal ─────────────────────────────────────── */}
      {waModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) closeWaModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">WhatsApp poruka</h3>
                <p className="text-xs text-slate-400 mt-0.5">{waModal.reportName}</p>
              </div>
              <button
                onClick={closeWaModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              {waModal.loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-[#F97316] rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">Generiram poruku...</p>
                </div>
              ) : (
                <textarea
                  value={waModal.message}
                  onChange={(e) => setWaModal((p) => ({ ...p, message: e.target.value }))}
                  rows={7}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#F97316] resize-none"
                />
              )}
            </div>

            {/* Modal footer */}
            {!waModal.loading && (
              <div className="flex items-center gap-3 px-6 pb-5">
                <button
                  onClick={copyWaMessage}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    waModal.copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {waModal.copied ? 'Kopirano!' : 'Kopiraj poruku'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(waModal.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center bg-[#25D366] text-white hover:bg-green-500 transition-colors"
                >
                  Otvori WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
