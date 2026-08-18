import { useState } from 'react';
import { colors, tone, fonts } from '../theme';
import { ModalShell, Label, inputStyle, PrimaryButton, GhostButton } from './Modal';
import { useCalendars } from '../data/useCalendars';
import { CALENDAR_COLORS, CALENDAR_ICONS, DEFAULT_CALENDAR_COLOR, tint } from '../data/calendars';

// Naming, colouring and adding calendars.
//
// The only setting here that does anything beyond looks is the last one: whether
// events added to this calendar start private. That's what makes a calendar
// called School mean something — you file a lecture on it and it's yours,
// without answering a question about permissions every time.

export function CalendarsModal({ onClose }) {
  const { calendars, addCalendar, updateCalendar, removeCalendar } = useCalendars();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_CALENDAR_COLOR);
  const [icon, setIcon] = useState('📅');
  const [privateByDefault, setPrivateByDefault] = useState(false);
  const [confirming, setConfirming] = useState(null);

  async function create() {
    if (!name.trim()) return;
    await addCalendar({
      name: name.trim(),
      color,
      icon,
      default_visibility: privateByDefault ? 'private' : 'household',
    });
    setName('');
    setColor(DEFAULT_CALENDAR_COLOR);
    setIcon('📅');
    setPrivateByDefault(false);
    setAdding(false);
  }

  return (
    <ModalShell
      title="Calendars"
      onClose={onClose}
      width={520}
      footer={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <GhostButton onClick={onClose}>Done</GhostButton>
          {adding ? (
            <PrimaryButton onClick={create}>Add calendar</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setAdding(true)}>New calendar</PrimaryButton>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: adding ? 22 : 0 }}>
        {calendars.map((c) => (
          <div
            key={c.id}
            style={{
              background: tint(c.color, 0.1),
              border: `1px solid ${tint(c.color, 0.35)}`,
              borderRadius: 14,
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <select
                value={c.icon}
                onChange={(e) => updateCalendar(c.id, { icon: e.target.value })}
                aria-label={`Icon for ${c.name}`}
                style={{
                  width: 46,
                  border: `1px solid ${colors.inputBorder}`,
                  background: colors.card,
                  borderRadius: 10,
                  padding: '7px 4px',
                  fontSize: 15,
                  textAlign: 'center',
                  color: colors.ink,
                }}
              >
                {[...new Set([c.icon, ...CALENDAR_ICONS])].map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <input
                value={c.name}
                onChange={(e) => updateCalendar(c.id, { name: e.target.value })}
                aria-label={`Name of ${c.name}`}
                style={{ ...inputStyle, marginBottom: 0, background: colors.card, flex: 1, minWidth: 0 }}
              />
              <button
                onClick={() => setConfirming(confirming === c.id ? null : c.id)}
                aria-label={`Delete ${c.name}`}
                style={{ font: `600 12px ${fonts.sans}`, color: tone.red, padding: '0 2px' }}
              >
                Delete
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {CALENDAR_COLORS.map(([hex, label]) => (
                <button
                  key={hex}
                  onClick={() => updateCalendar(c.id, { color: hex })}
                  aria-label={label}
                  title={label}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: hex,
                    border: c.color === hex ? `2px solid ${colors.ink}` : '2px solid transparent',
                    boxShadow: c.color === hex ? `0 0 0 2px ${colors.card}` : 'none',
                  }}
                />
              ))}
            </div>

            <button
              onClick={() =>
                updateCalendar(c.id, {
                  default_visibility: c.default_visibility === 'private' ? 'household' : 'private',
                })
              }
              aria-pressed={c.default_visibility === 'private'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                font: `500 11.5px ${fonts.sans}`,
                color: colors.muted2,
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 19,
                  borderRadius: 12,
                  background: c.default_visibility === 'private' ? c.color : colors.track,
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background .15s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: c.default_visibility === 'private' ? 17 : 2,
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    background: colors.card,
                    transition: 'left .15s',
                  }}
                />
              </span>
              {c.default_visibility === 'private'
                ? 'New events here start private to whoever they belong to'
                : 'New events here are visible to the whole household'}
            </button>

            {confirming === c.id && (
              <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${colors.divider}` }}>
                <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 9 }}>
                  Deleting {c.name} doesn’t delete what’s on it — those events stay, in the default colour. Only the
                  calendar goes.
                </div>
                <button
                  onClick={() => {
                    removeCalendar(c.id);
                    setConfirming(null);
                  }}
                  style={{ padding: '7px 14px', borderRadius: 20, background: tone.red, color: colors.onAccent, font: `600 12px ${fonts.sans}` }}
                >
                  Delete {c.name}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 20 }}>
          <Label>Name</Label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="e.g. Football, or Kelly’s work"
            style={inputStyle}
          />

          <Label>Colour</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {CALENDAR_COLORS.map(([hex, label]) => (
              <button
                key={hex}
                onClick={() => setColor(hex)}
                aria-label={label}
                title={label}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: hex,
                  border: color === hex ? `2px solid ${colors.ink}` : '2px solid transparent',
                  boxShadow: color === hex ? `0 0 0 2px ${colors.card}` : 'none',
                }}
              />
            ))}
          </div>

          <Label>Icon</Label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {CALENDAR_ICONS.map((i) => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  fontSize: 15,
                  background: icon === i ? colors.chipBg : colors.inputBg,
                  border: `1px solid ${icon === i ? colors.selected : colors.cardBorder}`,
                }}
              >
                {i}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPrivateByDefault((p) => !p)}
            aria-pressed={privateByDefault}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 11,
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              textAlign: 'left',
              background: privateByDefault ? colors.chipBg : colors.inputBg,
              border: `1px solid ${privateByDefault ? colors.selected : colors.cardBorder}`,
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1.2 }}>{privateByDefault ? '🔒' : '🏡'}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>
                Start events on this calendar private
              </span>
              <span style={{ display: 'block', font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                For a timetable or anything medical. You can still change any single event afterwards.
              </span>
            </span>
          </button>
        </div>
      )}
    </ModalShell>
  );
}
