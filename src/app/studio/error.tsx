'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="panel my-12">
      <h1 className="text-3xl">Your studio could not load</h1>
      <p className="hint my-4">
        Please try again. If this is the first setup, check that the database migration and server
        configuration are complete.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <Link className="button secondary ml-3" href="/login">
        Sign in
      </Link>
    </main>
  );
}
