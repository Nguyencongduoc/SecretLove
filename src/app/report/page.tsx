import { ReportForm } from '@/components/report-form';
export default function Page() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1>Report an unwanted letter</h1>
      <p>
        You can close a letter immediately to revoke your current session. Reports are reviewed by
        the project owner; there is no person-wide block based on name and date of birth.
      </p>
      <ReportForm />
    </main>
  );
}
