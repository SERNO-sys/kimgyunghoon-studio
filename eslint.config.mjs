import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated build artifacts (e.g. @cloudflare/next-on-pages output) must
    // never be linted. Linting these generated files fails the Cloudflare
    // Pages production build (e.g. `require()` in ___next_launcher.cjs).
    ".vercel/**",
    "node_modules/**",
    ".git/**",
  ]),

]);

export default eslintConfig;