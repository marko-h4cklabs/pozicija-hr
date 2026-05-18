import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Analiziraj.com',
  description:
    'Saznajte gdje stojite u usporedbi s konkurencijom u 60 sekundi. Besplatna analiza za hrvatska poduzeća.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body>{children}</body>
    </html>
  );
}
