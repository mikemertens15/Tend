import { useId } from 'react';
import { shelf, fonts } from '../theme';
import { itemTint, tintedLabel } from '../data/collections';

// A case of trophies, for the one kind of status that's a reward rather than a
// state (see `presentation.shelf` in data/collections.js).
//
// The trophies are drawn rather than uploaded. Real cover art would mean
// Supabase Storage, a per-item upload and something to do when it's missing;
// a drawn trophy has none of that, is the same size every time, and — since
// what a platinum actually commemorates is the achievement, not the box art —
// loses very little. The platform's colour goes on the plinth, which is where
// an engraved plate would be anyway.

export function TrophyShelf({ heading, blurb, items, spec, onOpen }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          background: shelf.case,
          border: `1px solid ${shelf.caseBorder}`,
          borderRadius: 20,
          padding: '22px 24px 8px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* The light in the case. */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: shelf.glow, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ font: `400 22px ${fonts.serif}`, color: shelf.ink }}>{heading}</div>
            {blurb && (
              <div style={{ font: `400 12.5px ${fonts.sans}`, color: shelf.muted, marginTop: 3 }}>{blurb}</div>
            )}
          </div>
          <div style={{ font: `600 11px ${fonts.sans}`, color: shelf.faint, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {items.length} {items.length === 1 ? 'trophy' : 'trophies'}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 18,
          }}
        >
          {items.map((item) => (
            <TrophyPlinth key={item.id} item={item} spec={spec} onOpen={() => onOpen(item)} />
          ))}
        </div>

        {/* The rail the whole row stands on. */}
        <div
          aria-hidden="true"
          style={{ position: 'relative', height: 7, borderRadius: 4, background: shelf.rail, margin: '2px -4px 18px', boxShadow: '0 6px 18px rgba(0,0,0,.45)' }}
        />
      </div>
    </div>
  );
}

function TrophyPlinth({ item, spec, onOpen }) {
  const tint = itemTint(spec, item);
  const label = tintedLabel(spec, item);

  return (
    <button
      onClick={onOpen}
      title={label ? `${item.title} — ${label}` : item.title}
      style={{
        width: 108,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px 10px',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      {/* The console colour reads as a wash of light in the case rather than as
          coloured text. It's decorative, so it can be as saturated as the brand
          actually is — which the label below it can't, since these colours were
          picked to carry white text on a light row, and none of them clears
          4.5:1 against a near-black case. */}
      <span style={{ position: 'relative', display: 'block', lineHeight: 0 }}>
        {tint && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: '52%',
              width: 78,
              height: 78,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${tint} 0%, transparent 68%)`,
              opacity: 0.38,
              filter: 'blur(3px)',
              pointerEvents: 'none',
            }}
          />
        )}
        <Trophy tint={tint} />
      </span>
      <span
        style={{
          font: `600 11.5px/1.35 ${fonts.sans}`,
          color: shelf.ink,
          // Clamped to two lines, and *always* two lines tall. Clamping alone
          // still lets a one-line title sit shorter, which pushes the platform
          // and the stars under it out of line with its neighbours — on a row
          // of trophies that reads as crookedness rather than as variation.
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          height: '2.7em',
        }}
      >
        {item.title}
      </span>
      {label && (
        <span style={{ font: `600 9.5px ${fonts.sans}`, color: shelf.muted, letterSpacing: '.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      {item.rating > 0 && (
        <span aria-label={`${item.rating} out of 5`} style={{ font: `400 10px ${fonts.sans}`, color: shelf.star, letterSpacing: '.06em' }}>
          {'★'.repeat(item.rating)}
          <span style={{ color: shelf.starEmpty }}>{'★'.repeat(5 - item.rating)}</span>
        </span>
      )}
    </button>
  );
}

function Trophy({ tint }) {
  // Gradients are referenced by id, so two trophies on one shelf need two of
  // them or the second silently reuses the first.
  const uid = useId().replace(/:/g, '');
  const metal = `m-${uid}`;
  const rim = `r-${uid}`;

  return (
    <svg viewBox="0 0 64 82" width="60" height="77" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={shelf.metal[0]} />
          <stop offset="0.38" stopColor={shelf.metal[1]} />
          <stop offset="0.52" stopColor={shelf.metal[2]} />
          <stop offset="1" stopColor={shelf.metal[3]} />
        </linearGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shelf.metal[3]} />
          <stop offset="0.5" stopColor={shelf.metal[0]} />
          <stop offset="1" stopColor={shelf.metal[3]} />
        </linearGradient>
      </defs>

      {/* handles */}
      <path d="M18 15 C7 15 5 31 16.5 35" fill="none" stroke={`url(#${metal})`} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M46 15 C57 15 59 31 47.5 35" fill="none" stroke={`url(#${metal})`} strokeWidth="4.5" strokeLinecap="round" />

      {/* cup */}
      <path d="M17 12 H47 V22 C47 37 41 47 32 47 C23 47 17 37 17 22 Z" fill={`url(#${metal})`} />
      {/* the lip, which is what makes it read as a cup rather than a shield */}
      <rect x="15" y="9" width="34" height="5" rx="2.5" fill={`url(#${rim})`} />

      {/* stem */}
      <rect x="28.5" y="47" width="7" height="9" fill={`url(#${metal})`} />
      {/* base */}
      <rect x="21" y="55" width="22" height="5" rx="2" fill={`url(#${rim})`} />

      {/* plinth — the engraved plate, in the platform's colour when there is one */}
      <rect x="16" y="60" width="32" height="11" rx="3" fill={tint ?? shelf.metal[3]} />
      <rect x="16" y="60" width="32" height="3.5" rx="1.75" fill="rgba(255,255,255,.22)" />
    </svg>
  );
}
