"use client";

// F19: read a jaaropgaaf (PDF or photo) in the browser and find the two numbers we need.
// The file never leaves the device. The browser only downloads the reading software from a CDN.
import { useState, type ChangeEvent } from "react";
import { extractJaaropgaaf, type ScanResult } from "@/lib/scan";
import { formatEuro } from "@/lib/questions";
import { useLang } from "@/lib/i18n";

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

/* Minimal shapes of the two libraries (they add themselves to window). */
interface PdfTextItem {
  str: string;
  transform: number[];
}
interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
}
interface PdfLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(o: { data: ArrayBuffer }): { promise: Promise<{ numPages: number; getPage(n: number): Promise<PdfPage> }> };
}
interface TesseractLib {
  createWorker(langs: string): Promise<{ recognize(img: unknown): Promise<{ data: { text: string } }>; terminate(): Promise<void> }>;
}

const loaded = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("load " + src));
        document.head.appendChild(s);
      }),
    );
  }
  return loaded.get(src)!;
}

async function ocr(image: unknown): Promise<string> {
  await loadScript(TESSERACT);
  const T = (window as unknown as { Tesseract: TesseractLib }).Tesseract;
  const worker = await T.createWorker("nld+eng");
  try {
    return (await worker.recognize(image)).data.text;
  } finally {
    await worker.terminate();
  }
}

/** Text from a PDF: use the PDF's own text; if it's a scanned PDF, read page 1 as an image. */
async function pdfText(file: File): Promise<string> {
  await loadScript(PDFJS);
  const pdfjs = (window as unknown as { pdfjsLib: PdfLib }).pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 3); n++) {
    const page = await doc.getPage(n);
    const { items } = await page.getTextContent();
    // Group text pieces into lines by their height on the page, left to right.
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      rows.set(key, [...(rows.get(key) ?? []), { x: it.transform[4], s: it.str }]);
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, parts]) => lines.push(parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(" ")));
  }
  const text = lines.join("\n");
  if (text.replace(/\s/g, "").length > 30) return text;

  // Scanned PDF: draw page 1 and read it.
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
  return ocr(canvas);
}

type State = { kind: "idle" } | { kind: "reading" } | { kind: "found"; result: ScanResult } | { kind: "none" } | { kind: "error" };

export function ScanJaaropgaaf({ onUse }: { onUse: (r: ScanResult) => void }) {
  const { t } = useLang();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState({ kind: "reading" });
    try {
      const text = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? await pdfText(file) : await ocr(file);
      const result = extractJaaropgaaf(text);
      setState(result.fiscalWage === null && result.taxWithheld === null ? { kind: "none" } : { kind: "found", result });
    } catch {
      setState({ kind: "error" });
    }
  }

  return (
    <div className="scan">
      <label className="btn btn-ghost scan-button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
        </svg>
        {t("Scan your jaaropgaaf")}
        <input id="scan-file" type="file" accept="image/*,application/pdf" onChange={onFile} className="sr-only" />
      </label>
      <p className="small-muted">{t("Take a photo or choose a picture. It's read in your browser and never uploaded.")}</p>
      {state.kind === "reading" && (
        <p role="status" className="scan-status">
          {t("Reading your jaaropgaaf…")}
        </p>
      )}
      {(state.kind === "none" || state.kind === "error") && (
        <p role="alert" className="error">
          {t("We couldn't read the numbers. Please type them in.")}
        </p>
      )}
      {state.kind === "found" && (
        <div className="scan-result" role="status">
          <p>{t("We found these numbers. Check them before you use them.")}</p>
          <table className="breakdown">
            <tbody>
              <tr>
                <td>{t("Fiscal wage")}</td>
                <td className="num">{state.result.fiscalWage !== null ? formatEuro(state.result.fiscalWage) : t("not found")}</td>
              </tr>
              <tr>
                <td>{t("Tax withheld")}</td>
                <td className="num">{state.result.taxWithheld !== null ? formatEuro(state.result.taxWithheld) : t("not found")}</td>
              </tr>
            </tbody>
          </table>
          <button className="btn btn-dark" onClick={() => onUse(state.result)}>
            {t("Use these numbers")}
          </button>
        </div>
      )}
    </div>
  );
}
