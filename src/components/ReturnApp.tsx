"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Nav } from "./Nav";
import { Results } from "./Results";
import { DeleteButton } from "./DeleteButton";
import type { Answers } from "@/lib/tax/types";
import { calculate } from "@/lib/tax/calculate";
import {
  QUESTIONS,
  SECTIONS,
  answerLabel,
  cleanAnswers,
  formatEuro,
  nextQuestion,
  visibleQuestions,
  withYear,
  type Question,
} from "@/lib/questions";
import { deleteSaved, loadSaved, saveAnswers } from "@/lib/storage";
import { parseMoney } from "@/lib/money";

export function ReturnApp() {
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<keyof Answers | null>(null);
  const [view, setView] = useState<"chat" | "results">("chat");

  // F10: pick up where the user left off.
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setAnswers(saved.answers);
      if (Object.keys(saved.answers).length > 0 && !nextQuestion(saved.answers)) setView("results");
    }
    setLoaded(true);
  }, []);

  const visible = useMemo(() => visibleQuestions(answers), [answers]);
  const current: Question | null = editingId ? QUESTIONS.find((q) => q.id === editingId) ?? null : nextQuestion(answers);
  const estimate = useMemo(() => calculate(cleanAnswers(answers)), [answers]);

  function answer(q: Question, value: string | number) {
    const updated = cleanAnswers({ ...answers, [q.id]: value });
    setAnswers(updated);
    saveAnswers(updated);
    setEditingId(null);
    if (!nextQuestion(updated)) setView("results");
  }

  function back() {
    const list = visibleQuestions(answers);
    const idx = current ? list.findIndex((q) => q.id === current.id) : list.length;
    if (idx > 0) setEditingId(list[idx - 1].id);
  }

  function startOver() {
    deleteSaved();
    setAnswers({});
    setEditingId(null);
    setView("chat");
  }

  if (!loaded) return <div className="page" />;

  if (view === "results") {
    return (
      <div className="page">
        <div className="wrap">
          <Nav />
          <Results
            answers={cleanAnswers(answers)}
            estimate={estimate}
            onEdit={() => {
              setView("chat");
              setEditingId(visible[0]?.id ?? null);
            }}
            onDelete={startOver}
          />
        </div>
      </div>
    );
  }

  const answeredCount = visible.filter((q) => answers[q.id] !== undefined).length;
  const currentIndex = current ? visible.findIndex((q) => q.id === current.id) : visible.length;
  const history = visible.slice(0, Math.max(0, currentIndex)).filter((q) => answers[q.id] !== undefined);

  return (
    <div className="page">
      <div className="wrap">
        <Nav />
        <div className="row">
          <section className="tile chat-tile" aria-label="Questions">
            <div className="chat-head">
              <div>
                <div className="eyebrow">Question {Math.min(currentIndex + 1, visible.length)} of {visible.length}</div>
                <div className="progress" aria-hidden="true">
                  <div className="progress-bar" style={{ width: `${(answeredCount / Math.max(1, visible.length)) * 100}%` }} />
                </div>
              </div>
              <button className="btn btn-ghost" onClick={back} disabled={currentIndex <= 0}>
                ← Back
              </button>
            </div>

            <ChatLog history={history} answers={answers} onChange={setEditingId} current={current} />

            {current && <AnswerInput key={current.id} question={current} value={answers[current.id]} onAnswer={answer} answers={answers} />}
          </section>

          <aside className="stack side">
            <EstimateTile estimate={estimate} hasIncome={answers.hasJob !== undefined} />
            <div className="tile">
              <div className="eyebrow">Your route</div>
              <ol className="route">
                {SECTIONS.map((s) => {
                  const qs = visible.filter((q) => q.section === s.id);
                  const done = qs.length > 0 && qs.every((q) => answers[q.id] !== undefined);
                  const active = current?.section === s.id;
                  return (
                    <li key={s.id} className={done ? "done" : active ? "active" : ""}>
                      <span className="dot" aria-hidden="true">{done ? "✓" : ""}</span>
                      {s.title}
                      {done && <span className="sr-only"> (done)</span>}
                      {active && <span className="sr-only"> (now)</span>}
                    </li>
                  );
                })}
              </ol>
              <DeleteButton onConfirm={startOver} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ChatLog({
  history,
  answers,
  onChange,
  current,
}: {
  history: Question[];
  answers: Answers;
  onChange: (id: keyof Answers) => void;
  current: Question | null;
}) {
  // Keep the newest messages in view (scrolls only the chat box, not the page).
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, current?.id]);

  return (
    <>
    <div className="chat-log" ref={logRef}>
      {history.length === 0 && (
        <div className="bubble bot">
          Hi! I'll ask you a few simple questions about your tax return. Your answers stay in this browser. Let's start.
        </div>
      )}
      {history.map((q) => (
        <div key={q.id} className="pair">
          <div className="bubble bot">{withYear(q.text, answers)}</div>
          <div className="bubble user">
            {withYear(answerLabel(q, answers[q.id]), answers)}
            <button className="change" onClick={() => onChange(q.id)} aria-label={`Change answer: ${withYear(q.text, answers)}`}>
              Change
            </button>
          </div>
        </div>
      ))}
    </div>
    {current && (
      <div className="bubble bot current" aria-live="polite">
        <div className="q-section">{SECTIONS.find((s) => s.id === current.section)?.title}</div>
        <div className="q-text">{withYear(current.text, answers)}</div>
        {current.help && <div className="q-help">{withYear(current.help, answers)}</div>}
      </div>
    )}
    </>
  );
}

