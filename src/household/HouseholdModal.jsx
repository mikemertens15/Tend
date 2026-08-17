import { useState, useEffect } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { Avatar } from '../components/ui';
import { useHousehold } from './HouseholdProvider';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../useTheme';
import { PALETTES, MODES } from '../data/palettes';
import { useSections } from '../data/useSections';
import { OPTIONAL_SECTIONS, SECTION_BLURBS } from '../nav';
import { geocode } from '../data/weather';

// Account + household management, opened from the TopNav avatar: share the
// invite code, see/add members, and sign out.
export function HouseholdModal({ onClose }) {
  const { household, members, addMember, currentMember, settings, saveSettings } = useHousehold();
  const { signOut, setPassword } = useAuth();
  const { palette, mode, resolvedMode, setPalette, setMode } = useTheme();
  const { isOn, setEnabled } = useSections();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pw, setPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { ok: boolean, text: string }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function add() {
    if (!newName.trim() || busy) return;
    setBusy(true);
    try {
      await addMember(newName);
      setNewName('');
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(household?.join_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function savePassword() {
    if (pw.length < 6 || pwBusy) return;
    setPwBusy(true);
    setPwMsg(null);
    try {
      await setPassword(pw);
      setPw('');
      setPwMsg({ ok: true, text: 'Password saved — from now on you can sign in with it directly, no email needed.' });
    } catch (err) {
      setPwMsg({ ok: false, text: err?.message || 'Something went wrong. Try again.' });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: shadows.backdrop,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Household and account"
        style={{
          width: 460,
          maxWidth: '100%',
          background: colors.card,
          borderRadius: 22,
          padding: '28px 30px',
          boxShadow: shadows.modal,
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ font: `400 25px ${fonts.serif}`, color: colors.ink }}>
            {household?.name || 'Your household'}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: '50%', background: colors.chipBg, color: colors.muted2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}
          >
            ×
          </button>
        </div>
        <div style={{ font: `400 13px ${fonts.sans}`, color: colors.muted, marginBottom: 22 }}>
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </div>

        {/* What this household actually uses. Home and Chores aren't listed —
            they're the app, not features of it. */}
        <Label>What Tend looks after</Label>
        <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: -4, marginBottom: 10 }}>
          Switch off anything you don't want. It leaves the menu, and Tend stops loading it.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          {OPTIONAL_SECTIONS.map(([key, label, icon]) => {
            const on = isOn(key);
            return (
              <button
                key={key}
                onClick={() => setEnabled(key, !on)}
                aria-pressed={on}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '11px 13px',
                  borderRadius: 14,
                  textAlign: 'left',
                  background: on ? colors.chipBg : colors.inputBg,
                  border: `1px solid ${on ? colors.selected : colors.cardBorder}`,
                  opacity: on ? 1 : 0.55,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1.2 }}>
                  {icon}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', font: `600 12.5px ${fonts.sans}`, color: colors.ink }}>
                    {label}
                  </span>
                  <span style={{ display: 'block', font: `400 10.5px/1.4 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                    {SECTION_BLURBS[key]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Weather */}
        <Label>Weather</Label>
        <WeatherSetting settings={settings} saveSettings={saveSettings} />

        {/* Appearance */}
        <Label>Colours</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {PALETTES.map((p) => {
            const active = palette === p.key;
            const swatch = p.swatch[resolvedMode];
            return (
              <button
                key={p.key}
                onClick={() => setPalette(p.key)}
                aria-pressed={active}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '11px 13px',
                  borderRadius: 14,
                  textAlign: 'left',
                  background: active ? colors.chipBg : colors.inputBg,
                  border: `1px solid ${active ? colors.selected : colors.cardBorder}`,
                }}
              >
                {/* Real hexes, so you see the palette rather than a name for it. */}
                <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>
                  {swatch.map((c, i) => (
                    <span
                      key={c}
                      style={{
                        width: 15,
                        height: 24,
                        background: c,
                        borderRadius: i === 0 ? '7px 0 0 7px' : i === swatch.length - 1 ? '0 7px 7px 0' : 0,
                        border: `1px solid ${colors.cardBorder}`,
                        borderLeftWidth: i === 0 ? 1 : 0,
                      }}
                    />
                  ))}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', font: `600 12.5px ${fonts.sans}`, color: colors.ink }}>
                    {p.label}
                  </span>
                  <span style={{ display: 'block', font: `400 10.5px ${fonts.sans}`, color: colors.muted }}>
                    {p.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {MODES.map(([key, label]) => {
            const active = mode === key;
            return (
              <button
                key={key}
                onClick={() => setMode(key)}
                aria-pressed={active}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 20,
                  background: active ? colors.accent : colors.inputBg,
                  border: `1px solid ${active ? colors.accent : colors.cardBorder}`,
                  color: active ? colors.onAccent : colors.muted2,
                  font: `${active ? 600 : 500} 12.5px ${fonts.sans}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Kitchen display */}
        <Label>Kitchen display</Label>
        <a
          href="#/hub"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 11,
            padding: '12px 14px',
            borderRadius: 12,
            marginBottom: 24,
            textDecoration: 'none',
            background: colors.inputBg,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1.2 }}>📺</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>
              Open the wall display
            </span>
            <span style={{ display: 'block', font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
              Full-screen and readable across a room, for a mounted tablet or TV. Setup instructions live on the
              Calendar page.
            </span>
          </span>
        </a>

        {/* Daily digest */}
        <Label>Daily digest</Label>
        <button
          onClick={() => saveSettings({ dailyDigest: !settings.dailyDigest })}
          aria-pressed={Boolean(settings.dailyDigest)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 11,
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            marginBottom: 24,
            textAlign: 'left',
            background: settings.dailyDigest ? colors.chipBg : colors.inputBg,
            border: `1px solid ${settings.dailyDigest ? colors.selected : colors.cardBorder}`,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1.2 }}>{settings.dailyDigest ? '📬' : '📭'}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>
              Email us what's slipping
            </span>
            <span style={{ display: 'block', font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
              One message a day to everyone with a login, and only on days something is actually late. Needs the
              digest function switched on for the project first — see supabase/functions/daily-digest. Nothing is
              sent until then.
            </span>
          </span>
        </button>

        {/* Invite code */}
        <Label>Invite the family</Label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: colors.inputBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 24,
          }}
        >
          <div style={{ font: `700 20px ${fonts.mono}`, color: colors.ink, letterSpacing: '.18em' }}>
            {household?.join_code}
          </div>
          <button
            onClick={copyCode}
            style={{ padding: '8px 14px', borderRadius: 18, background: colors.accent, color: colors.onAccent, font: `600 12.5px ${fonts.sans}`, cursor: 'pointer' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Members */}
        <Label>People in this household</Label>
        <div style={{ marginBottom: 18 }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <Avatar who={m.name} size={34} />
              <div style={{ flex: 1, font: `600 14px ${fonts.sans}`, color: colors.ink }}>{m.name}</div>
              {m.user_id ? (
                <span style={{ font: `600 11px ${fonts.sans}`, color: colors.muted2, background: colors.chipBg, padding: '4px 10px', borderRadius: 20 }}>
                  {m.id === currentMember?.id ? 'You' : 'Has login'}
                </span>
              ) : (
                <span style={{ font: `500 11px ${fonts.sans}`, color: colors.faint }}>No login</span>
              )}
            </div>
          ))}
        </div>

        {/* Add person */}
        <Label>Add a person</Label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 26 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. Theo"
            style={{
              flex: 1,
              border: `1px solid ${colors.inputBorder}`,
              background: colors.inputBg,
              borderRadius: 12,
              padding: '11px 14px',
              font: `500 14px ${fonts.sans}`,
              color: colors.ink,
              outline: 'none',
            }}
          />
          <button
            onClick={add}
            disabled={busy || !newName.trim()}
            style={{
              padding: '11px 18px',
              borderRadius: 12,
              background: colors.accent,
              color: colors.onAccent,
              font: `600 13px ${fonts.sans}`,
              opacity: busy || !newName.trim() ? 0.6 : 1,
              cursor: busy || !newName.trim() ? 'default' : 'pointer',
            }}
          >
            Add
          </button>
        </div>
        <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: -16, marginBottom: 22 }}>
          People you add can be assigned chores. To give someone their own login, share the invite code above.
        </div>

        {/* Password — so signing in on a new device doesn't need an email link */}
        <div style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 20, marginBottom: 24 }}>
          <Label>Your sign-in</Label>
          <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 10 }}>
            Set a password (6+ characters) to skip the email link when signing in on a new device.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && savePassword()}
              placeholder="New password"
              style={{
                flex: 1,
                border: `1px solid ${colors.inputBorder}`,
                background: colors.inputBg,
                borderRadius: 12,
                padding: '11px 14px',
                font: `500 14px ${fonts.sans}`,
                color: colors.ink,
                outline: 'none',
              }}
            />
            <button
              onClick={savePassword}
              disabled={pwBusy || pw.length < 6}
              style={{
                padding: '11px 18px',
                borderRadius: 12,
                background: colors.accent,
                color: colors.onAccent,
                font: `600 13px ${fonts.sans}`,
                opacity: pwBusy || pw.length < 6 ? 0.6 : 1,
                cursor: pwBusy || pw.length < 6 ? 'default' : 'pointer',
              }}
            >
              {pwBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
          {pwMsg && (
            <div style={{ font: `500 12px/1.5 ${fonts.sans}`, color: pwMsg.ok ? tone.green : colors.accentDark, marginTop: 8 }}>
              {pwMsg.text}
            </div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={signOut} style={{ font: `600 13px ${fonts.sans}`, color: colors.accentDark, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, marginBottom: 8 }}>{children}</div>;
}

// Set once, then forgotten. The place is geocoded here and stored as lat/long,
// so the forecast call never has to resolve a name — and picking from a list
// beats a text box, because there are thirty Springfields.
function WeatherSetting({ settings, saveSettings }) {
  const place = settings.weather ?? null;
  const unit = settings.weatherUnit ?? 'f';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function search() {
    if (!query.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      const found = await geocode(query);
      setResults(found);
      if (found.length === 0) setErr('Nothing found by that name. Try a postcode.');
    } catch (e) {
      setErr(e.message || 'Could not look that up.');
    } finally {
      setBusy(false);
    }
  }

  function choose(r) {
    saveSettings({ weather: { lat: r.lat, lon: r.lon, label: r.label } });
    setResults(null);
    setQuery('');
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {place ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', background: colors.inputBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: '11px 14px' }}>
          <span style={{ font: `600 13px ${fonts.sans}`, color: colors.ink, minWidth: 0 }}>📍 {place.label}</span>
          <button onClick={() => saveSettings({ weather: null })} style={{ font: `500 12px ${fonts.sans}`, color: colors.muted2, flexShrink: 0 }}>
            Change
          </button>
        </div>
      ) : (
        <>
          <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 8 }}>
            Where you live, so the calendar can show the week ahead and Tend can tell you when the one dry day is.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Town or postcode"
              style={{ flex: 1, border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, borderRadius: 12, padding: '11px 14px', font: `500 14px ${fonts.sans}`, color: colors.ink, outline: 'none' }}
            />
            <button
              onClick={search}
              disabled={busy || !query.trim()}
              style={{ padding: '11px 18px', borderRadius: 12, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, opacity: busy || !query.trim() ? 0.6 : 1 }}
            >
              {busy ? 'Looking…' : 'Find'}
            </button>
          </div>
        </>
      )}

      {err && <div style={{ font: `500 12px ${fonts.sans}`, color: colors.accentDark, marginTop: 8 }}>{err}</div>}

      {results?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => choose(r)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 13px', borderRadius: 10, background: colors.inputBg, border: `1px solid ${colors.cardBorder}`, marginBottom: 6, font: `500 13px ${fonts.sans}`, color: colors.ink }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {place && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[['f', 'Fahrenheit'], ['c', 'Celsius']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => saveSettings({ weatherUnit: key })}
              aria-pressed={unit === key}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 20,
                background: unit === key ? colors.accent : colors.inputBg,
                border: `1px solid ${unit === key ? colors.accent : colors.cardBorder}`,
                color: unit === key ? colors.onAccent : colors.muted2,
                font: `${unit === key ? 600 : 500} 12.5px ${fonts.sans}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
