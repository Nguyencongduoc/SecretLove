import Link from 'next/link';
export default function Page() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1>Creator access is invitation-only</h1>
      <p className="my-6">
        The project owner must invite and approve Creators. Accepting an invitation does not grant
        Studio access. After confirmation, request a fresh recovery email to set your password.
      </p>
      <Link className="button" href="/login">
        Sign in
      </Link>{' '}
      <Link href="/recover">Set or recover password</Link>
    </main>
  );
}
