import { useState } from 'react';
import { colors, tone, fonts } from '../theme';
import { ModalShell, Label, inputStyle, PrimaryButton, GhostButton } from './Modal';
import { useShareLinks, sitterUrl } from '../data/useSitter';
import { useHouseFacts } from '../data/useHouseFacts';
import { dayStr, addDays, parseDay, monthDay } from '../dates';

// Make and manage sitter links. The copy here does real work: someone handing
// out a URL that shows their wifi password should understand that before they
// send it, not after.
export function ShareLinkModal({ onClose }) {
  const { links, createLink, revokeLink, deleteLink } = useShareLinks();
  const { facts } = useHouseFacts();
  const factCount = facts.length;
  const shareableCount = facts.filter((f) => f.shareable).length;
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [expiresOn, setExpiresOn] = useState(addDays(dayStr(), 14));
  const [includeFacts, setIncludeFacts] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (busy) return;
    setBusy(true);
    await createLink({
      label: label.trim() || null,
      note: note.trim() || null,
      expires_on: expiresOn || null,
      include_pets: true,
      include_facts: includeFacts,
    });
    setLabel('');
    setNote('');
    setIncludeFacts(false);
    setBusy(false);
  }

  function copy(link) {
    navigator.clipboard?.writeText(sitterUrl(link.token));
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const live = links.filter((l) => !l.revoked && (!l.expires_on || l.expires_on >= dayStr()));

  return (
    <ModalShell
      title="Share with a sitter"
      onClose={onClose}
      footer={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <PrimaryButton onClick={create}>Create link</PrimaryButton>
        </div>
      }
    >
      <div style={{ font: `400 13px/1.6 ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
        Anyone with the link sees your pets' feeding routine, care jobs and vet details — and can tick meals off as
        they do them. No account needed. They can't see anything else in Tend.
      </div>

      <Label>Who's it for?</Label>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Sarah, while we're away"
        style={inputStyle}
      />

      <Label>Anything they should know</Label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="e.g. Spare key is under the pot by the back door. Bins go out Tuesday night."
        style={{ ...inputStyle, resize: 'vertical', font: `500 14px ${fonts.sans}` }}
      />

      <Label>Stops working after</Label>
      <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} style={inputStyle} />

      <button
        onClick={() => setIncludeFacts((f) => !f)}
        aria-pressed={includeFacts}
        disabled={shareableCount === 0}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 11,
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          marginBottom: 24,
          textAlign: 'left',
          background: includeFacts ? colors.chipBg : colors.inputBg,
          border: `1px solid ${includeFacts ? colors.selected : colors.cardBorder}`,
          opacity: shareableCount === 0 ? 0.65 : 1,
          cursor: shareableCount === 0 ? 'default' : 'pointer',
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1.2 }}>{includeFacts ? '📋' : '🔒'}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>
            Include house facts
          </span>
          <span style={{ display: 'block', font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {shareableCount === 0
              ? factCount === 0
                ? 'No house facts yet. Add some, then tick the ones a sitter should see.'
                : `None of your ${factCount} facts are marked shareable yet — tick them individually in House facts.`
              : `Only the ${shareableCount} fact${shareableCount === 1 ? '' : 's'} you've marked shareable. Values are shown in full, including any you've hidden behind a tap.`}
          </span>
        </span>
      </button>

      {links.length > 0 && (
        <>
          <Label>
            Links {live.length > 0 && `· ${live.length} active`}
          </Label>
          {links.map((l) => {
            const expired = l.expires_on && l.expires_on < dayStr();
            const dead = l.revoked || expired;
            return (
              <div
                key={l.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: colors.inputBg,
                  border: `1px solid ${colors.cardBorder}`,
                  marginBottom: 8,
                  opacity: dead ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `600 13px ${fonts.sans}`, color: colors.ink }}>
                      {l.label || 'Sitter link'}
                    </div>
                    <div style={{ font: `400 11.5px ${fonts.sans}`, color: dead ? tone.red : colors.muted, marginTop: 2 }}>
                      {l.revoked
                        ? 'Turned off'
                        : expired
                          ? `Expired ${monthDay(parseDay(l.expires_on))}`
                          : l.expires_on
                            ? `Works until ${monthDay(parseDay(l.expires_on))}`
                            : 'No expiry'}
                      {l.include_facts && !dead && ' · includes facts'}
                    </div>
                  </div>
                  {!dead && (
                    <button
                      onClick={() => copy(l)}
                      style={{ padding: '6px 12px', borderRadius: 18, background: colors.accent, color: colors.onAccent, font: `600 11.5px ${fonts.sans}`, flexShrink: 0 }}
                    >
                      {copiedId === l.id ? 'Copied!' : 'Copy link'}
                    </button>
                  )}
                  <button
                    onClick={() => (dead ? deleteLink(l.id) : revokeLink(l.id))}
                    style={{ font: `600 11.5px ${fonts.sans}`, color: tone.red, flexShrink: 0, padding: '6px 4px' }}
                  >
                    {dead ? 'Delete' : 'Turn off'}
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </ModalShell>
  );
}
