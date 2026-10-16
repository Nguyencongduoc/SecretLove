import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageData } from '@/lib/server/pages';
import { requireAuthenticatedUser, type CreatorAccess } from '@/lib/server/identity';
import { rpc } from '@/lib/server/rpc';
import { SignOut } from '@/components/auth-form';
export default async function Page() {
  const access = await pageData(async () => {
    const { user } = await requireAuthenticatedUser();
    return rpc<CreatorAccess>('sl_creator_status', { a: user.id });
  });
  if (access.status === 'approved') redirect('/studio');
  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1>Creator access pending</h1>
      <p>
        Status: {access.status === 'suspended' ? 'Suspended' : 'Not yet approved'}. Contact the
        project owner for review. Invitation acceptance alone does not approve access.
      </p>
      <p>
        To set your password, request a fresh recovery email. An invitation is not a recovery link.
      </p>
      <Link href="/recover">Set or recover password</Link>
      <p>
        <Link href="/privacy/requests">Contact and account requests</Link>
      </p>
      <SignOut />
    </main>
  );
}
