import Link from 'next/link';
import { getLetter } from '@/lib/server/letters';
import { pageData } from '@/lib/server/pages';
import { RichText } from '@/components/rich-text';
import { HeartPreview } from '@/components/heart-customization';
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const letter = await pageData(() => getLetter(id));
  return (
    <main className="py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link className="hint underline" href={`/studio/letters/${id}`}>
          ← Back to editor
        </Link>
        <p className="hint">Private preview · saved version</p>
      </div>
      <article
        className={`mx-auto max-w-3xl rounded-2xl border px-6 py-12 sm:px-14 ${letter.templateId === 'rose' ? 'border-rose-200 bg-[#fff2f4]' : 'border-stone-200 bg-white'}`}
      >
        <div className="mb-12 text-center">
          <p className="mb-5 text-3xl text-rose-700" aria-hidden="true">
            ♡
          </p>
          <p className="text-xs uppercase tracking-[.2em] text-rose-700">A letter for you</p>
          <h1 className="mt-6 break-words text-4xl">
            {letter.recipientDisplayName
              ? `Dear ${letter.recipientDisplayName},`
              : 'To someone special,'}
          </h1>
        </div>
        <RichText document={letter.bodyDoc} />
        {letter.photos.some((photo) => photo.status === 'ready') && (
          <section className="mt-12 border-t border-rose-100 pt-8">
            <h2 className="mb-6 text-center text-2xl">Little moments, kept close</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {letter.photos
                .filter((photo) => photo.status === 'ready')
                .map((photo) => (
                  <figure key={photo.id}>
                    <img
                      className="aspect-square w-full rounded-lg object-cover"
                      alt={photo.altText}
                      src={`/api/letters/${id}/photos/${photo.id}/media`}
                    />
                    <figcaption className="hint mt-3 text-center">{photo.altText}</figcaption>
                  </figure>
                ))}
            </div>
          </section>
        )}
        <p className="serif mt-12 text-center text-xl">With love, always.</p>
        <section className="mt-10 space-y-4 border-t pt-6" aria-label="Scene text preview">
          <h2 className="text-2xl">Heartbeat preview</h2>
          <p className="hint break-words">{letter.sceneText.heart.eyebrow}</p>
          <h3 className="text-xl break-words">{letter.sceneText.heart.title}</h3>
          <p className="whitespace-pre-line break-words">{letter.sceneText.heart.prompt}</p>
          <p className="whitespace-pre-line break-words">{letter.sceneText.heart.message}</p>
          <h2 className="pt-5 text-2xl">Closing preview</h2>
          <p className="hint break-words">{letter.sceneText.closing.eyebrow}</p>
          <h3 className="text-xl break-words">{letter.sceneText.closing.title}</h3>
          <p className="whitespace-pre-line break-words">{letter.sceneText.closing.message}</p>
        </section>
      </article>
      <section className="mt-8">
        <h2 className="text-center text-2xl mb-5">Saved 3D heart preview</h2>
        <HeartPreview value={letter.heartCustomization} sceneText={letter.sceneText} />
      </section>
    </main>
  );
}
