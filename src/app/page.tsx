import Link from 'next/link';
import { Heart, ArrowRight, LockKeyhole } from 'lucide-react';
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-8">
        <Link className="serif flex items-center gap-2 text-xl" href="/">
          <Heart size={20} />
          SecretLove
        </Link>
        <Link href="/login" className="button secondary">
          Sign in
        </Link>
      </header>
      <section className="my-auto max-w-2xl py-20">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[.25em] text-rose-700">
          For the words you want to keep close
        </p>
        <h1 className="text-5xl leading-tight sm:text-7xl">
          Some feelings
          <br />
          deserve a letter.
        </h1>
        <p className="hint my-8 max-w-lg text-lg">
          Gather your words, your memories, and a little piece of your heart in a private letter.
        </p>
        <Link className="button" href="/signup">
          Create your space <ArrowRight size={16} />
        </Link>
        <p className="hint mt-8 flex items-center gap-2">
          <LockKeyhole size={16} /> Your drafts stay in your Creator Studio.
        </p>
      </section>
      <footer className="hint border-t border-rose-100 py-6">
        SecretLove · Made for meaningful moments
      </footer>
    </main>
  );
}
