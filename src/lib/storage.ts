import type { Answers } from "./tax/types";

// F10 + F11: answers are saved in this browser only. Nothing is sent to a server.
const KEY = "belastingbuddy.v1";

export interface Saved {
  answers: Answers;
  updatedAt: string;
}

export function loadSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export function saveAnswers(answers: Answers): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ answers, updatedAt: new Date().toISOString() }));
  } catch {
    // Storage can be blocked (private mode). The app still works, it just won't remember.
  }
}

export function deleteSaved(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to delete
  }
}
