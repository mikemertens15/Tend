import { useState } from 'react';
import { colors, shadows, fonts } from '../theme';
import { Card } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useHouseFacts, FACT_SUGGESTIONS } from '../data/useHouseFacts';
import { HouseFactModal } from '../components/HouseFactModal';

// The stuff you end up googling in a hardware store aisle, written down once.
export function HouseFactsView() {
  const narrow = useIsNarrow();
  const { groups, facts, loading, addFact, updateFact, removeFact } = useHouseFacts();
  const [editing, setEditing] = useState(null); // 'new' | row | null
  const [query, setQuery] = useState('');

  if (loading) return null;

  const q = query.trim().toLowerCase();
  const matches = (f) =>
    !q ||
    [f.label, f.value, f.detail, f.location].filter(Boolean).some((s) => s.toLowerCase().includes(q));
  const visible = groups
    .map((g) => ({ ...g, facts: g.facts.filter(matches) }))
    .filter((g) => g.facts.length > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>House facts</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Filter sizes, paint colours, model numbers — the answers you need standing in an aisle.
          </div>
        </div>
        <button
          onClick={() => setEditing('new')}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
        >
          + Add a fact
        </button>
      </div>

      {facts.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — “filter”, “white”, “serial”…"
          style={{
            width: '100%',
            border: `1px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            borderRadius: 12,
            padding: '11px 14px',
            font: `500 14px ${fonts.sans}`,
            color: colors.ink,
            outline: 'none',
            marginBottom: 18,
          }}
        />
      )}

      {facts.length === 0 ? (
        <Card style={{ padding: '34px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📋</div>
          <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>Nothing written down yet</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
            Start with the ones everybody forgets:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {FACT_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => setEditing({ ...s, id: null })}
                style={{ padding: '8px 14px', borderRadius: 20, background: colors.chipBg, color: colors.muted3, font: `500 12.5px ${fonts.sans}` }}
              >
                + {s.label}
              </button>
            ))}
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <Card style={{ padding: '30px 0', textAlign: 'center' }}>
          <div style={{ font: `400 14px ${fonts.sans}`, color: colors.muted }}>Nothing matches “{query}”.</div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18, alignItems: 'start' }}>
          {visible.map((group) => (
            <Card key={group.key} style={{ padding: '20px 24px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                <span aria-hidden="true" style={{ fontSize: 17 }}>
                  {group.icon}
                </span>
                <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink }}>{group.label}</div>
              </div>
              <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginBottom: 8 }}>{group.blurb}</div>
              {group.facts.map((f, i) => (
                <FactRow key={f.id} fact={f} topBorder={i > 0} onEdit={() => setEditing(f)} />
              ))}
            </Card>
          ))}
        </div>
      )}

      {editing !== null && (
        <HouseFactModal
          fact={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(fields) =>
            editing !== 'new' && editing.id ? updateFact(editing.id, fields) : addFact(fields)
          }
          onDelete={removeFact}
        />
      )}
    </div>
  );
}

function FactRow({ fact, topBorder, onEdit }) {
  // Secrets are masked until tapped. That's cover from someone reading over
  // your shoulder at the kitchen tablet, not encryption — the value is stored
  // in plain text like everything else here.
  const [revealed, setRevealed] = useState(false);
  const hidden = fact.secret && !revealed;

  return (
    <div style={{ padding: '12px 0', borderTop: topBorder ? `1px solid ${colors.divider}` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <button
          onClick={onEdit}
          style={{ font: `500 12.5px ${fonts.sans}`, color: colors.muted, textAlign: 'left', flexShrink: 0, minWidth: 96 }}
          title="Edit"
        >
          {fact.label}
          {fact.shareable && (
            <span title="Visible on sitter links" aria-label="Visible on sitter links" style={{ marginLeft: 5 }}>
              🔗
            </span>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <button
            onClick={() => fact.secret && setRevealed((r) => !r)}
            style={{
              font: `600 13.5px ${fonts.mono}`,
              color: colors.ink,
              wordBreak: 'break-word',
              textAlign: 'right',
              cursor: fact.secret ? 'pointer' : 'default',
            }}
            title={fact.secret ? (revealed ? 'Tap to hide' : 'Tap to reveal') : undefined}
          >
            {hidden ? '••••••••' : fact.value}
          </button>
        </div>
      </div>
      {(fact.detail || fact.location) && (
        <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.faint, marginTop: 3 }}>
          {[fact.detail, fact.location].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}
