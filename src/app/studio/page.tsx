import Link from 'next/link';
import { Plus, Mail, ArrowUpRight } from 'lucide-react';
import { listLetters } from '@/lib/server/letters';
import { pageData } from '@/lib/server/pages';
export default async function Dashboard() {
  const letters = await pageData(listLetters);
  return (
    <main className="py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[.2em] text-rose-700">Creator Studio</p>
          <h1 className="text-4xl sm:text-5xl">Your letters</h1>
          <p className="hint mt-4">A thought, a memory, a feeling. Start wherever your heart is.</p>
        </div>
        {letters.length < 20 && (
          <Link className="button" href="/studio/new">
            <Plus size={16} /> New letter
          </Link>
        )}
      </div>
      <p className="hint mb-5">{letters.length} of 20 letters · Drafts are visible only to you.</p>
      {letters.length === 0 ? (
        <section className="panel py-16 text-center">
          <Mail className="mx-auto mb-6 text-rose-700" size={36} />
          <h2 className="text-2xl">The first word is yours.</h2>
          <p className="hint mx-auto mb-7 mt-3 max-w-sm">
            Your letters will live here. Create one and make it something only you could write.
          </p>
          <Link className="button secondary" href="/studio/new">
            Write your first letter
          </Link>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {letters.map((letter) => (
            <Link
              href={`/studio/letters/${letter.id}`}
              key={letter.id}
              className="panel group block transition-colors hover:border-rose-300"
            >
              <div className="mb-10 flex items-center justify-between">
                <Mail className="text-rose-700" size={22} />
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs capitalize">
                  {letter.status}
                </span>
              </div>
              <h2 className="break-words text-2xl">{letter.title}</h2>
              <p className="hint mb-6 mt-3">
                Created{' '}
                {new Date(letter.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </p>
              <div className="flex items-center justify-between border-t border-rose-100 pt-4 text-sm text-rose-700">
                <span>Open letter</span>
                <ArrowUpRight size={17} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
