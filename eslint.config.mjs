// ESLint (flat config). Run: npm run lint
// next/core-web-vitals = Next.js + React + React Hooks + accessibility rules;
// next/typescript      = typescript-eslint recommended rules.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Build output and generated files are not our source code
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "node_modules/**", "terraform/**", "test-files/**", "preview.html"]),
]);
