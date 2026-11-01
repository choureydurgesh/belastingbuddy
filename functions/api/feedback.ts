// F17: POST /api/feedback  →  saves one feedback message in the database.
import { type Ctx, clean, fromOurSite, isEmail, json } from "../../server/lib";

const KINDS = ["problem", "idea", "other"];

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!fromOurSite(request)) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Bots fill in the hidden "website" field; people don't.
  if (clean(body.website, 100)) return json({ ok: true });

  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : "other";
  const message = clean(body.message, 2000);
  if (message.length < 3) return json({ ok: false, error: "message_too_short" }, 400);
  const email = isEmail(body.email) ? body.email.trim() : null;
  const page = clean(body.page, 200) || null;
  const lang = body.lang === "nl" ? "nl" : "en";

  await env.DB.prepare("INSERT INTO feedback (kind, message, page, email, lang) VALUES (?, ?, ?, ?, ?)")
    .bind(kind, message, page, email, lang)
    .run();

  return json({ ok: true });
}
