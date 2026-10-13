import type { Metadata } from 'next';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'SecretLove', template: '%s · SecretLove' },
  description: 'A little space for words that matter.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
