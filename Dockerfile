# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Use the official Playwright image so Chromium + all deps are pre-installed
FROM mcr.microsoft.com/playwright:v1.62.0-jammy AS builder

WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.62.0-jammy AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built app from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy Playwright browsers cached by the builder stage
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy node_modules needed at runtime (Playwright, node-cron, prisma, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Create the data directory — Railway will mount its Volume here via the dashboard
RUN mkdir -p /data

EXPOSE 3000

# startup.sh runs db push then starts the server
COPY startup.sh ./startup.sh
RUN chmod +x ./startup.sh

CMD ["./startup.sh"]
