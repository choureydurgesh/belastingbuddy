// Shared helpers for the small server (Cloudflare Pages Functions in /functions).
// Only feedback and email reminders use the server. Tax answers never come here.

/** The parts of Cloudflare's D1 database we use. */
export interface D1 {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      first<T = Record<string, unknown>>(): Promise<T | null>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    };
  };
}

export interface Env {
  DB: D1;
  /** Email provider key (Resend). Set as a secret in Cloudflare; reminders stay off without it. */
  RESEND_API_KEY?: string;
  /** Secret the scheduled job sends to start the reminder mailing. */
  CRON_SECRET?: string;
}

export interface Ctx {
  request: Request;
  env: Env;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export const html = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BelastingBuddy</title><style>body{font-family:system-ui,sans-serif;background:#ecedef;color:#0b0f19;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}main{background:#fff;border-radius:24px;padding:32px;max-width:480px}a{color:#0b0f19;font-weight:600}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );

const SITE_HOSTS = ["belastingbuddy.com", "www.belastingbuddy.com"];

/** Only accept form posts from our own site. */
export function fromOurSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return SITE_HOSTS.includes(host) || host.endsWith(".belastingbuddy.pages.dev") || host === "belastingbuddy.pages.dev";
  } catch {
    return false;
  }
}

export const isEmail = (s: unknown): s is string =>
  typeof s === "string" && s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

export const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

export function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
