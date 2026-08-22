// Everything that only exists when Tend is running as the iOS app.
//
// The web app is still the whole app — the native shell adds three things a
// browser can't do: put a widget on the home screen, receive a push when
// something is due, and open on the right page when you tap one.
//
// Every export here is safe to call on the web, where it no-ops. That's the
// rule that keeps `isNative` checks out of the views: a component asks for what
// it wants and nothing happens in a browser.

import { Capacitor, registerPlugin } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = isNative && Capacitor.getPlatform() === 'ios';

// Set before first paint so the stylesheet can inset the header past the status
// bar. See `html.tend-native` in index.css — this has to be a class rather than
// a media query because a Safari home-screen install must *not* get the inset.
if (isNative) document.documentElement.classList.add('tend-native');

// Our own tiny Swift plugin — see ios/App/App/TendBridgePlugin.swift. On the
// web `registerPlugin` returns a proxy whose calls reject, which is why every
// call below is wrapped.
const TendBridge = registerPlugin('TendBridge');

const quiet = async (fn, fallback = null) => {
  if (!isNative) return fallback;
  try {
    return await fn();
  } catch {
    // A native call failing should never take the page down with it. The
    // widget not updating is a smaller problem than a white screen.
    return fallback;
  }
};

// ---------------------------------------------------------------------------
// The widget
// ---------------------------------------------------------------------------

// Hand the extension the three values it needs to fetch its own payload. The
// URL and publishable key are the same ones the browser uses; the token is the
// one that matters, and it lives in the App Group rather than in the binary.
export const configureWidget = ({ token, memberName }) =>
  quiet(
    () =>
      TendBridge.configureWidget({
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        token,
        memberName: memberName ?? '',
      }),
    { configured: false },
  );

// Revoking the token this phone was using, or signing out.
export const clearWidget = () => quiet(() => TendBridge.clearWidget(), { configured: false });

// "Is this phone's widget connected, and to which token?" Returns only the last
// six characters, which is enough to match it against the list in the app.
export const widgetStatus = () =>
  quiet(() => TendBridge.widgetStatus(), { configured: false, tokenTail: '', memberName: '' });

// After paying a bill, so the home screen isn't a minute behind the app.
export const reloadWidgets = () => quiet(() => TendBridge.reloadWidgets());

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

// Registration is deliberately *not* automatic. iOS gives an app exactly one
// chance to ask for notification permission, and an app that spends it during
// the first two seconds of the first launch — before you've seen what it does —
// gets denied. So this runs when someone turns notifications on in settings.
export async function enablePush({ onToken, onError } = {}) {
  if (!isNative) return { granted: false, reason: 'not-native' };

  const { PushNotifications } = await import('@capacitor/push-notifications');

  let status = await PushNotifications.checkPermissions();
  if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive !== 'granted') {
    return { granted: false, reason: status.receive };
  }

  // The APNs device token arrives asynchronously on a listener rather than
  // from the register() promise, which only means "the request was made".
  await PushNotifications.addListener('registration', (t) => onToken?.(t.value));
  await PushNotifications.addListener('registrationError', (e) => onError?.(e));
  await PushNotifications.register();

  return { granted: true };
}

export async function pushPermission() {
  if (!isNative) return 'unsupported';
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const { receive } = await PushNotifications.checkPermissions();
  return receive;
}

// ---------------------------------------------------------------------------
// Deep links and lifecycle
// ---------------------------------------------------------------------------

// Tapping a widget or a notification should land on the right page. Both send
// a `tend://<route>` URL, which maps straight onto the app's hash routes.
export async function startNativeRouting(navigate) {
  if (!isNative) return () => {};

  const { App } = await import('@capacitor/app');

  const go = (url) => {
    const route = String(url ?? '').replace(/^tend:\/\//, '').replace(/^\/+/, '');
    if (route) navigate(route);
  };

  const openListener = await App.addListener('appUrlOpen', (e) => go(e.url));

  // Cold start: the app was launched *by* the link, so there's no event to
  // catch — the URL is sitting in the launch state instead.
  const launch = await App.getLaunchUrl();
  if (launch?.url) go(launch.url);

  // Coming back from the background is the moment a widget's data is most
  // likely to be stale relative to what the app can see.
  const stateListener = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) reloadWidgets();
  });

  return () => {
    openListener.remove();
    stateListener.remove();
  };
}
