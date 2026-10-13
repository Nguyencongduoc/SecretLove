import Link from 'next/link';
export default function Missing() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl">This letter is unavailable</h1>
      <p className="hint my-5">Return to your studio to find your letters.</p>
      <Link className="button" href="/studio">
        Your studio
      </Link>
    </main>
  );
}
