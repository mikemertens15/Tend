// A once-a-day email: what's late, what's due, whether the cats got fed.
//
// DORMANT BY DEFAULT. Nothing here runs or sends until two things are true:
//   1. RESEND_API_KEY is set as a secret on the project, and
//   2. a pg_cron schedule is created (see the SQL at the bottom of this file).
// Deploying the function alone sends no mail. That's deliberate — nobody should
// discover their house started emailing them because a deploy went out.
//
// The rules here mirror src/data/nudges.js, so the email and the dashboard
// never disagree about what's slipping.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

type Nudge = { level: 'late' | 'soon'; icon: string; text: string };

Deno.serve(async (req) => {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('DIGEST_FROM') ?? 'Tend <onboarding@resend.dev>';
  const appUrl = Deno.env.get('APP_URL') ?? '';

  // The cron job passes the service role key; nothing else may invoke this.
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (auth !== `Bearer ${serviceKey}`) {
    return new Response('forbidden', { status: 403 });
  }

  if (!resendKey) {
    return Response.json({ skipped: 'RESEND_API_KEY not set — nothing sent' }, { status: 200 });
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const today = new Date().toISOString().slice(0, 10);
  const sent: string[] = [];

  const { data: households } = await db.from('households').select('id, name, settings');

  for (const house of households ?? []) {
    // Opt-in per household, set from the app.
    if (!house.settings?.dailyDigest) continue;

    const [{ data: tasks }, { data: systems }, { data: pets }, { data: petLog }, { data: petCare }] =
      await Promise.all([
        db.from('tasks').select('title, due_on, done').eq('household_id', house.id).eq('done', false),
        db.from('home_systems').select('name, interval_days, last_done_on').eq('household_id', house.id),
        db.from('pets').select('id, name, meals_per_day').eq('household_id', house.id),
        db.from('pet_log').select('pet_id, slot').eq('household_id', house.id).eq('kind', 'fed').eq('on_date', today),
        db.from('pet_care').select('name, interval_days, last_done_on').eq('household_id', house.id),
      ]);

    const nudges: Nudge[] = [];
    const daysLate = (d: string) =>
      Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);

    const overdue = (tasks ?? []).filter((t) => t.due_on < today);
    if (overdue.length) {
      nudges.push({
        level: 'late',
        icon: '🧹',
        text:
          overdue.length === 1
            ? `“${overdue[0].title}” is ${daysLate(overdue[0].due_on)} day(s) late`
            : `${overdue.length} chores have run late`,
      });
    }

    const dueToday = (tasks ?? []).filter((t) => t.due_on === today);
    if (dueToday.length) {
      nudges.push({ level: 'soon', icon: '📅', text: `${dueToday.length} chore(s) due today` });
    }

    const hungry = (pets ?? []).filter(
      (p) => (petLog ?? []).filter((l) => l.pet_id === p.id).length < p.meals_per_day,
    );
    if (hungry.length) {
      nudges.push({
        level: 'late',
        icon: '🐾',
        text: `Not fully fed today: ${hungry.map((p) => p.name).join(', ')}`,
      });
    }

    const isLate = (r: { interval_days: number; last_done_on: string | null }) =>
      r.last_done_on !== null && daysLate(r.last_done_on) >= r.interval_days;

    const lateCare = (petCare ?? []).filter(isLate);
    if (lateCare.length) {
      nudges.push({ level: 'late', icon: '🧴', text: `Pet jobs due: ${lateCare.map((c) => c.name).join(', ')}` });
    }

    const lateSystems = (systems ?? []).filter(isLate);
    if (lateSystems.length) {
      nudges.push({
        level: 'late',
        icon: '🔧',
        text: `Home systems overdue: ${lateSystems.map((s) => s.name).join(', ')}`,
      });
    }

    // A digest with nothing in it is training people to ignore digests.
    if (nudges.length === 0) continue;

    const { data: members } = await db
      .from('household_members')
      .select('name, user_id')
      .eq('household_id', house.id)
      .not('user_id', 'is', null);

    const emails: string[] = [];
    for (const m of members ?? []) {
      const { data } = await db.auth.admin.getUserById(m.user_id!);
      if (data?.user?.email) emails.push(data.user.email);
    }
    if (emails.length === 0) continue;

    const rows = nudges
      .map(
        (n) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid #f3eadd;font:400 15px/1.5 system-ui">
             <span style="margin-right:10px">${n.icon}</span>
             <span style="color:${n.level === 'late' ? '#c0654b' : '#6b5640'}">${n.text}</span>
           </td></tr>`,
      )
      .join('');

    const html = `<div style="max-width:520px;margin:0 auto;background:#f4ece1;padding:28px 24px;font-family:system-ui">
        <div style="font:400 26px Georgia,serif;color:#3a2e25;margin-bottom:4px">Tend</div>
        <div style="font:400 14px system-ui;color:#a8906f;margin-bottom:20px">${house.name} · today</div>
        <table style="width:100%;background:#fffdf9;border:1px solid #ece0d0;border-radius:16px;padding:8px 20px;border-collapse:separate">
          ${rows}
        </table>
        ${appUrl ? `<div style="margin-top:20px"><a href="${appUrl}" style="color:#c2724a;font:600 14px system-ui;text-decoration:none">Open Tend →</a></div>` : ''}
      </div>`;

    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: emails,
        subject: `${house.name} — ${nudges.length} thing${nudges.length === 1 ? '' : 's'} need you`,
        html,
      }),
    });
    if (res.ok) sent.push(house.name);
  }

  return Response.json({ sent });
});

/*
To turn this on:

1. Set the secret (Supabase dashboard → Edge Functions → Secrets, or CLI):
     supabase secrets set RESEND_API_KEY=re_xxx APP_URL=https://your-tend-url

2. Turn the digest on for your household, in SQL:
     update households
        set settings = settings || '{"dailyDigest": true}'::jsonb
      where name = 'My House';

3. Schedule it — 7am UTC daily. Requires the pg_cron and pg_net extensions:
     select cron.schedule(
       'tend-daily-digest',
       '0 7 * * *',
       $$ select net.http_post(
            url     := 'https://<project-ref>.supabase.co/functions/v1/daily-digest',
            headers := jsonb_build_object(
                         'Content-Type',  'application/json',
                         'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                       )
          ) $$
     );

   Stop it again with:  select cron.unschedule('tend-daily-digest');
*/
