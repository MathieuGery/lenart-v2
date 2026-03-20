# Stage 1: Installation des dépendances
FROM --platform=$BUILDPLATFORM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Stage 2: Build
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
RUN npm run build

# Stage 3: Production
FROM node:24-alpine AS production
WORKDIR /app
COPY --from=build /app/.output/ ./
ENV PORT=80
ENV HOST=0.0.0.0
EXPOSE 80
USER node
CMD ["node", "/app/server/index.mjs"]
