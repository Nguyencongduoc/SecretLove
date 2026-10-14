'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { Heart, Mail, RotateCcw } from 'lucide-react';
import { RichText } from '@/components/rich-text';
import type { SceneProps } from '@/lib/experience/types';
import type { SceneKind, SceneSpec } from '@/lib/experience/configuration';
import { StaticHeart } from './decorations';
import { resolveHeart, ringPhrases } from '@/lib/validation/heart';
const HeartCanvas = dynamic(() => import('./heart-canvas'), {
  ssr: false,
  loading: () => <StaticHeart />,
});
function EnvelopeScene({ content, reducedMotion, next, interact }: SceneProps<'envelope'>) {
  const [opened, setOpened] = useState(false);
  return (
    <div className="sl-scene sl-centered">
      <p className="sl-eyebrow">For {content.recipientDisplayName}</p>
      <h1>A little piece of someone’s heart</h1>
      <p className="sl-copy">Some words were meant to be held close.</p>
      <button
        className="sl-envelope-button"
        aria-label="Open the envelope"
        disabled={opened}
        onClick={() => {
          interact();
          setOpened(true);
        }}
      >
        <motion.div
          className="sl-envelope"
          animate={opened ? { y: reducedMotion ? 0 : 12 } : { y: 0 }}
        >
          <motion.div
            className="sl-envelope-letter"
            animate={opened ? { y: reducedMotion ? 0 : -68, opacity: 1 } : { y: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.7 }}
          >
            <Heart size={30} strokeWidth={1} />
            <span>Words, just for you</span>
          </motion.div>
          <div className="sl-envelope-front" />
          <motion.div
            className="sl-envelope-flap"
            animate={{ rotateX: opened ? 180 : 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.7 }}
          />
          {!opened && (
            <span className="sl-wax-seal">
              <Heart size={22} fill="currentColor" />
            </span>
          )}
        </motion.div>
      </button>
      <p className="sl-copy">
        {opened ? 'Your letter is waiting inside.' : 'Tap the seal to open your gift.'}
      </p>
      {opened && (
        <button className="sl-button" onClick={next}>
          Continue to the heartbeat <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
export function HeartScene({ content, reducedMotion, mediaError, interact }: SceneProps<'heart'>) {
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);
  const config = resolveHeart(content.presentation.configuration.heartCustomization);
  const reveal = () => {
    interact();
    setRevealed(true);
  };
  return (
    <div
      className="sl-scene sl-centered sl-heart-scene"
      data-heart-mode={reducedMotion ? 'reduced-motion' : failed ? 'unavailable' : 'animated'}
    >
      <p className="sl-eyebrow break-words">{content.sceneText.heart.eyebrow}</p>
      <h1 className="break-words">{content.sceneText.heart.title}</h1>
      <div className="sl-heart-viewport">
        {reducedMotion || failed ? (
          <StaticHeart />
        ) : (
          <HeartCanvas
            config={config}
            onReveal={reveal}
            onFailure={() => {
              setFailed(true);
              mediaError();
            }}
          />
        )}
      </div>
      <ul
        className={reducedMotion || failed ? 'sl-static-ring-phrases' : 'sr-only'}
        aria-label="Heart ring phrases"
      >
        {ringPhrases(config).map((phrase, index) => (
          <li key={index}>{phrase}</li>
        ))}
      </ul>
      <button
        type="button"
        className="sl-link-button sl-heart-reveal"
        aria-label="Reveal a little message"
        onClick={reveal}
      >
        Touch the heart · reveal a message
      </button>
      <p className="sl-copy whitespace-pre-line break-words" role="status">
        {revealed ? content.sceneText.heart.message : content.sceneText.heart.prompt}
      </p>
    </div>
  );
}
function Memory({
  url,
  description,
  mediaError,
}: {
  url: string;
  description: string;
  mediaError(): void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="sl-memory">
      {failed ? (
        <div className="sl-memory-error">
          <Mail />
          <p>This memory could not load. You can keep reading.</p>
        </div>
      ) : (
        // Private media must bypass the public image optimizer.
        <img
          src={url}
          alt={description}
          loading="lazy"
          onError={() => {
            setFailed(true);
            mediaError();
          }}
        />
      )}
      {description !== 'Photo memory' && <figcaption>{description}</figcaption>}
    </figure>
  );
}
function GalleryScene({ content, photoUrl, mediaError }: SceneProps<'gallery'>) {
  return (
    <div className="sl-scene">
      <div className="sl-centered">
        <p className="sl-eyebrow">Little moments, lasting memories</p>
        <h1>A story in photographs</h1>
        <p className="sl-copy">The moments that words can’t quite hold.</p>
      </div>
      <div className="sl-gallery">
        {content.photos.map((photo) => (
          <Memory
            key={photo.id}
            url={photoUrl(photo.id)}
            description={photo.altText}
            mediaError={mediaError}
          />
        ))}
      </div>
    </div>
  );
}
function LetterScene({ content }: SceneProps<'letter'>) {
  return (
    <div className="sl-scene">
      <div className="sl-centered">
        <p className="sl-eyebrow">From the heart</p>
        <h1>Words worth keeping</h1>
      </div>
      <article className="sl-letter-paper">
        <span className="sl-paper-mark" aria-hidden="true">
          <Heart size={28} strokeWidth={1} />
        </span>
        <h2>Dear {content.recipientDisplayName},</h2>
        <RichText document={content.bodyDoc} />
        <div className="sl-paper-footer" aria-hidden="true">
          ✧
        </div>
      </article>
    </div>
  );
}
function FinalScene({ content, replay }: SceneProps<'final-message'>) {
  return (
    <div className="sl-scene sl-centered">
      <div className="sl-closing-heart" aria-hidden="true">
        <Heart size={52} strokeWidth={1} />
      </div>
      <p className="sl-eyebrow break-words">{content.sceneText.closing.eyebrow}</p>
      <h1 className="break-words">{content.sceneText.closing.title}</h1>
      <p className="sl-copy whitespace-pre-line break-words">{content.sceneText.closing.message}</p>
      <button className="sl-button" onClick={replay}>
        <RotateCcw size={16} /> Replay the experience
      </button>
    </div>
  );
}
type SceneRegistry = { [K in SceneKind]: React.ComponentType<SceneProps<K>> };
export const sceneRegistry: SceneRegistry = {
  envelope: EnvelopeScene,
  heart: HeartScene,
  gallery: GalleryScene,
  letter: LetterScene,
  'final-message': FinalScene,
};
type Shared = Omit<SceneProps<'envelope'>, 'options'>;
export function SceneRenderer({ scene, ...props }: Shared & { scene: SceneSpec }) {
  // Typed dispatch preserves each registered kind/options relationship.
  switch (scene.kind) {
    case 'envelope':
      return <sceneRegistry.envelope {...props} options={scene.options} />;
    case 'heart':
      return <sceneRegistry.heart {...props} options={scene.options} />;
    case 'gallery':
      return <sceneRegistry.gallery {...props} options={scene.options} />;
    case 'letter':
      return <sceneRegistry.letter {...props} options={scene.options} />;
    case 'final-message': {
      const Closing = sceneRegistry['final-message'];
      return <Closing {...props} options={scene.options} />;
    }
  }
}
