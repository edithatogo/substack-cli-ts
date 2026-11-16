# Multi-stage Dockerfile for @edithatogo/substack-publisher
FROM node:22.23.2-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY vendor/ ./vendor/
RUN npm run build

FROM node:22.23.2-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vendor/substack-api/dist ./vendor/substack-api/dist

USER node

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["mcp", "serve"]
