import Link from 'next/link';
import { pageData } from '@/lib/server/pages';
import { requireOperator } from '@/lib/server/identity';
import { OperatorConsole } from '@/components/operator-console';
import { SignOut } from '@/components/auth-form';
export default async function Page() {
  await pageData(() => requireOperator());
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1>Operator review</h1>
      <p>
        Restricted, audited operations. No private letter content or media preview is granted by
        this role.
      </p>
      <Link href="/operator/security">Two-factor security</Link>
      <SignOut />
      <OperatorConsole />
    </main>
  );
}
