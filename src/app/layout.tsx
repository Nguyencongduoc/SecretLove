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
      <body>
        {children}
        <footer
          className="hint flex flex-wrap justify-center gap-6 p-6"
          aria-label="Privacy and safety"
        >
          <a href="/privacy">Privacy</a>
          <a href="/privacy/requests">Deletion requests</a>
          <a href="/report">Report an unwanted letter</a>
        </footer>
      </body>
    </html>
  );
}
