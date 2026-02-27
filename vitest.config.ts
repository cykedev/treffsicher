import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    // Tests laufen in Node.js-Umgebung (kein Browser), da wir reine Logik testen
    environment: "node",
  },
  resolve: {
    // @-Alias muss hier wiederholt werden, da vitest tsconfig nicht automatisch liest
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
