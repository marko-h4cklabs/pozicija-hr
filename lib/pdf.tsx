import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { Report } from '@/types';
import { getScoreLabel, getScoreColor } from '@/lib/scoring';
import { metaAdsUrl } from '@/lib/ads';
import { parseRevenueForDisplay } from '@/lib/revenue';

const C = {
  dark: '#0F172A',
  orange: '#F97316',
  green: '#16a34a',
  red: '#dc2626',
  redLight: '#fca5a5',
slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  white: '#ffffff',
  whatsapp: '#25D366',
};

function resolveScoreColor(score: number): string {
  const c = getScoreColor(score);
  if (c === 'green') return C.green;
  if (c === 'orange') return C.orange;
  return C.red;
}


function highlightColor(values: (number | null)[], idx: number): string | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const val = values[idx];
  if (val === null) return null;
  if (val === max && max !== min) return C.green;
  if (val === min && max !== min) return C.red;
  return null;
}

function googleAdsLabel(val: boolean | null | undefined): string {
  if (val === true) return 'DA';
  if (val === false) return 'NE';
  return '—';
}

function googleAdsColor(val: boolean | null | undefined): string {
  if (val === true) return C.green;
  if (val === false) return C.red;
  return C.slate400;
}

const AI_SECTIONS = [
  'PROCJENA IZGUBLJENOG PRIHODA',
  'ŠTO BI ODMAH TREBALI NAPRAVITI',
];

function parseSectionsForPdf(text: string): Array<{ title: string; content: string }> {
  const result: Array<{ title: string; content: string }> = [];
  for (let i = 0; i < AI_SECTIONS.length; i++) {
    const title = AI_SECTIONS[i];
    const start = text.indexOf(title);
    if (start === -1) continue;
    const contentStart = start + title.length;
    const nextIdx = AI_SECTIONS.slice(i + 1).reduce((min, s) => {
      const idx = text.indexOf(s);
      return idx !== -1 && idx < min ? idx : min;
    }, text.length);
    result.push({ title, content: text.slice(contentStart, nextIdx).trim() });
  }
  if (result.length === 0) result.push({ title: 'Analiza', content: text.trim() });
  return result;
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: C.slate800, backgroundColor: C.white },

  header: { backgroundColor: C.dark, paddingVertical: 28, paddingHorizontal: 32, alignItems: 'center' },
  headerEyebrow: { color: C.slate400, fontSize: 8, letterSpacing: 1.5, marginBottom: 10 },
  headerTitle: { color: C.white, fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 16 },
  scoreCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  scoreNum: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  scoreOf: { color: C.slate400, fontSize: 8, marginBottom: 4 },
  scoreLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },

  body: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.slate800, marginBottom: 8 },

  tableBorder: { borderWidth: 1, borderColor: C.slate200, borderRadius: 5 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: C.slate100, paddingVertical: 7, paddingHorizontal: 8 },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.slate100, paddingVertical: 7, paddingHorizontal: 8 },
  tableRowAlt: { backgroundColor: C.slate50 },
  tableRowTotal: { backgroundColor: C.slate100 },
  colMetric: { width: 110, fontSize: 9, color: C.slate600 },
  colMetricSub: { fontSize: 7, color: C.slate400, marginTop: 1 },
  colMetricBold: { width: 110, fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.slate700 },
  colSubject: { flex: 1, fontSize: 9, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  colCompetitor: { flex: 1, fontSize: 9, textAlign: 'center', color: C.slate600 },
  colSubjectHead: { flex: 1, fontSize: 8, textAlign: 'center', fontFamily: 'Helvetica-Bold', color: C.orange },
  colCompHead: { flex: 1, fontSize: 8, textAlign: 'center', fontFamily: 'Helvetica-Bold', color: C.slate600 },
  colMetricHead: { width: 110, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.slate600 },
  colSub: { fontSize: 7, color: C.slate400, textAlign: 'center', marginTop: 1 },

  // Revenue gap section
  revenueBox: { backgroundColor: C.slate900, borderRadius: 5, overflow: 'hidden', marginBottom: 0 },
  revenueEyebrow: { color: '#f87171', fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  revenueTitle: { color: C.white, fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 3, marginBottom: 10 },
  revenueGrid: { flexDirection: 'row' },
  revenueCell: { flex: 1, backgroundColor: C.slate800, padding: 10, marginRight: 1 },
  revenueCellLast: { flex: 1, backgroundColor: C.slate800, padding: 10 },
  revenueCellLabel: { color: C.slate400, fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, marginBottom: 4 },
  revenueAmount: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  // AI Analysis
  aiBox: { borderWidth: 2, borderColor: C.slate200, borderRadius: 5 },
  aiHeader: { backgroundColor: C.dark, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  aiHeaderTitle: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  aiHeaderSub: { color: C.slate400, fontSize: 7, marginTop: 1 },
  aiSection: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.slate100 },
  aiSectionTitle: { fontSize: 7, color: C.orange, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginBottom: 4 },
  aiSectionText: { fontSize: 8.5, color: C.slate700, lineHeight: 1.5 },

  cta: { backgroundColor: C.dark, paddingVertical: 20, paddingHorizontal: 32, alignItems: 'center', marginTop: 4 },
  ctaTitle: { color: C.white, fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 5 },
  ctaSub: { color: C.slate400, fontSize: 8.5, textAlign: 'center', marginBottom: 12 },
  ctaBtn: { backgroundColor: C.whatsapp, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16 },
  ctaBtnText: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 10 },

  footerNote: { color: C.slate400, fontSize: 7, textAlign: 'center', paddingVertical: 8 },
});

