import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJaaropgaaf } from "./scan";

test("reads a typical jaaropgaaf", () => {
  const text = `Jaaropgaaf 2025
Werkgever: Voorbeeld BV
Naam werknemer: J. Jansen
Fiscaal loon € 58.432,00
Ingehouden loonheffing € 18.215,00
Arbeidskorting verrekend: Ja`;
  assert.deepEqual(extractJaaropgaaf(text), { fiscalWage: 58432, taxWithheld: 18215 });
});

test("reads values on the line after the label (tables)", () => {
  const text = `Loon voor de loonheffing
45.000
Loonheffing
12.345,67`;
  assert.deepEqual(extractJaaropgaaf(text), { fiscalWage: 45000, taxWithheld: 12346 });
});

test("ignores dates and percentages, and English labels work", () => {
  const text = `Period 01-01-2025 to 31-12-2025
Taxable wage 2025: 61,250.00
Wage tax withheld 19,804.50
Rate 37%`;
  assert.deepEqual(extractJaaropgaaf(text), { fiscalWage: 61250, taxWithheld: 19805 });
});

test("returns nulls when nothing is found", () => {
  assert.deepEqual(extractJaaropgaaf("Hello world"), { fiscalWage: null, taxWithheld: null });
});
