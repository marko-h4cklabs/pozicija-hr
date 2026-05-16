export function calcCredibilityScore(rating: number | null, reviewCount: number | null): number {
  if (rating === null) return 0;
  const count = reviewCount ?? 0;
  let multiplier: number;
  if (count >= 300) multiplier = 1.0;
  else if (count >= 100) multiplier = 0.9;
  else if (count >= 30) multiplier = 0.7;
  else if (count >= 10) multiplier = 0.5;
  else multiplier = 0.3;
  return Math.round((rating / 5.0) * 100 * multiplier);
}

// Kept for backward compat — not used in new report generation
export function calcReviewsScore(count: number | null): number {
  if (count === null) return 0;
  if (count >= 300) return 40;
  if (count >= 101) return 33;
  if (count >= 31) return 25;
  if (count >= 11) return 15;
  return 5;
}

export function calcRatingScore(rating: number | null): number {
  if (rating === null) return 0;
  if (rating >= 4.5) return 30;
  if (rating >= 4.0) return 24;
  if (rating >= 3.5) return 18;
  if (rating >= 3.0) return 10;
  return 5;
}

export function getScoreLabel(score: number): string {
  if (score >= 81) return 'Iznad prosjeka — ali prilike prolaze';
  if (score >= 66) return 'Osrednje — postoji ozbiljan prostor za poboljšanje';
  if (score >= 41) return 'Ispod prosjeka — konkurencija vas aktivno preuzima';
  return 'Kritično — gubite klijente svaki dan';
}

export function getScoreColor(score: number): string {
  if (score >= 66) return 'green';
  if (score >= 41) return 'orange';
  return 'red';
}
