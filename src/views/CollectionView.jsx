import { useState } from 'react';
import { colors, shadows, fonts } from '../theme';
import { Card, Avatar, ProgressBar } from '../components/ui';
import { useHousehold } from '../household/HouseholdProvider';
import { useCollection } from '../data/useCollection';
import { CollectionItemModal } from '../components/CollectionItemModal';
import {
  DOMAINS,
  HOBBY_SECTIONS,
  isUnderway,
  optionValue,
  optionLabel,
  itemTint,
  tintedLabel,
  shelfFor,
} from '../data/collections';
import { TrophyShelf } from '../components/TrophyShelf';
import { matchesOwner, OWNER_ALL } from '../data/owner';

// One view for every hobby. Everything on screen — the lifecycle tabs, the
// status toggle, the subtitle line, whether there's a progress bar — comes
// from the domain spec, so a new hobby needs no new view.
export function CollectionView({ section, navigate }) {
  const { order, currentMember } = useHousehold();
  const { items, loading, addItem, updateItem, removeItem } = useCollection(section.domains);

  const [domain, setDomain] = useState(section.domains[0]);
  // Hobbies are personal, so default to just yours with everyone a click away.
  const [owner, setOwner] = useState(currentMember?.name ?? 'all');
  const [editing, setEditing] = useState(null); // item being edited
  const [adding, setAdding] = useState(false);

  const spec = DOMAINS[domain];
  const ofDomain = items.filter((i) => i.domain === domain);
  const visible = ofDomain.filter((i) => matchesOwner(owner, i.owner));
  // Counted off `visible`, not the whole domain, so the summary line always
  // describes the list underneath it rather than someone else's shelf.
  const inProgress = visible.filter(isUnderway).length;

  const ownerChips = [['all', 'Everyone'], ...order.map((n) => [n, n])];

  return (
    <div>
      {/* Hop straight between hobbies without going back to the landing page. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('hobbies')}
          style={{ font: `500 12.5px ${fonts.sans}`, color: colors.muted, padding: '5px 10px 5px 0', cursor: 'pointer' }}
        >
          ← Hobbies
        </button>
        {HOBBY_SECTIONS.map((s) => {
          const sel = s.key === section.key;
          return (
            <button
              key={s.key}
              onClick={() => navigate(s.key)}
              aria-current={sel ? 'page' : undefined}
              style={{
                padding: '5px 12px',
                borderRadius: 18,
                background: sel ? colors.chipBg : 'transparent',
                color: sel ? colors.ink : colors.muted2,
                font: `${sel ? 600 : 500} 12.5px ${fonts.sans}`,
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>{section.label}</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {visible.length} {(visible.length === 1 ? spec.noun : spec.label).toLowerCase()} ·{' '}
            {inProgress} in progress
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent }}
        >
          + Add {spec.noun.toLowerCase()}
        </button>
      </div>

      {section.domains.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {section.domains.map((d) => {
            const sel = domain === d;
            return (
              <button
                key={d}
                onClick={() => setDomain(d)}
                style={
                  sel
                    ? { padding: '8px 18px', borderRadius: 20, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}` }
                    : { padding: '8px 18px', borderRadius: 20, background: colors.card, border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `500 13px ${fonts.sans}` }
                }
              >
                {DOMAINS[d].label}
              </button>
            );
          })}
        </div>
      )}

      {order.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {ownerChips.map(([key, label]) => {
            const sel = owner === key;
            return (
              <button
                key={key}
                onClick={() => setOwner(key)}
                style={
                  sel
                    ? { padding: '7px 15px', borderRadius: 20, background: colors.chipBg, color: colors.ink, font: `600 12.5px ${fonts.sans}` }
                    : { padding: '7px 15px', borderRadius: 20, background: 'transparent', border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `500 12.5px ${fonts.sans}` }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? null : visible.length === 0 ? (
        <Card style={{ padding: '36px 24px', textAlign: 'center' }}>
          {/* "Empty" and "all of it is filtered out" are different problems and
              need different words — saying "nothing here yet" over the top of
              items that exist is how one got lost in the first place. */}
          {ofDomain.length > 0 ? (
            <>
              <div style={{ font: `400 15px ${fonts.sans}`, color: colors.muted, marginBottom: 14 }}>
                {ofDomain.length} {(ofDomain.length === 1 ? spec.noun : spec.label).toLowerCase()} hidden by the{' '}
                {owner === OWNER_ALL ? 'current filter' : `“${owner}” filter`}.
              </div>
              <button
                onClick={() => setOwner(OWNER_ALL)}
                style={{ padding: '8px 16px', borderRadius: 20, background: colors.chipBg, color: colors.muted3, font: `600 12.5px ${fonts.sans}` }}
              >
                Show everyone's
              </button>
            </>
          ) : (
            <div style={{ font: `400 15px ${fonts.sans}`, color: colors.muted }}>
              Nothing here yet — add a {spec.noun.toLowerCase()} to get started.
            </div>
          )}
        </Card>
      ) : (
        spec.statuses.map((status) => {
          const group = visible.filter((i) => i.status === status.key);
          if (group.length === 0) return null;

          // One status per domain can ask for the display case instead of a
          // list. It brings its own heading, so it replaces the whole block.
          const shelfSpec = shelfFor(spec, status.key);
          if (shelfSpec) {
            return (
              <TrophyShelf
                key={status.key}
                heading={shelfSpec.heading}
                blurb={shelfSpec.blurb}
                items={group}
                spec={spec}
                onOpen={setEditing}
              />
            );
          }

          return (
            <div key={status.key} style={{ marginBottom: 22 }}>
              <div style={{ font: `400 18px ${fonts.serif}`, color: colors.ink, marginBottom: 10 }}>
                {status.long}
                <span style={{ font: `500 12px ${fonts.sans}`, color: colors.muted, marginLeft: 8 }}>{group.length}</span>
              </div>
              <Card style={{ padding: '4px 22px 8px' }}>
                {group.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    spec={spec}
                    topBorder={idx > 0}
                    onUpdate={updateItem}
                    onEdit={() => setEditing(item)}
                  />
                ))}
              </Card>
            </div>
          );
        })
      )}

      {(adding || editing) && (
        <CollectionItemModal
          section={section}
          item={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={(patch) => (editing ? updateItem(editing.id, patch) : addItem(patch))}
          onRemove={removeItem}
        />
      )}
    </div>
  );
}

