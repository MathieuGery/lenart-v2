# Stage 1: Installation des dépendances
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Stage 2: Build
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Stage 3: Production
FROM node:24-alpine AS production
WORKDIR /app

# Install librsvg and fonts for sharp SVG support
RUN apk add --no-cache librsvg fontconfig ttf-dejavu

COPY --from=build /app/.output/ ./
ENV PORT=80
ENV HOST=0.0.0.0
EXPOSE 80
USER node
CMD ["node", "/app/server/index.mjs"]
