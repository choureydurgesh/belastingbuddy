#!/usr/bin/env node
// CI dependency gate: like `npm audit --audit-level=high`, but advisories listed in
// .npm-audit-allowlist.json (with a reason and a review date) are allowed.
// Fails when:
//   - any HIGH/CRITICAL advisory is not on the allowlist
//   - an allowlisted advisory is past its review_by date (re-check it)
//   - an allowlisted advisory no longer appears (remove the exception)
// Usage: node scripts/audit-gate.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BLOCKING = new Set(["high", "critical"]);
const allow = JSON.parse(readFileSync(new URL("../.npm-audit-allowlist.json", import.meta.url), "utf8")).advisories;

let raw;
try {
  raw = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (err) {
  raw = err.stdout; // npm audit exits non-zero when it finds anything; the JSON is still on stdout
}
const report = JSON.parse(raw);

// Each advisory appears once as an object in some package's "via" list
const found = new Map();
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== "object") continue;
    const id = via.url?.match(/GHSA-[\w-]+/)?.[0] ?? String(via.source);
    found.set(id, { id, severity: via.severity, title: via.title, package: via.name, url: via.url });
  }
}

const today = new Date().toISOString().slice(0, 10);
const problems = [];
for (const adv of found.values()) {
  if (!BLOCKING.has(adv.severity)) continue;
  const entry = allow.find((a) => a.id === adv.id);
  if (!entry) problems.push(`NOT ALLOWED  ${adv.severity} ${adv.package}: ${adv.title} (${adv.url})`);
  else if (entry.review_by < today) problems.push(`EXPIRED      ${adv.id} (${adv.package}) review_by ${entry.review_by} - re-check and update .npm-audit-allowlist.json`);
  else console.log(`allowed      ${adv.id} (${adv.package}) until ${entry.review_by}: ${entry.reason}`);
}
for (const entry of allow) {
  if (!found.has(entry.id)) problems.push(`STALE        ${entry.id} (${entry.package}) is no longer reported - remove it from .npm-audit-allowlist.json`);
}

const counts = report.metadata?.vulnerabilities ?? {};
console.log(`npm audit: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("audit gate: passed");