function ItemRow({ item, spec, topBorder, onUpdate, onEdit }) {
  // The tinted field is pulled out of the subtitle and rendered as a coloured
  // pill instead — "PlayStation" in PlayStation blue is scannable down a list
  // in a way that the same word buried in a grey run of text is not.
  const tintField = spec.presentation?.tint?.field;
  const tint = itemTint(spec, item);
  const tintLabel = tintedLabel(spec, item);

  // Subtitle line: owner, then whichever spec fields are flagged as meta.
  const meta = [item.owner];
  for (const field of spec.fields) {
    if (!field.meta || !item[field.key]) continue;
    // Skip the tinted one only when it actually got a colour; an unrecognised
    // service still belongs in the subtitle rather than disappearing.
    if (field.key === tintField && tint) continue;
    const opt = field.options?.find((o) => optionValue(o) === item[field.key]);
    meta.push(opt ? optionLabel(opt) : item[field.key]);
  }

  const status = spec.statuses.find((s) => s.key === item.status);
  const showBar = spec.progress && item.progressTotal > 0;
  const pct = showBar ? Math.min(100, Math.round(((item.progressCurrent ?? 0) / item.progressTotal) * 100)) : 0;

  return (
    <div style={{ padding: '14px 0', borderTop: topBorder ? `1px solid ${colors.divider}` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {item.owner && <Avatar who={item.owner} size={30} />}
        <button onClick={onEdit} style={{ flex: 1, minWidth: 140, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink }}>{item.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3, flexWrap: 'wrap' }}>
            {tint && (
              <span
                style={{
                  font: `600 10.5px ${fonts.sans}`,
                  color: '#fff',
                  background: tint,
                  padding: '2.5px 8px',
                  borderRadius: 20,
                  letterSpacing: '.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {tintLabel}
              </span>
            )}
            <span style={{ font: `400 12px ${fonts.sans}`, color: colors.muted }}>
              {meta.filter(Boolean).join(' · ') || (tint ? '' : '—')}
            </span>
          </div>
        </button>

        {status?.rate && <Stars value={item.rating} onSet={(r) => onUpdate(item.id, { rating: r })} />}

        <StatusControl spec={spec} value={item.status} onSet={(s) => onUpdate(item.id, { status: s })} />
      </div>

      {showBar && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: `500 11.5px ${fonts.sans}`, color: colors.muted, marginBottom: 5 }}>
            <span>{spec.progress.label}</span>
            <span>
              {item.progressCurrent ?? 0} / {item.progressTotal}
            </span>
          </div>
          <ProgressBar pct={pct} />
        </div>
      )}

      {spec.noteLabel && item.note && (
        <div style={{ font: `400 12.5px/1.5 ${fonts.sans}`, color: colors.muted2, marginTop: 8 }}>
          <span style={{ color: colors.faint }}>{spec.noteLabel}: </span>
          {item.note}
        </div>
      )}
    </div>
  );
}

function StatusControl({ spec, value, onSet }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: colors.inputBg, borderRadius: 20, padding: 3, flexShrink: 0, flexWrap: 'wrap' }}>
      {spec.statuses.map((s) => {
        const sel = value === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onSet(s.key)}
            aria-pressed={sel}
            title={s.long}
            style={{
              padding: '5px 11px',
              borderRadius: 18,
              background: sel ? colors.accent : 'transparent',
              color: sel ? colors.onAccent : colors.muted2,
              font: `${sel ? 600 : 500} 11.5px ${fonts.sans}`,
              whiteSpace: 'nowrap',
            }}
          >
            {s.short}
          </button>
        );
      })}
    </div>
  );
}

function Stars({ value = 0, onSet }) {
  return (
    <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onSet(n === value ? null : n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          style={{ padding: '0 1px', fontSize: 15, lineHeight: 1, color: n <= value ? colors.accent : colors.starEmpty }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
