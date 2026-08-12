import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, PrimaryButton, GhostButton } from './Modal';

// Getting a tablet on a wall is mostly OS settings, not app settings — so this
// says what to do on each device rather than pretending the app can do it.
const GUIDES = [
  {
    key: 'ipad',
    label: 'iPad',
    steps: [
      'Open Tend in Safari and sign in — it stays signed in, so you only do this once.',
      'Share → Add to Home Screen. Launching from there drops the browser chrome.',
      'Settings → Display & Brightness → Auto-Lock → Never.',
      'Settings → Accessibility → Guided Access, then triple-click to lock it to Tend so nobody wanders off.',
      'Come back here and tap Start the display.',
    ],
  },
  {
    key: 'android',
    label: 'Android tablet',
    steps: [
      'Open Tend in Chrome and sign in.',
      'Menu → Add to Home screen, then launch it from there.',
      'Settings → Display → Screen timeout → longest available, or turn on a screensaver set to "while charging".',
      'Optional: a kiosk launcher app will pin it to Tend permanently.',
      'Come back here and tap Start the display.',
    ],
  },
  {
    key: 'tv',
    label: 'Mounted TV',
    steps: [
      'Easiest path is a cheap stick PC or Raspberry Pi running a browser in kiosk mode.',
      'Point it at this app, sign in once, then navigate to the display.',
      'Chrome kiosk flag: --kiosk --app=<your Tend URL>/#/hub',
      'Turn off the TV\'s own screensaver and power-saving timeout.',
      'Landscape suits the layout best, but it reflows either way.',
    ],
  },
];

export function DisplaySetupModal({ onClose, onStart }) {
  const [guide, setGuide] = useState('ipad');
  const active = GUIDES.find((g) => g.key === guide);

  return (
    <ModalShell
      title="Kitchen display"
      onClose={onClose}
      footer={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <GhostButton onClick={onClose}>Not now</GhostButton>
          <PrimaryButton onClick={onStart}>Start the display</PrimaryButton>
        </div>
      }
    >
      <div style={{ font: `400 13.5px/1.7 ${fonts.sans}`, color: colors.muted2, marginBottom: 20 }}>
        A full-screen view built to be read from across the room: the time, what's on today, tonight's dinner,
        whether the animals have been fed, and the next few days. It updates itself — nobody needs to touch it.
      </div>

      <Label>Setting up a device</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {GUIDES.map((g) => {
          const on = guide === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setGuide(g.key)}
              aria-pressed={on}
              style={{
                padding: '8px 14px',
                borderRadius: 20,
                background: on ? colors.accent : colors.inputBg,
                border: `1px solid ${on ? colors.accent : colors.cardBorder}`,
                color: on ? colors.onAccent : colors.muted2,
                font: `${on ? 600 : 500} 12.5px ${fonts.sans}`,
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      <ol style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', counterReset: 'step' }}>
        {active.steps.map((step, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '9px 0',
              borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: colors.chipBg,
                color: colors.muted3,
                font: `600 11px ${fonts.sans}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {i + 1}
            </span>
            <span style={{ font: `400 13px/1.6 ${fonts.sans}`, color: colors.muted3 }}>{step}</span>
          </li>
        ))}
      </ol>

      <div
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: colors.inputBg,
          border: `1px solid ${colors.cardBorder}`,
          font: `400 12px/1.6 ${fonts.sans}`,
          color: colors.muted,
        }}
      >
        The display lives at <code style={{ font: `600 12px ${fonts.mono}`, color: colors.muted3 }}>#/hub</code> — bookmark
        it and the tablet can boot straight into it. Tend asks the device to stay awake while it's open, though most
        tablets only honour that if the screen-timeout setting allows it, hence step three.
      </div>
    </ModalShell>
  );
}
