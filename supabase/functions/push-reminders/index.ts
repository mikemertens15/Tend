// A push when a bill is about to leave the account, or already should have.
//
// DORMANT BY DEFAULT, exactly like daily-digest. Nothing here sends until:
//   1. the four APNS_* secrets are set on the project, and
//   2. a pg_cron schedule exists (SQL at the bottom of this file), and
//   3. a household has `billReminders` turned on in its settings.
// Deploying the function alone sends nothing. Nobody should discover their
// house started buzzing their phone because a deploy went out.
//
// The rules mirror data/bills.js and public.widget_agenda: a bill is settled if
// it has a payment row *or* it's on autopay and its date has passed. Getting
// that wrong here means a notification about a bill the bank already paid,
// which is the fastest way to teach someone to swipe these away unread.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Apple's two hosts. Which one a token belongs to depends on whether the app
// was built with the development or production `aps-environment`; a token from
// one is unknown to the other, which is the single most common reason a push
// silently fails to arrive during testing.
const APNS_HOST_PROD = 'https://api.push.apple.com';
const APNS_HOST_DEV = 'https://api.sandbox.push.apple.com';

type Sub = { id: string; device_token: string; user_id: string; member_id: string | null };

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${serviceKey}`) {
    return new Response('forbidden', { status: 403 });
  }

  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const privateKey = Deno.env.get('APNS_PRIVATE_KEY');
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.mikemertens.tend';
  const host = Deno.env.get('APNS_ENVIRONMENT') === 'production' ? APNS_HOST_PROD : APNS_HOST_DEV;

  if (!keyId || !teamId || !privateKey) {
    return Response.json(
      { skipped: 'APNS_KEY_ID, APNS_TEAM_ID and APNS_PRIVATE_KEY are not all set — nothing sent' },
      { status: 200 },
    );
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const token = await apnsToken({ keyId, teamId, privateKey });
  const today = new Date().toISOString().slice(0, 10);
  const sent: unknown[] = [];

  const { data: households } = await db.from('households').select('id, name, settings');

  for (const house of households ?? []) {
    if (!house.settings?.billReminders) continue;

    // How many days ahead counts as "coming up". Three is the default because
    // it survives a weekend — a bill due Monday should reach you on Friday.
    const lead: number = Number(house.settings?.billReminderDays ?? 3);

    const { data: members } = await db
      .from('household_members')
      .select('id, name')
      .eq('household_id', house.id);

    const { data: subs } = await db
      .from('push_subscriptions')
      .select('id, device_token, user_id, member_id')
      .eq('household_id', house.id)
      .eq('platform', 'ios');

    if (!subs?.length) continue;

    for (const sub of subs as Sub[]) {
      // The agenda is built through one member's eyes, the same way the widget
      // is, so a bill marked private to somebody else is never mentioned.
      const memberId = sub.member_id ?? members?.[0]?.id;
      if (!memberId) continue;

      const { data: rows } = await db.rpc('bill_reminders_for', {
        p_household: house.id,
        p_member: memberId,
        p_lead_days: lead,
      });

      const bills = (rows ?? []) as {
        title: string;
        day: string;
        amount_cents: number | null;
        overdue: boolean;
      }[];

      if (bills.length === 0) continue;

      const overdue = bills.filter((b) => b.overdue);
      const soon = bills.filter((b) => !b.overdue);
      const total = bills.reduce((n, b) => n + (b.amount_cents ?? 0), 0);

      const title = overdue.length
        ? `${overdue.length} bill${overdue.length === 1 ? '' : 's'} late`
        : soon.length === 1
          ? `${soon[0].title} is due`
          : `${soon.length} bills coming up`;

      const body =
        bills.length === 1
          ? `${bills[0].title} · ${money(bills[0].amount_cents)}${bills[0].day === today ? ' · today' : ''}`
          : `${bills.map((b) => b.title).slice(0, 3).join(', ')}${bills.length > 3 ? '…' : ''} · ${money(total)}`;

      const res = await sendAPNs({
        host,
        token,
        bundleId,
        deviceToken: sub.device_token,
        title,
        body,
        badge: bills.length,
      });

      // 410 Gone means the app was deleted. Keeping the row would mean
      // retrying a dead device every morning until someone noticed.
      if (res.status === 410) {
        await db.from('push_subscriptions').delete().eq('id', sub.id);
      } else if (res.ok) {
        await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', sub.id);
      }

      sent.push({ house: house.name, device: sub.device_token.slice(-6), status: res.status, bills: bills.length });
    }
  }

  return Response.json({ sent });
});

const money = (cents: number | null) =>
  cents == null ? '—' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// APNs
// ---------------------------------------------------------------------------

// Apple wants an ES256 JWT signed with the .p8 key, reused for up to an hour.
// This function is invoked once per run, so one token per invocation is right —
// minting one per message would get the connection throttled.
async function apnsToken({ keyId, teamId, privateKey }: { keyId: string; teamId: string; privateKey: string }) {
  const header = { alg: 'ES256', kid: keyId };
  const claims = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const encode = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${encode(header)}.${encode(claims)}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
}

// The secret arrives as the literal contents of the .p8 file. Newlines survive
// Supabase's secret storage, but they don't survive every way of setting it, so
// the escaped form is accepted too.
function pemToBytes(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(body);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendAPNs(o: {
  host: string;
  token: string;
  bundleId: string;
  deviceToken: string;
  title: string;
  body: string;
  badge: number;
}) {
  return await fetch(`${o.host}/3/device/${o.deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${o.token}`,
      'apns-topic': o.bundleId,
      'apns-push-type': 'alert',
      // Bills are not urgent to the second. 5 lets iOS group the delivery with
      // whatever else it was going to wake the radio for.
      'apns-priority': '5',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: { title: o.title, body: o.body },
        badge: o.badge,
        sound: 'default',
        'thread-id': 'tend-bills',
      },
      // Tapping the notification opens the calendar, same as the widget.
      url: 'tend://calendar',
    }),
  });
}

/*
To turn this on:

1. Create an APNs Auth Key (.p8) at developer.apple.com → Certificates,
   Identifiers & Profiles → Keys → + → check "Apple Push Notifications service".
   You can only download the .p8 once. Note the Key ID, and your Team ID from
   the top right of the portal.

2. Set the secrets:
     supabase secrets set \
       APNS_KEY_ID=ABC123DEFG \
       APNS_TEAM_ID=23J52H57Y4 \
       APNS_BUNDLE_ID=com.mikemertens.tend \
       APNS_ENVIRONMENT=development \
       APNS_PRIVATE_KEY="$(cat AuthKey_ABC123DEFG.p8)"

   APNS_ENVIRONMENT stays 'development' for builds run from Xcode. Change it to
   'production' for TestFlight and the App Store — a token minted under one
   environment is unknown to the other, which is why a push that worked in
   Xcode goes quiet after the first TestFlight build.

3. Turn reminders on for the household, in SQL:
     update households
        set settings = settings || '{"billReminders": true, "billReminderDays": 3}'::jsonb
      where name = 'My House';

4. Schedule it — 8am UTC daily. Requires pg_cron and pg_net:
     select cron.schedule(
       'tend-bill-reminders',
       '0 8 * * *',
       $$ select net.http_post(
            url     := 'https://qeqdsozwywggxizvidnc.supabase.co/functions/v1/push-reminders',
            headers := jsonb_build_object(
                         'Content-Type',  'application/json',
                         'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                       )
          ) $$
     );

   Stop it again with:  select cron.unschedule('tend-bill-reminders');
*/
