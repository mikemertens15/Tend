# The iOS app

Tend runs on the phone as a real app: a Capacitor shell around the same web
build, plus two things a browser can't do — **home-screen widgets** and **push
notifications**.

The web app is still the whole app. Nothing was forked, and nothing renders
twice. What's native is the shell, the two WidgetKit widgets, and the plumbing
between them.

## The shape of it

```
Vite build (dist/)
      │  npx cap copy
      ▼
ios/App/App/public/          the bundled web app, loaded by WKWebView
ios/App/App/                 AppDelegate, the Capacitor bridge, TendBridgePlugin
ios/App/Shared/              compiled into BOTH targets — models, API, theme
ios/App/TendWidget/          the WidgetKit extension
```

`Shared/` is the important bit. The app and the widget are separate processes
with separate sandboxes; the only things they have in common are the code in
`Shared/` and one App Group container.

## Everyday workflow

```bash
npm run ios:sync
```

That builds the web app, copies it into the native project, and re-applies the
widget target. Then open Xcode and run:

```bash
npm run ios:open
```

**`npm run ios:sync` after every web change.** The assets are bundled, not
loaded from a URL, so a change that isn't synced isn't in the app.

### Why the widget target is a script

`ios/add-widget-target.rb` adds the `TendWidget` extension, wires the shared
sources into both targets, sets the entitlements and embeds the extension in the
app. It's idempotent, and `ios:sync` runs it for you.

This is a script rather than something done once in Xcode because Capacitor
*generates* the Xcode project. Anything added by hand is one `cap sync` away
from being silently dropped. Keeping it as code is what makes a fresh clone
reproducible:

```bash
npm install && npm run build && npx cap add ios && npm run ios:widget
```

## The widgets

Two, both reading the same `widget_agenda` RPC:

| | Families | Window |
|---|---|---|
| **Bills** | small, medium, large, lock-screen rectangular + inline | 30–45 days of bills |
| **Agenda** | small, medium, large, lock-screen rectangular | 1–5 days |

`#/widget/<token>` in the browser renders the same payload in roughly the
proportions of a large widget. It exists so the native rendering has something
to be compared against — if the two disagree, one of them is wrong.

### How a widget gets its token

The extension can't read the webview's `localStorage`, so the token goes through
the App Group:

```
Calendar → 📱 Widget → Use on this phone
      │
      ▼
TendBridge.configureWidget({ url, anonKey, token })   src/data/native.js
      │
      ▼
UserDefaults(suiteName: "group.com.mikemertens.tend")  ios/App/App/TendBridgePlugin.swift
      │
      ▼
Tend.credentials()  →  TendAPI.agenda()                ios/App/Shared/TendShared.swift
```

The Supabase URL and publishable key go into the container alongside the token
rather than being compiled in. Not because they're secret — they're safe in a
binary for the same reason they're safe in a browser — but because a widget with
no token should say "Open Tend" rather than ship a stale one baked in at build
time.

**A widget that says "Open Tend" has no token.** A widget that says "Reconnect"
had one and it was revoked.

### Refresh policy

iOS budgets a widget roughly 40–70 background refreshes a day. A fixed
15-minute poll asks for 96 and gets throttled, which is how widgets end up stuck
on this morning. So `Provider.swift` builds its timeline from the *content*: the
next entry is whenever the next event starts or ends, or midnight, clamped to
between 15 minutes and 2 hours away.

## Push notifications

Native APNs, not Web Push. Web Push works only in a Safari home-screen install
and is unavailable inside a Capacitor webview, so the app would have been the
one place notifications didn't arrive.

```
Settings → Notifications → Turn on          src/data/usePush.js
      │
      ▼  APNs device token
public.push_subscriptions (platform = 'ios', device_token)
      │
      ▼  daily, via pg_cron
supabase/functions/push-reminders           signs an ES256 JWT with the .p8
      │
      ▼
api.push.apple.com
```

Permission is requested **when the switch is tapped**, never on launch. iOS
gives an app exactly one chance, and one spent in the first two seconds of the
first run gets denied.

### Still to do (needs your Apple account)

Everything above is written and builds. Two things need you, because they need
the Developer portal:

1. **Register the App Group and the App IDs.** In Xcode, select the `App`
   target → Signing & Capabilities → pick your team. Do the same for
   `TendWidget`. Xcode will register `com.mikemertens.tend`,
   `com.mikemertens.tend.TendWidget` and `group.com.mikemertens.tend` for you.
2. **Create an APNs Auth Key** and set the secrets. The full recipe is in the
   comment at the bottom of `supabase/functions/push-reminders/index.ts`.

Until (2) is done the function is dormant: it returns `{skipped: …}` and sends
nothing. Deploying it alone sends no notifications.

`APNS_ENVIRONMENT` is the one that catches people out. Builds run from Xcode
produce **development** tokens; TestFlight and the App Store produce
**production** ones, and a token from one environment is unknown to the other.
A push that worked in Xcode and goes quiet on TestFlight is almost always this.

## Testing the widget without signing in

The App Group is a plain plist on disk. To point a simulator's widget at a real
token, write it while the simulator is **shut down** — `cfprefsd` owns the file
while the device is booted and will overwrite it:

```bash
xcrun simctl shutdown <udid>
GC=$(xcrun simctl get_app_container <udid> com.mikemertens.tend group.com.mikemertens.tend)
/usr/libexec/PlistBuddy \
  -c "Add :tend\.supabaseURL string https://<ref>.supabase.co" \
  -c "Add :tend\.supabaseAnonKey string <publishable key>" \
  -c "Add :tend\.widgetToken string <token>" \
  "$GC/Library/Preferences/group.com.mikemertens.tend.plist"
xcrun simctl boot <udid>
```

A timeline already cached before the plist existed will keep showing "Open
Tend"; reinstalling the app forces a fresh one.

## App Store notes

The app bundles its assets rather than pointing a webview at the deployed URL.
That means **a web change ships through App Store review**, which is the cost of
working offline and of not being the shape of app that guideline 4.2 ("minimum
functionality") rejects. The widgets and native notifications are what make it
more than a wrapper; keep them working.

`aps-environment` in `ios/App/App/App.entitlements` is `development`. Xcode
rewrites it for distribution builds, so it doesn't need changing by hand.
