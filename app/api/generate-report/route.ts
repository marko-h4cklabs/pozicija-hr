import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSlug } from '@/lib/slugify';
import {
  searchBusiness,
  getPlaceDetails,
} from '@/lib/places';
import { checkGoogleAds, checkHasCta } from '@/lib/ads';
import { generateAiAnalysis } from '@/lib/claude';
import { calcCredibilityScore } from '@/lib/scoring';
import { BusinessData, ScoredBusiness, ReportData, ManualCompetitor } from '@/types';

function log(step: string, msg: string, data?: unknown) {
  const prefix = `[generate-report] [${step}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${msg}`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

function err(step: string, msg: string, data?: unknown) {
  const prefix = `[generate-report] [${step}] ERROR`;
  if (data !== undefined) {
    console.error(`${prefix} ${msg}`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  } else {
    console.error(`${prefix} ${msg}`);
  }
}

interface Extras {
  hasSsl?: boolean | null;
  hasCta?: boolean | null;
  hasGoogleAds?: boolean | null;
}

function buildScored(details: Partial<BusinessData>, extras: Extras = {}): ScoredBusiness {
  const credibilityScore = calcCredibilityScore(details.rating ?? null, details.reviewCount ?? null);

  return {
    name: details.name ?? 'Nepoznato',
    address: details.address ?? '',
    website: details.website ?? null,
    rating: details.rating ?? null,
    reviewCount: details.reviewCount ?? null,
    placeId: details.placeId ?? null,
    reviewsScore: credibilityScore,
    ratingScore: 0,
    credibilityScore,
    totalScore: credibilityScore,
    ...extras,
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      business_name,
      business_url,
      business_city,
      business_niche,
      annual_revenue,
      owner_name,
      phone_number,
      company_size,
      bonitet_grade,
      revenue_growth,
      financial_history,
      founded_year,
      manual_competitors,
    } = body as {
      business_name: string;
      business_url: string;
      business_city: string;
      business_niche: string;
      annual_revenue?: number | null;
      owner_name?: string | null;
      phone_number?: string | null;
      company_size?: string | null;
      bonitet_grade?: string | null;
      revenue_growth?: number | null;
      financial_history?: import('@/types').FinancialYear[] | null;
      founded_year?: string | null;
      manual_competitors?: ManualCompetitor[];
    };

    log('init', 'Request received', { business_name, business_url, business_city, business_niche });

    if (!business_name || !business_city || !business_niche) {
      return NextResponse.json(
        { error: 'Nedostaju obavezna polja: naziv, grad i djelatnost.', step: 'validation' },
        { status: 400 }
      );
    }

    // Require at least one manual competitor
    const manuals: ManualCompetitor[] = (manual_competitors ?? []).filter((c) => c.name.trim());
    if (manuals.length === 0) {
      return NextResponse.json(
        { error: 'Dodajte najmanje jednog konkurenta za usporedbu.', step: 'validation' },
        { status: 400 }
      );
    }
    log('init', `Manual competitors: ${manuals.length}`);

    // ── Step 1: Search for subject ───────────────────────────────────────────
    log('step1', `Searching subject: "${business_name}" in "${business_city}" (${business_niche})`);

    let subjectPlaceId: string | null = null;
    try {
      const result = await searchBusiness(business_name, business_city, business_niche);
      subjectPlaceId = result.placeId;
      log('step1', `Subject place_id: ${subjectPlaceId ?? 'NOT FOUND'}`);
    } catch (e) {
      err('step1', 'searchBusiness threw', e instanceof Error ? e.message : e);
      return NextResponse.json(
        { error: 'Greška pri pretraživanju vašeg poduzeća na Google Places.', step: 'search_subject' },
        { status: 502 }
      );
    }

    // ── Step 2: Search Places for manual competitors ─────────────────────────
    log('step2', `Searching Places for ${manuals.length} competitor(s)`);

    let competitorPlaceIds: (string | null)[];
    let competitorUrlOverrides: (string | null)[];
    let competitorNameOverrides: string[];

    try {
      const searches = await Promise.all(
        manuals.map((c) => searchBusiness(c.name, business_city, ''))
      );
      competitorPlaceIds = searches.map((r) => r.placeId);
      competitorUrlOverrides = manuals.map((c) => c.url || null);
      competitorNameOverrides = manuals.map((c) => c.name);
      log('step2', `Competitor place_ids: ${JSON.stringify(competitorPlaceIds)}`);
    } catch (e) {
      err('step2', 'searchBusiness (competitors) threw', e instanceof Error ? e.message : e);
      return NextResponse.json(
        { error: 'Greška pri pretraživanju konkurenata na Google Places.', step: 'search_competitors' },
        { status: 502 }
      );
    }

    // ── Step 3: Fetch Place Details for all businesses in parallel ───────────
    log('step3', 'Fetching Place Details in parallel');

    let subjectDetailsRaw: Partial<BusinessData>;
    let competitorDetailsRaw: Partial<BusinessData>[];

    try {
      const [subjectResult, ...competitorResults] = await Promise.all([
        subjectPlaceId
          ? getPlaceDetails(subjectPlaceId, business_name)
          : Promise.resolve({ data: {} as Partial<BusinessData>, rawResponse: null }),
        ...competitorPlaceIds.map((id, i) =>
          id
            ? getPlaceDetails(id, competitorNameOverrides[i] ?? `Competitor ${i + 1}`)
            : Promise.resolve({ data: {} as Partial<BusinessData>, rawResponse: null })
        ),
      ]);

      subjectDetailsRaw = subjectResult.data;

      competitorDetailsRaw = competitorResults.map((r, i) => {
        const data = { ...r.data };
        if (competitorNameOverrides[i]) data.name = competitorNameOverrides[i]!;
        // For manual competitors, user-supplied URL takes priority over Places data
        if (competitorUrlOverrides[i]) data.website = competitorUrlOverrides[i];
        return data;
      });
    } catch (e) {
      err('step3', 'getPlaceDetails threw', e instanceof Error ? e.message : e);
      return NextResponse.json(
        { error: 'Greška pri dohvatu detalja s Google Places.', step: 'details' },
        { status: 502 }
      );
    }

    // Subject: fall back to user-submitted data if not found on Places
    if (!subjectPlaceId) {
      subjectDetailsRaw = {
        name: business_name,
        address: business_city,
        website: business_url || null,
        rating: null,
        reviewCount: null,
        placeId: null,
      };
    } else {
      subjectDetailsRaw.name = business_name;
      if (business_url) subjectDetailsRaw.website = business_url;
    }

    log('step3', 'Subject details:', subjectDetailsRaw);
    competitorDetailsRaw.forEach((c, i) => log('step3', `Competitor ${i + 1}:`, c));

    // ── Step 4: All external checks in parallel ──────────────────────────────
    log('step4', 'Running external checks in parallel');

    const allDetailsRaw = [subjectDetailsRaw, ...competitorDetailsRaw];
    const allWebsites = allDetailsRaw.map((b) => b.website ?? null);
    const allNames = allDetailsRaw.map((b, i) => b.name ?? `Business ${i}`);

    const hasSsl: boolean | null = business_url ? business_url.startsWith('https://') : null;

    const [googleAdsResults, ctaResult] = await Promise.all([
      Promise.all(allNames.map((name) => checkGoogleAds(name))),
      checkHasCta(allWebsites[0]),
    ]);

    allNames.forEach((name, i) =>
      log('step4', `${name}: google=${googleAdsResults[i]}`)
    );
    log('step4', `Subject CTA=${ctaResult} SSL=${hasSsl}`);

    // ── Step 5: Score everything ─────────────────────────────────────────────
    log('step5', 'Calculating scores');

    const subject = buildScored(subjectDetailsRaw, {
      hasSsl,
      hasCta: ctaResult,
      hasGoogleAds: googleAdsResults[0],
    });

    const competitors = competitorDetailsRaw.map((details, i) =>
      buildScored(details, {
        hasGoogleAds: googleAdsResults[i + 1],
      })
    );

    log('step5', 'Subject:', { name: subject.name, totalScore: subject.totalScore });
    competitors.forEach((c, i) => log('step5', `Competitor ${i + 1}:`, { name: c.name, totalScore: c.totalScore }));

    // ── Step 6: AI analysis ──────────────────────────────────────────────────
    const reportData: ReportData = {
      subject,
      competitors,
      generatedAt: new Date().toISOString(),
      businessName: business_name,
      businessUrl: business_url || '',
      businessCity: business_city,
      businessNiche: business_niche,
      aiAnalysis: null,
      annualRevenue: annual_revenue ?? null,
      ownerName: owner_name ?? null,
      phoneNumber: phone_number ?? null,
      companySize: company_size ?? null,
      bonitetGrade: bonitet_grade ?? null,
      revenueGrowth: revenue_growth ?? null,
      financialHistory: financial_history ?? null,
      foundedYear: founded_year ?? null,
    };

    log('step6', 'Generating AI analysis');
    reportData.aiAnalysis = await generateAiAnalysis(reportData);
    log('step6', `AI analysis: ${reportData.aiAnalysis ? `${reportData.aiAnalysis.length} chars` : 'null'}`);

    // ── Step 7: Store report ─────────────────────────────────────────────────
    const slug = generateSlug(business_name);
    log('step7', `Slug: "${slug}"`);

    const { error: insertError } = await supabaseAdmin.from('reports').insert({
      slug,
      status: 'draft',
      business_name,
      business_url: business_url || '',
      business_city,
      business_niche,
      report_data: reportData,
    });

    if (insertError) {
      err('step7', 'Supabase insert failed', insertError);
      return NextResponse.json(
        { error: `Greška pri pohrani: ${insertError.message}`, step: 'supabase_insert' },
        { status: 500 }
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log('done', `Report generated in ${duration}s — slug: "${slug}"`);

    return NextResponse.json({ slug });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-report] Unhandled exception:', msg, e);
    return NextResponse.json(
      { error: `Interna greška servera: ${msg}`, step: 'unhandled' },
      { status: 500 }
    );
  }
}
