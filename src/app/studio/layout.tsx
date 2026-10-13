import Link from 'next/link';
import { requireCreator } from '@/lib/server/identity';
import { pageData } from '@/lib/server/pages';
import { SignOut } from '@/components/auth-form';
export const dynamic = 'force-dynamic';
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await pageData(requireCreator);
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <header className="flex items-center justify-between gap-4 border-b border-rose-100 py-6">
        <Link className="serif text-xl" href="/studio">
          ♡ SecretLove{' '}
          <span className="hidden text-sm text-rose-700 sm:inline">/ Creator Studio</span>
        </Link>
        <SignOut />
      </header>
      {children}
      <footer className="hint border-t border-rose-100 py-6">
        Your private place to put feelings into words.
      </footer>
    </div>
  );
}
