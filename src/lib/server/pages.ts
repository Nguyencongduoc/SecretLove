import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { AppError } from './errors';
export async function pageData<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect('/login');
    if (error instanceof AppError && error.code === 'CREATOR_NOT_APPROVED')
      redirect('/access-pending');
    if (error instanceof AppError && error.code === 'MFA_REQUIRED') redirect('/operator/security');
    if (error instanceof AppError && error.status === 404) notFound();
    // Do not render provider errors or content in Next's error boundary.
    throw new Error('Studio is unavailable. Check the setup guide or try again.');
  }
}
