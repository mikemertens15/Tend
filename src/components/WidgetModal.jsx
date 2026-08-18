import { useState } from 'react';
import { colors, tone, fonts } from '../theme';
import { ModalShell, Label, inputStyle, PrimaryButton, GhostButton } from './Modal';
import { useWidgetTokens, widgetUrl } from '../data/useWidget';
import { parseDay, monthDay, dayStr } from '../dates';

// Making the link a phone widget reads.
//
// Worth saying plainly, because it's the second public surface in the app and
// the more sensitive of the two: this token is *yours*, not the household's, and
// what it returns is your day — private events included, because a widget that
// hid them from you would be useless. Anyone holding the link can read that,
// which is the trade, and it's read-only and revocable.

export function WidgetModal({ onClose }) {
  const { tokens, createToken, revokeToken, deleteToken } = useWidgetTokens();
  const [label, setLabel] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (busy) return;
    setBusy(true);
    await createToken(label);
    setLabel('');
    setBusy(false);
  }

  function copy(t) {
    navigator.clipboard?.writeText(widgetUrl(t.token));
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const live = tokens.filter((t) => !t.revoked && (!t.expires_on || t.expires_on >= dayStr()));

  return (
    <ModalShell
      title="Your phone widget"
      onClose={onClose}
      width={520}
      footer={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <PrimaryButton onClick={create}>Create a link</PrimaryButton>
        </div>
      }
    >
      <div style={{ font: `400 13px/1.65 ${fonts.sans}`, color: colors.muted, marginBottom: 18 }}>
        A link that returns your next few days as plain data, with no sign-in. The home-screen widget reads it; you can
        also open it in a browser to see exactly what it returns.
      </div>

      <div
        style={{
          background: colors.inputBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: '13px 15px',
          marginBottom: 20,
        }}
      >
        <div style={{ font: `600 12px ${fonts.sans}`, color: colors.ink, marginBottom: 5 }}>This one is yours alone</div>
        <div style={{ font: `400 11.5px/1.6 ${fonts.sans}`, color: colors.muted }}>
          It shows the events <strong style={{ color: colors.ink }}>you</strong> can see, which includes the ones marked
          private to you. Nobody else in the house can list or use your links — but anyone you send one to can read that
          day. Revoke it if a phone goes missing.
        </div>
      </div>

      <Label>Which device is it for?</Label>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && create()}
        placeholder="e.g. My iPhone"
        style={inputStyle}
      />

      {live.length === 0 ? (
        <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.faint }}>No links yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tokens.map((t) => {
            const dead = t.revoked || (t.expires_on && t.expires_on < dayStr());
            return (
              <div
                key={t.id}
                style={{
                  border: `1px solid ${dead ? colors.cardBorder : colors.selected}`,
                  background: dead ? 'transparent' : colors.chipBg,
                  borderRadius: 14,
                  padding: '12px 14px',
                  opacity: dead ? 0.55 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}>
                  <span style={{ font: `600 13px ${fonts.sans}`, color: colors.ink, flex: 1, minWidth: 100 }}>
                    {t.label || 'Unnamed device'}
                    {t.revoked && <span style={{ color: tone.red, fontWeight: 500 }}> · revoked</span>}
                  </span>
                  {!dead && (
                    <button
                      onClick={() => copy(t)}
                      style={{ padding: '6px 12px', borderRadius: 18, background: colors.accent, color: colors.onAccent, font: `600 11.5px ${fonts.sans}` }}
                    >
                      {copiedId === t.id ? 'Copied' : 'Copy link'}
                    </button>
                  )}
                  {!dead && (
                    <button onClick={() => revokeToken(t.id)} style={{ font: `600 11.5px ${fonts.sans}`, color: tone.red }}>
                      Revoke
                    </button>
                  )}
                  {dead && (
                    <button onClick={() => deleteToken(t.id)} style={{ font: `600 11.5px ${fonts.sans}`, color: colors.muted2 }}>
                      Delete
                    </button>
                  )}
                </div>
                <div style={{ font: `400 11px ${fonts.mono}`, color: colors.faint, wordBreak: 'break-all' }}>
                  {widgetUrl(t.token)}
                </div>
                {t.last_used_at && (
                  <div style={{ font: `400 11px ${fonts.sans}`, color: colors.faint, marginTop: 5 }}>
                    Last read {monthDay(parseDay(t.last_used_at.slice(0, 10)))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}
