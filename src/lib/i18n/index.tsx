"use client";

// F14: language switch. Texts are written in English in the code; `t()` swaps in Dutch.
// Keys may contain {placeholders} so texts with numbers or years still match,
// e.g. "Bank balances on 1 January {y}" matches "Bank balances on 1 January 2026".

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NL } from "./nl";

export type Lang = "en" | "nl";
const KEY = "belastingbuddy.lang";

interface Pattern {
  re: RegExp;
  names: string[];
  out: string;
}

// Turn keys with {placeholders} into patterns once.
const PATTERNS: Pattern[] = Object.entries(NL)
  .filter(([k]) => /\{\w+\}/.test(k))
  .map(([k, out]) => {
    const names: string[] = [];
    const src = k
      .split(/(\{\w+\})/)
      .map((part) => {
        const m = part.match(/^\{(\w+)\}$/);
        if (m) {
          names.push(m[1]);
          return "(.+?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    return { re: new RegExp(`^${src}$`), names, out };
  });

/** Translate one English text to Dutch. Unknown texts stay in English. */
export function translate(text: string, lang: Lang): string {
  if (lang === "en" || !text) return text;
  const exact = NL[text];
  if (exact) return exact;
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      let out = p.out;
      p.names.forEach((name, i) => (out = out.split(`{${name}}`).join(m[i + 1])));
      return out;
    }
  }
  return text;
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (s) => s,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "nl" || saved === "en") setLangState(saved);
    } catch {
      // storage blocked: stay in English
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: (s: string) => translate(s, lang) }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** Shorthand for a translated piece of text inside JSX. */
export function T({ children }: { children: string }) {
  const { t } = useLang();
  return <>{t(children)}</>;
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <button
      className="lang-switch"
      onClick={() => setLang(lang === "en" ? "nl" : "en")}
      aria-label={lang === "en" ? "Nederlands" : "English"}
      lang={lang === "en" ? "nl" : "en"}
    >
      {lang === "en" ? "NL" : "EN"}
    </button>
  );
}
