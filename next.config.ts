import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Standalone-Output bündelt alle Abhängigkeiten für minimale Docker-Images
  // Ermöglicht `node server.js` statt `npm start` im Container
  output: "standalone",
}

export default nextConfig
