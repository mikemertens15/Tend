import { useState } from 'react';
import { colors, shadows, fonts } from '../theme';
import { useAuth } from './AuthProvider';
import { Shell } from './SignIn';

// Shown when the user arrives from a "reset your password" email. The link has
// already signed them in, so all that's left is choosing a new password.
export function ResetPassword() {
  const { setPassword, endRecovery, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const tooShort = pw.length > 0 && pw.length < 6;
  const mismatch = confirm.length > 0 && pw !== confirm;
  const canSubmit = pw.length >= 6 && pw === confirm && !busy;

  async function submit(e) {
    e?.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await setPassword(pw);
      endRecovery(); // falls through to the app — they're already signed in
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors.accent }} />
        <div style={{ font: `400 25px ${fonts.serif}`, color: colors.ink, lineHeight: 1 }}>Tend</div>
      </div>

      <form onSubmit={submit}>
        <div style={{ font: `400 27px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>
          Choose a new password
        </div>
        <div style={{ font: `400 14px/1.5 ${fonts.sans}`, color: colors.muted2, marginBottom: 22 }}>
          At least 6 characters. You'll use this to sign in from now on.
        </div>

        <Label>New password</Label>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          style={inputStyle(tooShort ? 8 : 18)}
        />
        {tooShort && <Hint>A little longer — 6 characters minimum.</Hint>}

        <Label>Confirm password</Label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          style={inputStyle(mismatch || error ? 8 : 18)}
        />
        {mismatch && <Hint>Those two don't match yet.</Hint>}
        {error && <Hint>{error}</Hint>}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 22,
            background: colors.accent,
            color: colors.onAccent,
            font: `600 14px ${fonts.sans}`,
            boxShadow: shadows.accent,
            opacity: canSubmit ? 1 : 0.6,
            cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          {busy ? 'Saving…' : 'Save password'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            type="button"
            onClick={signOut}
            style={{ font: `600 13px ${fonts.sans}`, color: colors.muted, cursor: 'pointer' }}
          >
            Cancel and sign out
          </button>
        </div>
      </form>
    </Shell>
  );
}

function Label({ children }) {
  return (
    <label style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, display: 'block', marginBottom: 8 }}>
      {children}
    </label>
  );
}

function Hint({ children }) {
  return (
    <div style={{ font: `500 12.5px/1.45 ${fonts.sans}`, color: colors.accentDark, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function inputStyle(marginBottom) {
  return {
    width: '100%',
    border: `1px solid ${colors.inputBorder}`,
    background: colors.inputBg,
    borderRadius: 12,
    padding: '12px 14px',
    font: `500 14px ${fonts.sans}`,
    color: colors.ink,
    outline: 'none',
    marginBottom,
  };
}
