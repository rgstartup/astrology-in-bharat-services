FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate
WORKDIR /app

FROM base AS development
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 6543
CMD ["pnpm", "run", "start:dev"]

FROM base AS build
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build && pnpm prune --prod

FROM node:24-alpine AS production
WORKDIR /app
RUN apk add --no-cache libstdc++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 6543
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
