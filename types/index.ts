export interface BusinessData {
  name: string;
  address: string;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  placeId: string | null;
  // Extended — only populated where applicable; undefined on old reports
  hasSsl?: boolean | null;
  hasCta?: boolean | null;
  hasGoogleAds?: boolean | null;
}

export interface ScoredBusiness extends BusinessData {
  reviewsScore: number;
  ratingScore: number;
  credibilityScore: number;
  totalScore: number;
}

export interface ReportData {
  subject: ScoredBusiness;
  competitors: ScoredBusiness[];
  generatedAt: string;
  businessName: string;
  businessUrl: string;
  businessCity: string;
  businessNiche: string;
  aiAnalysis?: string | null;
}

export interface Report {
  id: string;
  slug: string;
  status: string;                                   // 'draft' | 'published'
  custom_slug: string | null;
  meta_ads_manual: Record<string, boolean> | null;
  business_name: string;
  business_url: string;
  business_city: string;
  business_niche: string;
  report_data: ReportData;
  created_at: string;
  opened_at: string | null;
  open_count: number;
}

export interface ManualCompetitor {
  name: string;
  url: string;
}
