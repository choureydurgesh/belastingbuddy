// F18: GET /api/reminders/confirm?token=…  →  the link in the confirmation email.
import { type Ctx, html } from "../../../server/lib";

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const row = token
    ? await env.DB.prepare("SELECT lang FROM reminders WHERE token = ?").bind(token).first<{ lang: string }>()
    : null;
  if (!row) return html("<h1>Link not valid</h1><p>This link has expired or was already used to unsubscribe.</p><p><a href=\"/\">BelastingBuddy</a></p>", 404);

  await env.DB.prepare("UPDATE reminders SET confirmed = 1, confirmed_at = datetime('now') WHERE token = ?").bind(token).run();
  return row.lang === "nl"
    ? html(`<h1>Bevestigd</h1><p>We sturen je een herinnering als de aangifte opengaat, en twee weken voor de deadline.</p><p><a href="/api/reminders/unsubscribe?token=${token}">Toch geen herinneringen</a> · <a href="/">BelastingBuddy</a></p>`)
    : html(`<h1>Confirmed</h1><p>We'll remind you when filing opens, and two weeks before the deadline.</p><p><a href="/api/reminders/unsubscribe?token=${token}">No reminders after all</a> · <a href="/">BelastingBuddy</a></p>`);
}
