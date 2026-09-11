# Stage 1: Base image with build dependencies for native modules
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate
WORKDIR /app

# -----------------------------------------------------------
# Stage 2: Development (Hot Reloading)
# -----------------------------------------------------------
FROM base AS development
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install
COPY . .

ENV NODE_ENV=development
ENV PORT=6543

EXPOSE 6543
CMD ["pnpm", "run", "start:dev"]

# -----------------------------------------------------------
# Stage 3: Install dependencies for production build
# -----------------------------------------------------------
FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------
# Stage 4: Build application
# -----------------------------------------------------------
FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# -----------------------------------------------------------
# Stage 5: Production runner
# -----------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=6543

RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 6543
CMD ["node", "dist/main"]
