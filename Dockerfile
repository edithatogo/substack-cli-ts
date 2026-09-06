# Multi-stage Dockerfile for @edithatogo/substack-publisher
FROM node:22.23.2-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY vendor/ ./vendor/
RUN npm run build

FROM node:22.23.2-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vendor/substack-api/dist ./vendor/substack-api/dist

USER node

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["mcp", "serve"]
