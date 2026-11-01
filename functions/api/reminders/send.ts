// F18: POST /api/reminders/send  →  sends the reminder emails.
// Started by the scheduled GitHub Action (.github/workflows/reminders.yml), which sends the CRON_SECRET.
// Body: { "kind": "open" | "deadline" }
import { type Ctx, json } from "../../../server/lib";
import { MAIL, SITE, sendEmail } from "../../../server/email";

interface Row {
  email: string;
  lang: string;
  token: string;
  tax_year: number;
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!env.CRON_SECRET || request.headers.get("x-cron-secret") !== env.CRON_SECRET) return json({ ok: false }, 401);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: "not_configured" }, 503);

  const { kind } = (await request.json().catch(() => ({}))) as { kind?: string };
  if (kind !== "open" && kind !== "deadline") return json({ ok: false, error: "bad_kind" }, 400);

  const year = new Date().getFullYear() - 1; // in spring you file for last year
  // Skip anyone already mailed in the last 20 days, so a re-run doesn't send twice.
  const { results } = await env.DB.prepare(
    "SELECT email, lang, token, tax_year FROM reminders WHERE confirmed = 1 AND (last_sent IS NULL OR last_sent < datetime('now', '-20 days')) LIMIT 400",
  )
    .bind()
    .all<Row>();

  let sent = 0;
  for (const r of results) {
    const unsub = `${SITE}/api/reminders/unsubscribe?token=${r.token}`;
    const lang = r.lang === "nl" ? "nl" : "en";
    const mail = kind === "open" ? MAIL.open(lang, year, unsub) : MAIL.deadline(lang, year, unsub);
    if (await sendEmail(env, r.email, mail.subject, mail.text, unsub)) {
      sent++;
      await env.DB.prepare("UPDATE reminders SET last_sent = datetime('now') WHERE token = ?").bind(r.token).run();
    }
  }
  return json({ ok: true, sent, waiting: results.length - sent });
}
