# ─── Build stage ───
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration=production

# ─── Runtime stage ───
FROM nginx:alpine AS runtime

# Configuration Nginx SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/job-board/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
