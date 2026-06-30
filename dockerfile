# ── Stage 1: Install dependencies & generate Prisma client ──────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Prisma needs openssl on alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

# ── Stage 2: Build (copy source, no build step needed for plain JS) ─────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy installed deps + generated Prisma client from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy rest of the source code
COPY . .

# Railway injects PORT dynamically — don't hardcode EXPOSE to a fixed value
# but documenting the default for local docker run is still useful
EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]