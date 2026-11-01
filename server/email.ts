// Sends email through Resend (resend.com). Needs RESEND_API_KEY as a secret in Cloudflare.
import type { Env } from "./lib";

export const SITE = "https://belastingbuddy.com";
const FROM = "BelastingBuddy <reminders@belastingbuddy.com>";

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  text: string,
  unsubscribeUrl?: string,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const html = text
    .split("\n\n")
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/(https:\/\/\S+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>")}</p>`)
    .join("");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to,
      subject,
      text,
      html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#0b0f19">${html}</div>`,
      headers: unsubscribeUrl
        ? { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    }),
  });
  return res.ok;
}

type Lang = "en" | "nl";

/** All reminder email texts, in plain language. */
export const MAIL = {
  confirm: (lang: Lang, link: string) =>
    lang === "nl"
      ? {
          subject: "Bevestig je herinnering van BelastingBuddy",
          text: `Hoi,\n\nJe vroeg om een herinnering voor je belastingaangifte. Klik op deze link om dat te bevestigen:\n\n${link}\n\nWe sturen je twee e-mails: één als de aangifte opengaat, en één twee weken voor de deadline.\n\nHeb je dit niet zelf gevraagd? Dan hoef je niets te doen.\n\nBelastingBuddy`,
        }
      : {
          subject: "Confirm your BelastingBuddy reminder",
          text: `Hi,\n\nYou asked for a reminder about your Dutch tax return. Click this link to confirm:\n\n${link}\n\nWe'll send you two emails: one when filing opens, and one two weeks before the deadline.\n\nDidn't ask for this? You don't need to do anything.\n\nBelastingBuddy`,
        },
  open: (lang: Lang, year: number, unsub: string) =>
    lang === "nl"
      ? {
          subject: `Je kunt nu aangifte doen over ${year}`,
          text: `Hoi,\n\nVanaf vandaag kun je aangifte inkomstenbelasting doen over ${year}. De deadline is 1 mei.\n\nBelastingBuddy helpt je stap voor stap:\n\n${SITE}/return/\n\nGeen herinneringen meer? Klik hier: ${unsub}`,
        }
      : {
          subject: `You can now file your ${year} Dutch tax return`,
          text: `Hi,\n\nFrom today you can file your ${year} income tax return. The deadline is 1 May.\n\nBelastingBuddy helps you step by step:\n\n${SITE}/return/\n\nNo more reminders? Click here: ${unsub}`,
        },
  deadline: (lang: Lang, year: number, unsub: string) =>
    lang === "nl"
      ? {
          subject: `Nog twee weken voor je aangifte ${year}`,
          text: `Hoi,\n\nDe deadline voor je aangifte over ${year} is 1 mei. Nog geen tijd gehad? Vraag in Mijn Belastingdienst uitstel aan, of rond het nu af:\n\n${SITE}/return/\n\nGeen herinneringen meer? Klik hier: ${unsub}`,
        }
      : {
          subject: `Two weeks left to file your ${year} tax return`,
          text: `Hi,\n\nThe deadline for your ${year} tax return is 1 May. Not done yet? Ask for more time in Mijn Belastingdienst, or finish it now:\n\n${SITE}/return/\n\nNo more reminders? Click here: ${unsub}`,
        },
};
