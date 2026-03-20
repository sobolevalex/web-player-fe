# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

# API URL is inlined at build time (NEXT_PUBLIC_*). Empty = same-origin (Next.js proxies /api, /media to backend).
ARG NEXT_PUBLIC_TELEDIGEST_API_URL=
ENV NEXT_PUBLIC_TELEDIGEST_API_URL=$NEXT_PUBLIC_TELEDIGEST_API_URL

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# Stage 2: run
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]