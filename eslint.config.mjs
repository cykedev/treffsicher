import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // Ungenutzte Variablen sind ein Fehler — verhindert toten Code
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "error",
      // console.log() ist verboten im Code, console.error/warn erlaubt für Fehlerlogging
      "no-console": ["warn", { allow: ["error", "warn"] }],
      // any-Typen verbieten — lieber unknown mit expliziter Prüfung
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
])

export default eslintConfig
