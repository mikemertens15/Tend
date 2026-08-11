import { useState } from 'react';
import { colors, shadows, fonts } from '../theme';
import { useHousehold } from './HouseholdProvider';
import { useAuth } from '../auth/AuthProvider';
import { Shell } from '../auth/SignIn';

// Shown after sign-in when the user isn't in a household yet: start a new one,
// or join an existing household with its invite code.
export function Onboarding() {
  const { createHousehold, joinHousehold } = useHousehold();
  const { signOut } = useAuth();
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [yourName, setYourName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e?.preventDefault();
    if (busy) return;
    if (!yourName.trim()) {
      setError('Add your name so chores can be assigned to you.');
      return;
    }
    if (mode === 'create' && !householdName.trim()) {
      setError('Give your household a name.');
      return;
    }
    if (mode === 'join' && !code.trim()) {
      setError('Enter the invite code you were given.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // On success the provider reloads, the app swaps to the dashboard, and
      // this screen unmounts — so we only reset `busy` on failure.
      if (mode === 'create') await createHousehold(householdName, yourName);
      else await joinHousehold(code, yourName);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div style={{ font: `400 27px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>
        Set up your household
      </div>
      <div style={{ font: `400 14px/1.5 ${fonts.sans}`, color: colors.muted2, marginBottom: 20 }}>
        A household is the shared space your family syncs to.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <Tab active={mode === 'create'} onClick={() => { setMode('create'); setError(''); }}>
          Create one
        </Tab>
        <Tab active={mode === 'join'} onClick={() => { setMode('join'); setError(''); }}>
          Join with a code
        </Tab>
      </div>

      <form onSubmit={submit}>
        <Field label="Your name">
          <Input value={yourName} onChange={setYourName} placeholder="e.g. Lena" autoFocus />
        </Field>

        {mode === 'create' ? (
          <Field label="Household name">
            <Input value={householdName} onChange={setHouseholdName} placeholder="e.g. The Rivera Household" />
          </Field>
        ) : (
          <Field label="Invite code">
            <Input
              value={code}
              onChange={(v) => setCode(v.toUpperCase())}
              placeholder="6-character code"
              style={{ letterSpacing: '.18em', fontFamily: fonts.mono, textTransform: 'uppercase' }}
            />
          </Field>
        )}

        {error && (
          <div style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accentDark, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 22,
            background: colors.accent,
            color: colors.onAccent,
            font: `600 14px ${fonts.sans}`,
            boxShadow: shadows.accent,
            opacity: busy ? 0.6 : 1,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Setting up…' : mode === 'create' ? 'Create household' : 'Join household'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <button onClick={signOut} style={{ font: `500 12.5px ${fonts.sans}`, color: colors.muted }}>
          Sign out
        </button>
      </div>
    </Shell>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '9px 12px',
        borderRadius: 12,
        font: `600 13px ${fonts.sans}`,
        background: active ? colors.accent : colors.inputBg,
        color: active ? colors.onAccent : colors.muted2,
        border: `1px solid ${active ? 'transparent' : colors.cardBorder}`,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, display: 'block', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, autoFocus, style }) {
  return (
    <input
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        border: `1px solid ${colors.inputBorder}`,
        background: colors.inputBg,
        borderRadius: 12,
        padding: '12px 14px',
        font: `500 14px ${fonts.sans}`,
        color: colors.ink,
        outline: 'none',
        ...style,
      }}
    />
  );
}
