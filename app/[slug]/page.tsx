import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { Report } from '@/types';
import { trackOpen } from '@/lib/tracking';
import Navbar from '@/components/Navbar';
import ScoreBadge from '@/components/ScoreBadge';
import ComparisonTable from '@/components/ComparisonTable';
import NothingChanges from '@/components/NothingChanges';
import ReviewSentiment from '@/components/ReviewSentiment';
import AiAnalysis from '@/components/AiAnalysis';
import IntroVideo from '@/components/IntroVideo';
import RevenueGap from '@/components/RevenueGap';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import FirstStepRecommendation from '@/components/FirstStepRecommendation';

interface Props {
  params: { slug: string };
  searchParams: { preview?: string };
}

async function getPublishedReport(slug: string): Promise<Report | null> {
  const { data: bySlug } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Report>();

  if (bySlug) return bySlug.status === 'published' ? bySlug : null;

  const { data: byCustom } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('custom_slug', slug)
    .maybeSingle<Report>();

  if (byCustom) return byCustom.status === 'published' ? byCustom : null;

  return null;
}

export default async function ReportPage({ params, searchParams }: Props) {
  const report = await getPublishedReport(params.slug);
  if (!report) return notFound();

  const isPreview = searchParams.preview === '1';

  // Server-side tracking: fires on every real load, no client-side deduplication issues
  if (!isPreview) {
    await trackOpen(
      report.id,
      report.slug,
      report.business_name,
      report.business_city,
      report.open_count ?? 0,
      report.opened_at,
    );
  }

  const { subject, competitors, aiAnalysis, firstStep, projectionData, reviewSentiment } = report.report_data;
  const introVideoUrl = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL;

  return (
    // pb-20 sm:pb-0: prevents fixed mobile CTA bar from covering bottom content
    <div className="min-h-screen flex flex-col pb-20 sm:pb-0">
      <Navbar />

      <ScoreBadge
        businessName={report.business_name}
        score={subject.totalScore}
      />

      <main className="flex-1 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-8 sm:space-y-10">

          {introVideoUrl && <IntroVideo videoUrl={introVideoUrl} />}

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4">Usporedba s konkurencijom</h2>
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <ComparisonTable
                subject={subject}
                competitors={competitors}
                metaAdsManual={report.meta_ads_manual ?? undefined}
              />
            </div>
          </section>

          {projectionData && <NothingChanges data={projectionData} />}

          {reviewSentiment && (
            <ReviewSentiment data={reviewSentiment} businessName={report.business_name} />
          )}

          <RevenueGap
            subject={subject}
            competitors={competitors}
            niche={report.business_niche}
            aiAnalysis={aiAnalysis}
            annualRevenue={report.report_data.annualRevenue}
          />

          {aiAnalysis && (
            <section>
              <AiAnalysis analysis={aiAnalysis} businessName={report.business_name} />
            </section>
          )}

          {firstStep && <FirstStepRecommendation data={firstStep} />}

        </div>
      </main>

      <CTASection />
      <Footer />
    </div>
  );
}
