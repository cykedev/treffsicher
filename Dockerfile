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

# Prisma-Schema und Migrations werden für prisma migrate deploy benötigt
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Upload-Verzeichnis anlegen — wird später als Volume gemountet
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Migrationen beim Start ausführen, dann App starten
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
