'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="panel mx-auto my-16 max-w-xl">
      <h1 className="text-3xl">Something could not load</h1>
      <p className="hint my-4">Please try again or check the project setup.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
