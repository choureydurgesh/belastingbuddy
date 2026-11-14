import { test } from "node:test";
import assert from "node:assert/strict";
import { answersFromDocs, extractJaaropgaaf, type ScannedDoc } from "./scan";

test("reads a typical jaaropgaaf", () => {
  const text = `Jaaropgaaf 2025
Werkgever: Voorbeeld BV
Naam werknemer: J. Jansen
Periode 01-04-2025 t/m 31-12-2025
Fiscaal loon € 58.432,00
Ingehouden loonheffing € 18.215,00
Vergoeding extraterritoriale kosten € 14.000,00
Arbeidskorting verrekend: Ja`;
  const r = extractJaaropgaaf(text);
  assert.equal(r.fiscalWage, 58432);
  assert.equal(r.taxWithheld, 18215);
  assert.equal(r.year, 2025);
  assert.equal(r.employer, "Voorbeeld BV");
  assert.equal(r.ruling30, true);
  assert.equal(r.startMonth, 4);
});

test("reads values on the line after the label (tables)", () => {
  const text = `Loon voor de loonheffing
45.000
Loonheffing
12.345,67`;
  const r = extractJaaropgaaf(text);
  assert.equal(r.fiscalWage, 45000);
  assert.equal(r.taxWithheld, 12346);
  assert.equal(r.ruling30, false);
});

test("ignores dates and percentages, and English labels work", () => {
  const text = `Annual statement
Employer: Acme Netherlands B.V.
Period 01-01-2026 to 31-12-2026
Taxable wage 2026: 61,250.00
Wage tax withheld 19,804.50
Rate 37%`;
  const r = extractJaaropgaaf(text);
  assert.equal(r.fiscalWage, 61250);
  assert.equal(r.taxWithheld, 19805);
  assert.equal(r.year, 2026);
  assert.equal(r.employer, "Acme Netherlands B.V.");
});

test("returns nulls when nothing is found", () => {
  const r = extractJaaropgaaf("Hello world");
  assert.equal(r.fiscalWage, null);
  assert.equal(r.taxWithheld, null);
});

test("two employers are added up; partner's statement fills partner answers", () => {
  const doc = (id: string, owner: "me" | "partner", w: number | null, t: number | null, extra = {}): ScannedDoc => ({
    id,
    fileName: id,
    owner,
    result: { fiscalWage: w, taxWithheld: t, year: 2025, ...extra },
  });
  const a = answersFromDocs([doc("a", "me", 30000, 8000, { ruling30: true }), doc("b", "me", 12000, 2000), doc("c", "partner", 40000, 11000)], [2025, 2026]);
  assert.deepEqual(a, {
    jaaropgaaf: "scanned",
    taxYear: 2025,
    hasJob: "yes",
    fiscalWage: 42000,
    taxWithheld: 10000,
    ruling30: "yes",
    partner: "yes",
    partnerWage: 40000,
    partnerWithheld: 11000,
  });
  // If one statement is missing a number, we leave the total empty so we still ask it.
  const b = answersFromDocs([doc("a", "me", 30000, null), doc("b", "me", 12000, 2000)], [2025, 2026]);
  assert.equal(b.fiscalWage, 42000);
  assert.equal(b.taxWithheld, undefined);
  assert.deepEqual(answersFromDocs([], [2025]), { jaaropgaaf: "skipped" });
});

import { extractDocument } from "./scan";

test("WOZ letter: finds the value, not the date", () => {
  const text = "Gemeente Utrecht\nWOZ-beschikking 2025\nWaardepeildatum 1 januari 2024\nWOZ-waarde: € 412.000\nTermijn bezwaar 6 weken";
  assert.equal(extractDocument("woz", text).amount, 412000);
});

test("Mortgage statement: adds up loan parts, skips the interest rate", () => {
  const text = "Jaaroverzicht 2025\nLeningdeel 1 Rentepercentage 3,450%\nBetaalde rente € 4.120,55\nLeningdeel 2\nBetaalde rente € 2.300,10\nAflossing € 6.000,00";
  assert.equal(extractDocument("mortgage", text).amount, 4121 + 2300);
  assert.equal(extractDocument("mortgage", "Totaal betaalde rente 2025: 6.420,65\nBetaalde rente 4.120,55").amount, 6421);
});

test("Bank and broker statements: balance on 1 January", () => {
  assert.equal(extractDocument("bank", "Jaaroverzicht 2025\nSaldo per 1 januari 2025 € 12.345,67\nSaldo per 31 december 2025 € 15.000,00").amount, 12346);
  assert.equal(extractDocument("investments", "Portefeuilleoverzicht\nWaarde per 31-12-2024 € 23.456,00").amount, 23456);
  assert.equal(extractDocument("bank", "nothing useful here").amount, null);
});
