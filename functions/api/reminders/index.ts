// F18: POST /api/reminders  →  sign up for deadline reminders (double opt-in).
import { type Ctx, clean, fromOurSite, isEmail, json, randomToken } from "../../../server/lib";
import { MAIL, SITE, sendEmail } from "../../../server/email";

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!fromOurSite(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: "not_configured" }, 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  if (clean(body.website, 100)) return json({ ok: true }); // bot trap
  if (!isEmail(body.email)) return json({ ok: false, error: "bad_email" }, 400);

  const email = body.email.trim().toLowerCase();
  const lang = body.lang === "nl" ? "nl" : "en";
  const year = Number(body.year) >= 2025 && Number(body.year) <= 2100 ? Number(body.year) : new Date().getFullYear() - 1;

  const existing = await env.DB.prepare("SELECT confirmed FROM reminders WHERE email = ?").bind(email).first<{ confirmed: number }>();
  // Already confirmed: say ok, but don't send anything (and don't reveal that the address is known).
  if (existing?.confirmed) {
    await env.DB.prepare("UPDATE reminders SET tax_year = ?, lang = ? WHERE email = ?").bind(year, lang, email).run();
    return json({ ok: true });
  }

  const token = randomToken();
  await env.DB.prepare(
    "INSERT INTO reminders (email, tax_year, lang, token) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET tax_year = excluded.tax_year, lang = excluded.lang, token = excluded.token",
  )
    .bind(email, year, lang, token)
    .run();

  const mail = MAIL.confirm(lang, `${SITE}/api/reminders/confirm?token=${token}`);
  const sent = await sendEmail(env, email, mail.subject, mail.text);
  return sent ? json({ ok: true }) : json({ ok: false, error: "send_failed" }, 502);
}
