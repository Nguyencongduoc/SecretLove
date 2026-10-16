import { privacyContact } from '@/lib/server/privacy';
export default function Page() {
  const contact = privacyContact();
  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1>Privacy and deletion requests</h1>
      <p>
        Contact the Project Owner / Administrator
        {contact ? (
          <>
            {' '}
            at <a href={`mailto:${contact}`}>{contact}</a>
          </>
        ) : (
          ' once the pending contact address is published'
        )}
        . Do not send passwords, secret passphrases or letter contents. Suspended Creators can also
        request deletion.
      </p>
      <p>
        The owner records a case reference, verifies entitlement without disclosing other users’
        data, reviews any documented hold, and separately authorizes scoped deletion. Access
        revocation, queued active-media removal, Auth account deletion and provider backup expiry
        are distinct steps. No automatic bulk account deletion is available.
      </p>
      <p>
        Contact verification, policy approval and cleanup operations remain release prerequisites.
      </p>
    </main>
  );
}
