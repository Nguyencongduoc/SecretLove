import type { Metadata } from 'next';
import { RecipientExperience } from '@/components/recipient/experience';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'A gift of words',
  description: 'A private moment, waiting to unfold.',
  robots: { index: false, follow: false },
};
export default async function LetterPage({ params }: { params: Promise<{ shareToken: string }> }) {
  // Generic shell only: no protected DAL lookup, content serialization or preload.
  return <RecipientExperience shareToken={(await params).shareToken} />;
}
