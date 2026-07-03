import { useEffect } from 'react';
import { colors, fonts } from '../theme';

// Shared dialog chrome for the add/edit modals: dimmed backdrop, cream card,
// title row with a close button, Escape-to-close. Children are the form body;
// the footer renders the caller's action buttons right-aligned.
export function ModalShell({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: 'rgba(58,46,37,.4)',
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
        aria-label={title}
        style={{
          width: 460,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: colors.card,
          borderRadius: 22,
          padding: '28px 30px',
          boxShadow: '0 24px 60px rgba(40,25,15,.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ font: `400 25px ${fonts.serif}`, color: colors.ink }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: '50%', background: colors.chipBg, color: colors.muted2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}
          >
            ×
          </button>
        </div>

        {children}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 26 }}>{footer}</div>
      </div>
    </div>
  );
}

export function Label({ children }) {
  return <div style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, marginBottom: 8 }}>{children}</div>;
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={
        active
          ? { padding: '9px 15px', borderRadius: 12, background: colors.accent, color: '#fff', font: `600 12.5px ${fonts.sans}` }
          : { padding: '9px 15px', borderRadius: 12, background: colors.inputBg, border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `500 12.5px ${fonts.sans}` }
      }
    >
      {children}
    </button>
  );
}

export const inputStyle = {
  width: '100%',
  border: '1px solid #e5d6c3',
  background: colors.inputBg,
  borderRadius: 12,
  padding: '12px 14px',
  font: `500 14px ${fonts.sans}`,
  color: colors.ink,
  outline: 'none',
  marginBottom: 20,
  boxSizing: 'border-box',
};

export function PrimaryButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '11px 22px', borderRadius: 22, background: colors.accent, color: '#fff', font: `600 13px ${fonts.sans}`, boxShadow: '0 2px 8px rgba(194,114,74,.3)' }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: '11px 20px', borderRadius: 22, font: `600 13px ${fonts.sans}`, color: colors.muted2 }}>
      {children}
    </button>
  );
}

// Quiet destructive action pinned to the left edge of the footer.
export function DeleteButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '11px 4px', borderRadius: 22, font: `600 13px ${fonts.sans}`, color: '#c0654b', marginRight: 'auto' }}
    >
      {children}
    </button>
  );
}
