import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney } from "./money";

test("reads Dutch and English amounts", () => {
  assert.equal(parseMoney("45000"), 45000);
  assert.equal(parseMoney("45.000"), 45000);
  assert.equal(parseMoney("€ 45.000,50"), 45000.5);
  assert.equal(parseMoney("45,000.50"), 45000.5);
  assert.equal(parseMoney("1.234.567"), 1234567);
  assert.equal(parseMoney("0"), 0);
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("abc"), null);
});
