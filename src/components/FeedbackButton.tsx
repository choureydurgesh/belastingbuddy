"use client";

// F17: a "Feedback" button on every page. Messages go to our database (EU).
import { useState, type FormEvent } from "react";
import { useLang } from "@/lib/i18n";

type Status = "idle" | "sending" | "sent" | "error";

export function FeedbackButton() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("problem");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // hidden trap for bots
  const [status, setStatus] = useState<Status>("idle");

  async function send(e: FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, message, email, website, page: window.location.pathname, lang }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      setMessage("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  const kinds: [string, string][] = [
    ["problem", "Something's wrong"],
    ["idea", "An idea"],
    ["other", "Something else"],
  ];

  return (
    <div className="feedback no-print">
      {open && (
        <div className="feedback-panel tile" role="dialog" aria-labelledby="fb-title">
          <div className="feedback-head">
            <h2 id="fb-title">{t("Send feedback")}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label={t("Close")}>
              ✕
            </button>
          </div>
          {status === "sent" ? (
            <p role="status">{t("Thank you! We read every message.")}</p>
          ) : (
            <form onSubmit={send} className="feedback-form">
              <div className="chips" role="radiogroup" aria-label={t("What is it about?")}>
                {kinds.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={kind === value}
                    className={"chip " + (kind === value ? "chip-accent" : "chip-outline")}
                    onClick={() => setKind(value)}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
              <label htmlFor="fb-message">{t("Your message")}</label>
              <textarea
                id="fb-message"
                rows={4}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("What happened, or what would help?")}
                required
              />
              <label htmlFor="fb-email">{t("Email (optional, only if you want a reply)")}</label>
              <input id="fb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <input
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                autoComplete="off"
              />
              <p className="small-muted">{t("Please don't include your BSN or tax numbers.")}</p>
              {status === "error" && (
                <p className="error" role="alert">
                  {t("Sending didn't work. Please try again in a minute.")}
                </p>
              )}
              <button className="btn btn-dark" type="submit" disabled={status === "sending" || message.trim().length < 3}>
                {status === "sending" ? t("Sending…") : t("Send")}
              </button>
            </form>
          )}
        </div>
      )}
      <button
        className="btn btn-dark feedback-toggle"
        onClick={() => {
          setOpen(!open);
          if (status === "sent") setStatus("idle");
        }}
        aria-expanded={open}
      >
        {t("Feedback")}
      </button>
    </div>
  );
}
