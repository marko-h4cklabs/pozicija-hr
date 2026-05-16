import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { Report } from '@/types';
import Navbar from '@/components/Navbar';
import ScoreBadge from '@/components/ScoreBadge';
import ComparisonTable from '@/components/ComparisonTable';
import InsightBlock from '@/components/InsightBlock';
import AiAnalysis from '@/components/AiAnalysis';
import IntroVideo from '@/components/IntroVideo';
import RevenueGap from '@/components/RevenueGap';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import TrackOpen from './TrackOpen';

interface Props {
  params: { slug: string };
}

async function getPublishedReport(slug: string): Promise<Report | null> {
  // Try internal slug first
  const { data: bySlug } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Report>();

  if (bySlug) return bySlug.status === 'published' ? bySlug : null;

  // Fall back to custom_slug
  const { data: byCustom } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('custom_slug', slug)
    .maybeSingle<Report>();

  if (byCustom) return byCustom.status === 'published' ? byCustom : null;

  return null;
}

export default async function ReportPage({ params }: Props) {
  const report = await getPublishedReport(params.slug);
  if (!report) return notFound();

  const { subject, competitors, aiAnalysis } = report.report_data;
  const introVideoUrl = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Always track by internal slug regardless of URL used */}
      <TrackOpen slug={report.slug} />
      <Navbar />

      <ScoreBadge
        businessName={report.business_name}
        score={subject.totalScore}
      />

      <main className="flex-1 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

          {introVideoUrl && <IntroVideo videoUrl={introVideoUrl} />}

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Usporedba s konkurencijom</h2>
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <ComparisonTable
                subject={subject}
                competitors={competitors}
                metaAdsManual={report.meta_ads_manual ?? undefined}
              />
            </div>
          </section>

          <RevenueGap
            subject={subject}
            competitors={competitors}
            niche={report.business_niche}
          />

          <section>
            <InsightBlock subject={subject} competitors={competitors} />
          </section>

          {aiAnalysis && (
            <section>
              <AiAnalysis analysis={aiAnalysis} businessName={report.business_name} />
            </section>
          )}

        </div>
      </main>

      <CTASection />
      <Footer />
    </div>
  );
}
