// F18: unsubscribe. GET = the link in an email. POST = one-click unsubscribe from the mail app.
// The email address is deleted completely.
import { type Ctx, html } from "../../../server/lib";

async function remove({ request, env }: Ctx) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token) await env.DB.prepare("DELETE FROM reminders WHERE token = ?").bind(token).run();
}

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  await remove(ctx);
  return html(
    '<h1>Unsubscribed · Afgemeld</h1><p>We deleted your email address. You won\'t get any more reminders.</p><p lang="nl">We hebben je e-mailadres gewist. Je krijgt geen herinneringen meer.</p><p><a href="/">BelastingBuddy</a></p>',
  );
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  await remove(ctx);
  return new Response(null, { status: 200 });
}
