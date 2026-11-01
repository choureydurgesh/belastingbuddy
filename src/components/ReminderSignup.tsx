"use client";

// F18: "Remind me before the deadline" — email signup with a confirm link.
import { useState, type FormEvent } from "react";
import { useLang } from "@/lib/i18n";

type Status = "idle" | "sending" | "sent" | "unavailable" | "bad_email" | "error";

export function ReminderSignup({ year }: { year: number }) {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // bot trap
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setStatus("bad_email");
    setStatus("sending");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, year, lang, website }),
      });
      if (res.status === 503) return setStatus("unavailable");
      if (res.status === 400) return setStatus("bad_email");
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="tile reminder">
      <div className="eyebrow">{t("Remind me before the deadline")}</div>
      {status === "sent" ? (
        <p role="status" className="small-text">
          {t("Check your inbox and click the link to confirm.")}
        </p>
      ) : (
        <form onSubmit={submit} className="reminder-form" noValidate>
          <p className="small-text">
            {t("We'll send one email in March, when filing opens, and one two weeks before the deadline. Nothing else.")}
          </p>
          <label htmlFor="reminder-email" className="sr-only">
            {t("Your email")}
          </label>
          <div className="input-row">
            <input
              id="reminder-email"
              type="email"
              autoComplete="email"
              placeholder={t("Your email")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "sending") setStatus("idle");
              }}
              aria-invalid={status === "bad_email"}
            />
            <input className="sr-only" tabIndex={-1} aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} autoComplete="off" />
            <button className="btn btn-dark" type="submit" disabled={status === "sending"}>
              {status === "sending" ? t("Sending…") : t("Remind me")}
            </button>
          </div>
          {status === "bad_email" && (
            <p className="error" role="alert">
              {t("Please enter a valid email address.")}
            </p>
          )}
          {status === "unavailable" && (
            <p className="error" role="alert">
              {t("Reminders aren't available yet. Please check back soon.")}
            </p>
          )}
          {status === "error" && (
            <p className="error" role="alert">
              {t("Sending didn't work. Please try again in a minute.")}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
