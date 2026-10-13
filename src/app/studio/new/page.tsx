import Link from 'next/link';
import { NewLetter } from '@/components/new-letter';
export default function New() {
  return (
    <main className="mx-auto max-w-xl py-12">
      <Link className="hint underline" href="/studio">
        ← Your letters
      </Link>
      <h1 className="mb-3 mt-7 text-4xl">Begin a letter</h1>
      <p className="hint mb-8">You can take your time. Your letter starts as a private draft.</p>
      <NewLetter />
    </main>
  );
}