function AnswerInput({
  question,
  value,
  onAnswer,
  answers,
}: {
  question: Question;
  value: unknown;
  onAnswer: (q: Question, v: string | number) => void;
  answers: Answers;
}) {
  const [text, setText] = useState(value !== undefined ? String(value) : "");
  const [error, setError] = useState("");

  if (question.kind === "choice") {
    return (
      <div className="answer chips" role="group" aria-label="Choose an answer">
        {question.options!.map((o) => (
          <button
            key={String(o.value)}
            className={"chip " + (value === o.value ? "chip-accent" : "chip-outline")}
            onClick={() => onAnswer(question, o.value)}
          >
            {withYear(o.label, answers)}
          </button>
        ))}
      </div>
    );
  }

  const isMoney = question.kind === "money";
  function submit(e: FormEvent) {
    e.preventDefault();
    const v = isMoney ? parseMoney(text) : Number(text);
    if (v === null || isNaN(v)) return setError(isMoney ? "Please enter an amount, like 45000." : "Please enter a number.");
    if (question.min !== undefined && v < question.min) return setError(`Please enter at least ${question.min}.`);
    if (question.max !== undefined && v > question.max) return setError(`Please enter at most ${question.max}.`);
    onAnswer(question, v);
  }

  return (
    <form className="answer input-row" onSubmit={submit} noValidate>
      <label htmlFor="answer-input" className="sr-only">
        {withYear(question.text, answers)}
      </label>
      {isMoney && <span className="prefix" aria-hidden="true">€</span>}
      <input
        id="answer-input"
        inputMode={isMoney ? "decimal" : "numeric"}
        autoComplete="off"
        placeholder={isMoney ? "0" : `${question.min ?? 1}–${question.max ?? 12}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError("");
        }}
        aria-invalid={!!error}
        aria-describedby={error ? "answer-error" : undefined}
        autoFocus
      />
      <button className="btn btn-accent" type="submit">
        Next →
      </button>
      {error && (
        <div id="answer-error" className="error" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}

function EstimateTile({ estimate, hasIncome }: { estimate: ReturnType<typeof calculate>; hasIncome: boolean }) {
  const show = estimate.available && hasIncome;
  const refund = estimate.result >= 0;
  return (
    <div className="tile tile-blue" aria-live="polite">
      <div className="eyebrow eyebrow-blue">{show ? (refund ? "Estimated refund" : "Estimated to pay") : "Refund estimate"}</div>
      <div className="big-number">{show ? formatEuro(Math.abs(estimate.result)) : "€ —"}</div>
      <div className="muted-blue">
        {!estimate.available
          ? "We can't estimate your situation yet."
          : show
            ? estimate.rough
              ? "Rough estimate. It updates as you answer."
              : "Updates as you answer."
            : "Shows up once you've told us about your income."}
      </div>
    </div>
  );
}
