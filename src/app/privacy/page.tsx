import Link from 'next/link';
import { privacyContact } from '@/lib/server/privacy';
export default function Page() {
  const contact = privacyContact();
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1>Privacy and safety</h1>
      <p>
        This policy is a draft pending operator approval and verification of hosting retention
        capabilities. Public release is not yet approved.
      </p>
      <p>
        The Project Owner / Administrator handles privacy, reports and deletion.{' '}
        {contact ? (
          <>
            Contact: <a href={`mailto:${contact}`}>{contact}</a>.
          </>
        ) : (
          'Contact address is pending verification; this is a release blocker.'
        )}
      </p>
      <p>
        Supabase and Vercel process account, access and private letter data. This service is not
        end-to-end encrypted. Name and date of birth are low-assurance access factors, not proof of
        identity. Authorized readers can save or copy content.
      </p>
      <p>
        Creators must have permission to use recipient details, photos and music. Do not send
        unwanted letters. Reports are reviewed before link suspension; closing revokes only the
        current reading session.
      </p>
      <p>
        Proposed retention: active letters/media until creator deletion or account closure; reports
        up to 90 days after resolution, unresolved reports up to 90 days from creation; restricted
        audit records 90 days after action or linked resolution. Finite documented investigation
        holds may extend these periods. Security logs target 30 days without secrets or letter
        contents. Backups target a maximum of 30 days, subject to provider support. These are
        targets, not verified operational guarantees.
      </p>
      <p>
        Deletion revokes active access promptly and queues media removal. Physical deletion and
        backup expiry are separate; no completion deadline is promised before worker/provider
        verification. A queue acknowledgement alone does not prove all bytes are gone.
      </p>
      <Link href="/privacy/requests">Request access or deletion</Link>
      <p>
        <Link href="/report">Report an unwanted letter</Link>
      </p>
    </main>
  );
}
