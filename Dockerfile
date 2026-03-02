# Stufe 1: Abhängigkeiten installieren
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stufe 2: Anwendung bauen
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma Client für das Ziel-OS generieren
RUN npx prisma generate
RUN npm run build

# Stufe 3: Produktions-Image (minimal, ohne Build-Tools)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Eigener Benutzer für bessere Sicherheit — kein Root im Container
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Nur die notwendigen Dateien aus dem Build übernehmen
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma-Schema und generierter Client werden beim Start benötigt.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma
# Vollständiges node_modules, damit Prisma CLI inkl. transitiver Abhängigkeiten verfügbar ist.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Upload-Verzeichnis anlegen — wird später als Volume gemountet
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
RUN chmod +x /app/scripts/start-with-migrations.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Migrationen mit Recovery beim Start ausführen, dann App starten
CMD ["./scripts/start-with-migrations.sh"]