interface Props {
  report: Report;
}

export function ReportPDF({ report }: Props) {
  const { subject, competitors, aiAnalysis } = report.report_data;
  const all = [subject, ...competitors];
  const color = resolveScoreColor(subject.totalScore);
  const label = getScoreLabel(subject.totalScore);
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '385992532420';

  const credibilities = all.map((b) => b.credibilityScore ?? (b.reviewsScore + b.ratingScore));
  const scores = all.map((b) => b.totalScore);

  const hasAdsData = all.some((b) => b.hasGoogleAds !== undefined);

  const revenueDisplay = parseRevenueForDisplay(report.report_data.aiAnalysis);
  const fmt = (n: number) => n.toLocaleString('hr-HR');
  const monthlyStr = revenueDisplay
    ? (revenueDisplay.monthlyLow === revenueDisplay.monthlyHigh
        ? `${fmt(revenueDisplay.monthlyLow)} EUR`
        : `${fmt(revenueDisplay.monthlyLow)} – ${fmt(revenueDisplay.monthlyHigh)} EUR`)
    : null;
  const annualStr = revenueDisplay ? `${fmt(revenueDisplay.annualHigh)} EUR` : null;

  const now = new Date().toLocaleDateString('hr-HR', {
    timeZone: 'Europe/Zagreb',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  function tableCell(value: string, vals: (number | null)[], idx: number, isSubject: boolean) {
    const hColor = highlightColor(vals, idx);
    const baseStyle = isSubject ? s.colSubject : s.colCompetitor;
    return hColor
      ? React.createElement(Text, { style: [baseStyle, { color: hColor }] }, value)
      : React.createElement(Text, { style: baseStyle }, value);
  }

  function metaCell(name: string) {
    return React.createElement(
      Link,
      { src: metaAdsUrl(name), style: { color: '#2563eb', fontSize: 9, textDecoration: 'underline' } },
      'Provjeri →'
    );
  }

  function googleAdsCell(val: boolean | null | undefined) {
    return React.createElement(
      Text,
      { style: [s.colCompetitor, { color: googleAdsColor(val) }] },
      googleAdsLabel(val)
    );
  }

  const aiSections = aiAnalysis ? parseSectionsForPdf(aiAnalysis) : [];

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerEyebrow}>IZVJEŠTAJ O POZICIONIRANOSTI</Text>
          <Text style={s.headerTitle}>{subject.name}</Text>
          <View style={[s.scoreCircle, { borderColor: color }]}>
            <Text style={[s.scoreNum, { color }]}>{subject.totalScore}</Text>
          </View>
          <Text style={s.scoreOf}>od 100 bodova</Text>
          <Text style={[s.scoreLabel, { color }]}>{label}</Text>
        </View>

        {/* Body */}
        <View style={s.body}>

          {/* Comparison Table */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Usporedba s konkurencijom</Text>
            <View style={s.tableBorder}>
              <View style={s.tableHeaderRow}>
                <Text style={s.colMetricHead}>Metrika</Text>
                <Text style={s.colSubjectHead}>{subject.name}{'\n'}(Vaše)</Text>
                {competitors.map((c, i) => (
                  <Text key={i} style={s.colCompHead}>{c.name}</Text>
                ))}
              </View>

              {/* Credibility row */}
              <View style={s.tableRow}>
                <View style={{ width: 110 }}>
                  <Text style={s.colMetric}>Kredibilitet</Text>
                  <Text style={s.colMetricSub}>ocjena × recenzije</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  {tableCell(`${credibilities[0]}/100`, credibilities, 0, true)}
                  <Text style={s.colSub}>
                    {subject.rating?.toFixed(1) ?? 'N/A'} ★ · {subject.reviewCount ?? 0} rec.
                  </Text>
                </View>
                {competitors.map((c, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    {tableCell(`${credibilities[i + 1]}/100`, credibilities, i + 1, false)}
                    <Text style={s.colSub}>
                      {c.rating?.toFixed(1) ?? 'N/A'} ★ · {c.reviewCount ?? 0} rec.
                    </Text>
                  </View>
                ))}
              </View>

              {/* Meta Ads — always show as a clickable link */}
              <View style={s.tableRow}>
                <Text style={s.colMetric}>Meta oglasi</Text>
                <View style={{ flex: 1, alignItems: 'center' }}>{metaCell(subject.name)}</View>
                {competitors.map((c, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>{metaCell(c.name)}</View>
                ))}
              </View>

              {/* Google Ads — only when SerpApi data is available */}
              {hasAdsData && (
                <View style={[s.tableRow, s.tableRowAlt]}>
                  <Text style={s.colMetric}>Google oglasi</Text>
                  {googleAdsCell(subject.hasGoogleAds)}
                  {competitors.map((c, i) => (
                    <React.Fragment key={i}>{googleAdsCell(c.hasGoogleAds)}</React.Fragment>
                  ))}
                </View>
              )}

              <View style={[s.tableRow, s.tableRowTotal]}>
                <Text style={s.colMetricBold}>Ukupni rezultat</Text>
                {tableCell(`${subject.totalScore}/100`, scores, 0, true)}
                {competitors.map((c, i) =>
                  tableCell(`${c.totalScore}/100`, scores, i + 1, false)
                )}
              </View>
            </View>
          </View>

          {/* Revenue Gap */}
          {monthlyStr && annualStr && (
            <View style={[s.section, { marginBottom: 20 }]}>
              <Text style={s.sectionTitle}>Potencijalni prihod koji ostavljate na stolu</Text>
              <View style={s.revenueBox}>
                <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
                  <Text style={s.revenueEyebrow}>UPOZORENJE</Text>
                  <Text style={s.revenueTitle}>Procijenjeni izgubljeni prihod zbog slabe online pozicije</Text>
                </View>
                <View style={s.revenueGrid}>
                  <View style={s.revenueCell}>
                    <Text style={s.revenueCellLabel}>MJESEČNI GUBITAK</Text>
                    <Text style={[s.revenueAmount, { color: C.orange }]}>{monthlyStr}</Text>
                  </View>
                  <View style={s.revenueCellLast}>
                    <Text style={s.revenueCellLabel}>GODIŠNJI GUBITAK</Text>
                    <Text style={[s.revenueAmount, { color: C.red }]}>{annualStr}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Analysis */}
          {aiSections.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Stručna analiza i preporuke</Text>
              <View style={s.aiBox}>
                <View style={s.aiHeader}>
                  <View>
                    <Text style={s.aiHeaderTitle}>Stručna analiza i preporuke</Text>
                    <Text style={s.aiHeaderSub}>Pripremljeno osobno za {subject.name}</Text>
                  </View>
                </View>
                {aiSections.map(({ title, content }) => (
                  <View key={title} style={s.aiSection}>
                    <Text style={s.aiSectionTitle}>{title}</Text>
                    <Text style={s.aiSectionText}>{content}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>

        {/* CTA */}
        <View style={s.cta}>
          <Text style={s.ctaTitle}>Spremni preuzeti vodstvo u svojoj niši?</Text>
          <Text style={s.ctaSub}>Besplatni 20-minutni poziv — bez obveza — konkretni koraci za vaš rast.</Text>
          <View style={s.ctaBtn}>
            <Text style={s.ctaBtnText}>WhatsApp: +{waNumber}</Text>
          </View>
        </View>

        <Text style={s.footerNote}>
          Generirano: {now} · analiziraj.com
        </Text>

      </Page>
    </Document>
  );
}
