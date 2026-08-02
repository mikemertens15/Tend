import { useState } from 'react';
import { colors, fonts } from '../theme';
import { useAuth } from './AuthProvider';

// Sign-in screen. Email + password is the everyday path (no email round-trip);
// the emailed magic link remains for first-time setup and as the fallback for
// anyone who hasn't set a password yet, and a reset link covers a forgotten one.
export function SignIn() {
  const { signInWithMagicLink, signInWithPassword, sendPasswordReset, linkError, clearLinkError } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(null); // null | 'link' | 'reset'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim() && password && !busy;
  // An expired or already-used email link reports itself in the URL; show that
  // once, then let normal form errors take over.
  const notice = error || linkError;

  async function submit(e) {
    e?.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    clearLinkError();
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      setError(
        /invalid/i.test(err?.message || '')
          ? "That didn't match. Reset it below, or use an email link if you never set one."
          : err?.message || 'Something went wrong. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  // Both email paths behave identically apart from which mail goes out.
  async function mail(kind) {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError('');
    clearLinkError();
    try {
      await (kind === 'reset' ? sendPasswordReset(email) : signInWithMagicLink(email));
      setSent(kind);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <Brand />
      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: `400 26px ${fonts.serif}`, color: colors.ink, marginBottom: 10 }}>
            Check your inbox
          </div>
          <div style={{ font: `400 14px/1.5 ${fonts.sans}`, color: colors.muted2, marginBottom: 22 }}>
            We sent {sent === 'reset' ? 'a link to reset your password' : 'a sign-in link'} to{' '}
            <b style={{ color: colors.ink }}>{email}</b>. Open it on this device to continue.
          </div>
          <button
            onClick={() => setSent(null)}
            style={{ font: `600 13px ${fonts.sans}`, color: colors.accent }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div style={{ font: `400 27px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>
            Welcome home
          </div>
          <div style={{ font: `400 14px/1.5 ${fonts.sans}`, color: colors.muted2, marginBottom: 22 }}>
            Sign in to keep your household in sync.
          </div>

          <label style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, display: 'block', marginBottom: 8 }}>
            Email
          </label>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle(18)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <label style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2 }}>Password</label>
            <button
              type="button"
              onClick={() => mail('reset')}
              disabled={busy || !email.trim()}
              title={email.trim() ? 'Email a reset link' : 'Enter your email first'}
              style={{
                font: `600 12px ${fonts.sans}`,
                color: colors.accent,
                opacity: busy || !email.trim() ? 0.5 : 1,
                cursor: busy || !email.trim() ? 'default' : 'pointer',
              }}
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle(notice ? 8 : 18)}
          />
          {notice && (
            <div style={{ font: `500 12.5px/1.45 ${fonts.sans}`, color: colors.accentDark, marginBottom: 16 }}>
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 22,
              background: colors.accent,
              color: '#fff',
              font: `600 14px ${fonts.sans}`,
              boxShadow: '0 2px 8px rgba(194,114,74,.3)',
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? 'pointer' : 'default',
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted, marginBottom: 6 }}>
              First time here, or no password yet?
            </div>
            <button
              type="button"
              onClick={() => mail('link')}
              disabled={busy || !email.trim()}
              style={{
                font: `600 13px ${fonts.sans}`,
                color: colors.accent,
                opacity: busy || !email.trim() ? 0.6 : 1,
                cursor: busy || !email.trim() ? 'default' : 'pointer',
              }}
            >
              Email me a sign-in link
            </button>
          </div>
        </form>
      )}
    </Shell>
  );
}

function inputStyle(marginBottom) {
  return {
    width: '100%',
    border: '1px solid #e5d6c3',
    background: colors.inputBg,
    borderRadius: 12,
    padding: '12px 14px',
    font: `500 14px ${fonts.sans}`,
    color: colors.ink,
    outline: 'none',
    marginBottom,
  };
}

// Centered card on the warm background — shared by SignIn and Onboarding.
export function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: '100%',
          background: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 22,
          padding: '34px 34px 36px',
          boxShadow: '0 24px 60px rgba(40,25,15,.12)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors.accent }} />
      <div style={{ font: `400 25px ${fonts.serif}`, color: colors.ink, lineHeight: 1 }}>Tend</div>
    </div>
  );
}
