import { Heart } from 'lucide-react';
export function Rose({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 170" className={className} fill="none">
      <path d="M61 79C45 112 75 129 58 169" stroke="#857e5e" strokeWidth="3" />
      <path
        d="M61 127C78 108 105 107 96 125C85 141 65 139 61 127ZM60 145C36 121 13 124 23 140C34 153 53 153 60 145Z"
        fill="#686b4e"
      />
      {[0, 60, 120].map((angle) => (
        <ellipse
          key={angle}
          cx="60"
          cy="47"
          rx="31"
          ry="22"
          fill="#8d3d54"
          stroke="#c87e91"
          strokeWidth="1.3"
          transform={`rotate(${angle} 60 47)`}
        />
      ))}
      {[20, 80, 140].map((angle) => (
        <ellipse
          key={angle}
          cx="60"
          cy="44"
          rx="21"
          ry="13"
          fill="#bc7388"
          stroke="#e0a1b0"
          transform={`rotate(${angle} 60 44)`}
        />
      ))}
      <path d="M47 44C46 24 78 29 73 48C65 62 43 53 47 44Z" fill="#dd9daf" />
      <path d="M50 43C54 33 70 40 64 48" stroke="#84324b" strokeWidth="2" />
    </svg>
  );
}
export function Decorations() {
  return (
    <div className="sl-decoration" aria-hidden="true">
      <Rose className="sl-rose sl-rose-left" />
      <Rose className="sl-rose sl-rose-right" />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <span key={index} className={`sl-petal sl-petal-${index}`} />
      ))}
      <div className="sl-halo" />
    </div>
  );
}
export function StaticHeart() {
  return (
    <div className="sl-static-heart" aria-hidden="true">
      <Heart fill="currentColor" strokeWidth={0.6} />
    </div>
  );
}
