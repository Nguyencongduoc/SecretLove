import { AuthForm } from '@/components/auth-form';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <AuthForm mode="login" />
      {params.notice === 'confirmation_failed' && (
        <p role="alert" className="notice fixed bottom-6 left-6 right-6 mx-auto max-w-md">
          That email link could not be verified. Request a fresh link and try again.
        </p>
      )}
    </>
  );
}
