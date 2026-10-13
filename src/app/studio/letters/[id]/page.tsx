import { getLetter } from '@/lib/server/letters';
import { pageData } from '@/lib/server/pages';
import { LetterEditor } from '@/components/letter-editor';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const letter = await pageData(() => getLetter(id));
  return <LetterEditor key={letter.id} initial={letter} />;
}
