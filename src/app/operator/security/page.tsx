import { pageData } from '@/lib/server/pages';
import { requireOperator } from '@/lib/server/identity';
import { OperatorMfa } from '@/components/operator-mfa';
export default async function Page() {
  await pageData(() => requireOperator(false));
  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1>Operator two-factor security</h1>
      <p>
        Only an already registered operator can access this setup. Enrollment does not grant an
        operator role. Report and moderation access requires a verified AAL2 session.
      </p>
      <OperatorMfa />
    </main>
  );
}
